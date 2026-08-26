import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  Agent,
  AttributionInput,
  DemandRow,
  DemandSort,
  Job,
  PipedriveLink,
  Store,
  VerificationCode,
} from './types';

const SCHEMA = readFileSync(join(process.cwd(), 'sql', 'sqlite.sql'), 'utf8');

const nowIso = () => new Date().toISOString();

/** Attribution fields, in the order they appear in the agents table. */
const ATTRIBUTION_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'landing_url',
  'referrer',
] as const satisfies readonly (keyof AttributionInput)[];

const AGENT_COLUMNS = [
  'first_name',
  'last_name',
  'email',
  'agency_name',
  'npn',
  'resident_state',
  'book_size_est',
  'ams_name',
  'ams_status',
  'ams_answered_at',
  'email_verified_at',
  ...ATTRIBUTION_KEYS,
] as const;

type SqlValue = string | number | null;

export class SqliteStore implements Store {
  private readonly db: DatabaseSync;

  constructor(filename = ':memory:') {
    this.db = new DatabaseSync(filename);
    this.db.exec('PRAGMA foreign_keys = ON');
    this.db.exec(SCHEMA);
  }

  // ---------------------------------------------------------------- agents

  upsertAgentByEmail(
    input: Pick<Agent, 'first_name' | 'last_name' | 'email'> & Partial<AttributionInput>,
  ): Agent {
    const existing = this.getAgentByEmail(input.email);
    const ts = nowIso();

    if (existing) {
      // Attribution is first-touch. A returning visitor arriving without UTMs
      // must not blank out the creative that originally produced them.
      const patch: Partial<Agent> = {
        first_name: input.first_name,
        last_name: input.last_name,
      };
      for (const key of ATTRIBUTION_KEYS) {
        if (existing[key] == null && input[key] != null) {
          patch[key] = input[key] as never;
        }
      }
      return this.updateAgent(existing.id, patch);
    }

    const id = randomUUID();
    this.db
      .prepare(
        `INSERT INTO agents (id, first_name, last_name, email, ${ATTRIBUTION_KEYS.join(', ')}, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.first_name,
        input.last_name,
        input.email,
        ...ATTRIBUTION_KEYS.map((k) => (input[k] ?? null) as SqlValue),
        ts,
        ts,
      );
    return this.getAgent(id)!;
  }

  getAgent(id: string): Agent | null {
    const row = this.db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
    return (row as Agent | undefined) ?? null;
  }

  getAgentByEmail(email: string): Agent | null {
    const row = this.db
      .prepare('SELECT * FROM agents WHERE lower(email) = lower(?)')
      .get(email);
    return (row as Agent | undefined) ?? null;
  }

  updateAgent(id: string, patch: Partial<Agent>): Agent {
    const keys = AGENT_COLUMNS.filter((k) => k in patch);
    if (keys.length > 0) {
      this.db
        .prepare(
          `UPDATE agents SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ?`,
        )
        .run(...keys.map((k) => (patch[k] ?? null) as SqlValue), nowIso(), id);
    }
    const agent = this.getAgent(id);
    if (!agent) throw new Error(`No agent ${id}`);
    return agent;
  }

  // ---------------------------------------------------- verification codes

  createVerificationCode(agentId: string, codeHash: string, expiresAt: string): VerificationCode {
    const id = randomUUID();
    this.db
      .prepare(
        `INSERT INTO verification_codes (id, agent_id, code_hash, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(id, agentId, codeHash, expiresAt, nowIso());
    return this.db
      .prepare('SELECT * FROM verification_codes WHERE id = ?')
      .get(id) as unknown as VerificationCode;
  }

  latestVerificationCode(agentId: string): VerificationCode | null {
    const row = this.db
      .prepare(
        'SELECT * FROM verification_codes WHERE agent_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1',
      )
      .get(agentId);
    return (row as VerificationCode | undefined) ?? null;
  }

  recordCodeAttempt(id: string): void {
    this.db.prepare('UPDATE verification_codes SET attempts = attempts + 1 WHERE id = ?').run(id);
  }

  consumeVerificationCode(id: string): void {
    this.db.prepare('UPDATE verification_codes SET consumed_at = ? WHERE id = ?').run(nowIso(), id);
  }

  // ------------------------------------------------------------------ jobs

  enqueueJob(kind: string, payload: unknown, opts: { runAt?: string; maxAttempts?: number } = {}): Job {
    const id = randomUUID();
    const ts = nowIso();
    this.db
      .prepare(
        `INSERT INTO jobs (id, kind, payload, run_at, max_attempts, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, kind, JSON.stringify(payload), opts.runAt ?? ts, opts.maxAttempts ?? 8, ts, ts);
    return this.getJob(id)!;
  }

  claimDueJobs(now: string, limit: number): Job[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM jobs WHERE status = 'pending' AND run_at <= ? ORDER BY run_at LIMIT ?`,
      )
      .all(now, limit) as unknown as Job[];
    const bump = this.db.prepare('UPDATE jobs SET attempts = attempts + 1, updated_at = ? WHERE id = ?');
    for (const job of rows) bump.run(nowIso(), job.id);
    return rows.map((job) => ({ ...job, attempts: job.attempts + 1 }));
  }

  completeJob(id: string): void {
    this.db
      .prepare(`UPDATE jobs SET status = 'done', last_error = NULL, updated_at = ? WHERE id = ?`)
      .run(nowIso(), id);
  }

  /** `retryAt = null` means the job has exhausted its attempts and is dead. */
  failJob(id: string, error: string, retryAt: string | null): void {
    if (retryAt) {
      this.db
        .prepare(`UPDATE jobs SET status = 'pending', run_at = ?, last_error = ?, updated_at = ? WHERE id = ?`)
        .run(retryAt, error, nowIso(), id);
    } else {
      this.db
        .prepare(`UPDATE jobs SET status = 'failed', last_error = ?, updated_at = ? WHERE id = ?`)
        .run(error, nowIso(), id);
    }
  }

  getJob(id: string): Job | null {
    const row = this.db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
    return (row as Job | undefined) ?? null;
  }

  listJobs(kind?: string): Job[] {
    return (
      kind
        ? this.db.prepare('SELECT * FROM jobs WHERE kind = ? ORDER BY created_at').all(kind)
        : this.db.prepare('SELECT * FROM jobs ORDER BY created_at').all()
    ) as unknown as Job[];
  }

  // ------------------------------------------------------- pipedrive links

  getPipedriveLink(agentId: string, amsName: string): PipedriveLink | null {
    const row = this.db
      .prepare('SELECT * FROM pipedrive_links WHERE agent_id = ? AND ams_name = ?')
      .get(agentId, amsName);
    return (row as PipedriveLink | undefined) ?? null;
  }

  listPipedriveLinks(agentId: string): PipedriveLink[] {
    return this.db
      .prepare('SELECT * FROM pipedrive_links WHERE agent_id = ? ORDER BY created_at')
      .all(agentId) as unknown as PipedriveLink[];
  }

  upsertPipedriveLink(link: Omit<PipedriveLink, 'created_at' | 'updated_at'>): PipedriveLink {
    const ts = nowIso();
    this.db
      .prepare(
        `INSERT INTO pipedrive_links (agent_id, ams_name, person_id, deal_id, state, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (agent_id, ams_name) DO UPDATE SET
           person_id  = COALESCE(excluded.person_id, pipedrive_links.person_id),
           deal_id    = COALESCE(excluded.deal_id,   pipedrive_links.deal_id),
           state      = excluded.state,
           updated_at = excluded.updated_at`,
      )
      .run(link.agent_id, link.ams_name, link.person_id, link.deal_id, link.state, ts, ts);
    return this.getPipedriveLink(link.agent_id, link.ams_name)!;
  }

  // ---------------------------------------------------------------- report

  /**
   * The one view the waitlist exists to produce.
   *
   * Default sort is by vehicles represented, not headcount: forty agents on one
   * platform with 200 vehicles each is a better next integration than ninety
   * agents with twenty. `oldest_signup` is the churn warning column.
   */
  amsDemandReport(sort: DemandSort = 'vehicles'): DemandRow[] {
    const order =
      sort === 'agents'
        ? 'agents_waiting DESC, est_vehicles_represented DESC'
        : 'est_vehicles_represented DESC, agents_waiting DESC';
    return this.db
      .prepare(
        `SELECT ams_name,
                COUNT(*)                        AS agents_waiting,
                COALESCE(SUM(book_size_est), 0) AS est_vehicles_represented,
                MIN(created_at)                 AS oldest_signup
           FROM agents
          WHERE ams_status = 'waitlist' AND ams_name IS NOT NULL
       GROUP BY ams_name
       ORDER BY ${order}, oldest_signup ASC`,
      )
      .all() as unknown as DemandRow[];
  }

  close(): void {
    this.db.close();
  }
}
