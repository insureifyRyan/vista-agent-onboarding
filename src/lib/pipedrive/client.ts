import { PIPELINE_NAME, type StageName } from './config';

/**
 * Minimal Pipedrive REST v2 client.
 *
 * The API token is read from the server environment and never leaves it — the
 * onboarding page talks to our own routes, which talk to Pipedrive. The guard
 * below makes an accidental client-side import fail loudly rather than shipping
 * a CRM credential to a browser.
 */
if (typeof window !== 'undefined') {
  throw new Error('pipedrive/client is server-only and must not be imported by client code');
}

export class PipedriveError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'PipedriveError';
  }
}

export class PipedriveNotConfiguredError extends Error {
  constructor() {
    super('PIPEDRIVE_API_TOKEN is not set');
    this.name = 'PipedriveNotConfiguredError';
  }
}

export interface PipedrivePerson {
  id: number;
  name?: string;
  emails?: { value: string; primary?: boolean }[];
}

export interface PipedriveDeal {
  id: number;
  title: string;
  status: 'open' | 'won' | 'lost' | 'deleted';
  stage_id: number;
  pipeline_id: number;
  person_id?: number | { value: number };
}

/** A crude token bucket. Pipedrive meters per company, so one bucket per process. */
class TokenBucket {
  private tokens: number;
  private last = Date.now();

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
  ) {
    this.tokens = capacity;
  }

  async take(): Promise<void> {
    for (;;) {
      const now = Date.now();
      this.tokens = Math.min(this.capacity, this.tokens + ((now - this.last) / 1000) * this.refillPerSecond);
      this.last = now;
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      const waitMs = Math.ceil(((1 - this.tokens) / this.refillPerSecond) * 1000);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}

export interface PipedriveClientOptions {
  token?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class PipedriveClient {
  private readonly token: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly bucket = new TokenBucket(20, 10);
  private pipelineCache: { id: number; stages: Map<string, number> } | null = null;

  constructor(opts: PipedriveClientOptions = {}) {
    const token = opts.token ?? process.env.PIPEDRIVE_API_TOKEN ?? '';
    if (!token) throw new PipedriveNotConfiguredError();
    this.token = token;
    this.baseUrl = opts.baseUrl ?? process.env.PIPEDRIVE_BASE_URL ?? 'https://api.pipedrive.com';
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query: Record<string, string> = {},
  ): Promise<T> {
    await this.bucket.take();
    const url = new URL(path, this.baseUrl);
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);

    let response: Response;
    try {
      response = await this.fetchImpl(url.toString(), {
        method,
        headers: {
          'x-api-token': this.token,
          ...(body ? { 'content-type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (cause) {
      // Network-level failure: always worth another attempt.
      throw new PipedriveError(`Pipedrive request failed: ${String(cause)}`, 0, true);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      const retryable = response.status === 429 || response.status >= 500;
      throw new PipedriveError(
        `Pipedrive ${method} ${path} -> ${response.status} ${text.slice(0, 300)}`,
        response.status,
        retryable,
      );
    }

    const payload = (await response.json()) as { data?: T };
    return payload.data as T;
  }

  // ---------------------------------------------------------------- persons

  async findPersonByEmail(email: string): Promise<PipedrivePerson | null> {
    const data = await this.request<{ items?: { item: PipedrivePerson }[] }>(
      'GET',
      '/api/v2/persons/search',
      undefined,
      { term: email, fields: 'email', exact_match: 'true', limit: '1' },
    );
    return data?.items?.[0]?.item ?? null;
  }

  createPerson(payload: Record<string, unknown>): Promise<PipedrivePerson> {
    return this.request<PipedrivePerson>('POST', '/api/v2/persons', payload);
  }

  updatePerson(id: number, payload: Record<string, unknown>): Promise<PipedrivePerson> {
    return this.request<PipedrivePerson>('PATCH', `/api/v2/persons/${id}`, payload);
  }

  // ------------------------------------------------------------------ deals

  async listOpenDealsForPerson(personId: number, pipelineId: number): Promise<PipedriveDeal[]> {
    const data = await this.request<PipedriveDeal[]>('GET', '/api/v2/deals', undefined, {
      person_id: String(personId),
      pipeline_id: String(pipelineId),
      status: 'open',
      limit: '100',
    });
    return data ?? [];
  }

  createDeal(payload: Record<string, unknown>): Promise<PipedriveDeal> {
    return this.request<PipedriveDeal>('POST', '/api/v2/deals', payload);
  }

  updateDeal(id: number, payload: Record<string, unknown>): Promise<PipedriveDeal> {
    return this.request<PipedriveDeal>('PATCH', `/api/v2/deals/${id}`, payload);
  }

  // -------------------------------------------------------------- pipelines

  /** Resolve "AMS integrations" and its stages once per process. */
  async resolvePipeline(): Promise<{ id: number; stages: Map<string, number> }> {
    if (this.pipelineCache) return this.pipelineCache;

    const envPipeline = process.env.PIPEDRIVE_PIPELINE_ID;
    const pipelines = await this.request<{ id: number; name: string }[]>(
      'GET',
      '/api/v2/pipelines',
      undefined,
      { limit: '100' },
    );
    const pipeline = envPipeline
      ? pipelines?.find((p) => String(p.id) === envPipeline)
      : pipelines?.find((p) => p.name === PIPELINE_NAME);
    if (!pipeline) {
      throw new PipedriveError(
        `Pipeline "${envPipeline ?? PIPELINE_NAME}" not found — run scripts/pipedrive-setup.ts`,
        404,
        false,
      );
    }

    const stageRows = await this.request<{ id: number; name: string; pipeline_id: number }[]>(
      'GET',
      '/api/v2/stages',
      undefined,
      { pipeline_id: String(pipeline.id), limit: '100' },
    );
    const stages = new Map<string, number>();
    for (const stage of stageRows ?? []) stages.set(stage.name, stage.id);

    this.pipelineCache = { id: pipeline.id, stages };
    return this.pipelineCache;
  }

  async stageId(name: StageName): Promise<number> {
    const { stages } = await this.resolvePipeline();
    const id = stages.get(name);
    if (id == null) {
      throw new PipedriveError(`Stage "${name}" missing from the AMS integrations pipeline`, 404, false);
    }
    return id;
  }
}
