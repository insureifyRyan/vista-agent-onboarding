/**
 * An in-memory stand-in for the Pipedrive REST v2 endpoints this app touches.
 *
 * It is wired in as a `fetch` implementation so the tests exercise the real
 * PipedriveClient — its URL building, envelope unwrapping and error
 * classification — rather than a mock of it.
 */
export interface FakePerson {
  id: number;
  name: string;
  emails: { value: string; primary?: boolean }[];
  custom: Record<string, unknown>;
}

export interface FakeDeal {
  id: number;
  title: string;
  status: 'open' | 'won' | 'lost';
  stage_id: number;
  pipeline_id: number;
  person_id: number;
  lost_reason?: string;
}

export class FakePipedrive {
  readonly persons: FakePerson[] = [];
  readonly deals: FakeDeal[] = [];
  readonly calls: string[] = [];

  /** Set to make every request fail, standing in for an outage. */
  failWith: { status: number; body?: string } | null = null;
  /** Fail only the first N requests, to exercise retry. */
  failFirst = 0;

  private nextPersonId = 1;
  private nextDealId = 100;

  readonly pipelineId = 7;
  readonly stages = new Map<string, number>([
    ['Waitlisted', 71],
    ['Build scheduled', 72],
    ['In development', 73],
    ['Ready to activate', 74],
    ['Activated', 75],
  ]);

  get openDeals(): FakeDeal[] {
    return this.deals.filter((deal) => deal.status === 'open');
  }

  dealsFor(personId: number): FakeDeal[] {
    return this.deals.filter((deal) => deal.person_id === personId);
  }

  readonly fetch: typeof fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : String(input));
    const method = init?.method ?? 'GET';
    const path = url.pathname;
    this.calls.push(`${method} ${path}`);

    if (this.failFirst > 0) {
      this.failFirst -= 1;
      return this.json({ error: 'boom' }, 500);
    }
    if (this.failWith) {
      return this.json({ error: this.failWith.body ?? 'forced failure' }, this.failWith.status);
    }

    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};

    if (path === '/api/v2/pipelines') {
      return this.json({ data: [{ id: this.pipelineId, name: 'AMS integrations' }] });
    }

    if (path === '/api/v2/stages') {
      return this.json({
        data: [...this.stages].map(([name, id]) => ({ id, name, pipeline_id: this.pipelineId })),
      });
    }

    if (path === '/api/v2/persons/search') {
      const term = (url.searchParams.get('term') ?? '').toLowerCase();
      const found = this.persons.find((person) =>
        person.emails.some((email) => email.value.toLowerCase() === term),
      );
      return this.json({ data: { items: found ? [{ item: found }] : [] } });
    }

    if (path === '/api/v2/persons' && method === 'POST') {
      const { name, emails, ...custom } = body as {
        name: string;
        emails: { value: string }[];
      } & Record<string, unknown>;
      const person: FakePerson = { id: this.nextPersonId++, name, emails, custom };
      this.persons.push(person);
      return this.json({ data: person });
    }

    const personMatch = /^\/api\/v2\/persons\/(\d+)$/.exec(path);
    if (personMatch && method === 'PATCH') {
      const person = this.persons.find((candidate) => candidate.id === Number(personMatch[1]));
      if (!person) return this.json({ error: 'not found' }, 404);
      Object.assign(person.custom, body);
      return this.json({ data: person });
    }

    if (path === '/api/v2/deals' && method === 'GET') {
      const personId = Number(url.searchParams.get('person_id'));
      const status = url.searchParams.get('status');
      return this.json({
        data: this.deals.filter(
          (deal) => deal.person_id === personId && (!status || deal.status === status),
        ),
      });
    }

    if (path === '/api/v2/deals' && method === 'POST') {
      const deal: FakeDeal = {
        id: this.nextDealId++,
        title: String(body.title),
        status: 'open',
        stage_id: Number(body.stage_id),
        pipeline_id: Number(body.pipeline_id),
        person_id: Number(body.person_id),
      };
      this.deals.push(deal);
      return this.json({ data: deal });
    }

    const dealMatch = /^\/api\/v2\/deals\/(\d+)$/.exec(path);
    if (dealMatch && method === 'PATCH') {
      const deal = this.deals.find((candidate) => candidate.id === Number(dealMatch[1]));
      if (!deal) return this.json({ error: 'not found' }, 404);
      Object.assign(deal, body);
      return this.json({ data: deal });
    }

    return this.json({ error: `unhandled ${method} ${path}` }, 404);
  };

  private json(payload: unknown, status = 200): Response {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }
}
