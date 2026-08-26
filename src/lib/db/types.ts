import type { AmsName, AmsStatus } from '@/lib/ams/catalog';

export interface AttributionInput {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  /** Identifies which of the twenty creatives converted. */
  utm_content: string | null;
  landing_url: string | null;
  referrer: string | null;
}

export interface Agent extends AttributionInput {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  agency_name: string | null;
  npn: string | null;
  resident_state: string | null;
  book_size_est: number | null;
  ams_name: AmsName | null;
  ams_status: AmsStatus | null;
  ams_answered_at: string | null;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VerificationCode {
  id: string;
  agent_id: string;
  code_hash: string;
  expires_at: string;
  consumed_at: string | null;
  attempts: number;
  created_at: string;
}

export type JobStatus = 'pending' | 'done' | 'failed';

export interface Job {
  id: string;
  kind: string;
  payload: string;
  status: JobStatus;
  run_at: string;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

/** One row per (agent, AMS) waitlist enrolment. The uniqueness key for idempotency. */
export interface PipedriveLink {
  agent_id: string;
  ams_name: string;
  person_id: number | null;
  deal_id: number | null;
  /** `open` while the agent still counts as demand for this AMS. */
  state: 'open' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface DemandRow {
  ams_name: string;
  agents_waiting: number;
  est_vehicles_represented: number;
  oldest_signup: string;
}

export type DemandSort = 'vehicles' | 'agents';

export interface Store {
  /** Create the agent, or update the existing one for this email. Attribution is
   *  written on first touch and never overwritten by a later, UTM-less visit. */
  upsertAgentByEmail(
    input: Pick<Agent, 'first_name' | 'last_name' | 'email'> & Partial<AttributionInput>,
  ): Agent;
  getAgent(id: string): Agent | null;
  getAgentByEmail(email: string): Agent | null;
  updateAgent(id: string, patch: Partial<Agent>): Agent;

  createVerificationCode(agentId: string, codeHash: string, expiresAt: string): VerificationCode;
  latestVerificationCode(agentId: string): VerificationCode | null;
  recordCodeAttempt(id: string): void;
  consumeVerificationCode(id: string): void;

  enqueueJob(kind: string, payload: unknown, opts?: { runAt?: string; maxAttempts?: number }): Job;
  claimDueJobs(now: string, limit: number): Job[];
  completeJob(id: string): void;
  failJob(id: string, error: string, retryAt: string | null): void;
  getJob(id: string): Job | null;
  listJobs(kind?: string): Job[];

  getPipedriveLink(agentId: string, amsName: string): PipedriveLink | null;
  listPipedriveLinks(agentId: string): PipedriveLink[];
  upsertPipedriveLink(link: Omit<PipedriveLink, 'created_at' | 'updated_at'>): PipedriveLink;

  amsDemandReport(sort?: DemandSort): DemandRow[];

  close(): void;
}
