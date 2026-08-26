import { amsStatusFor, type AmsName, type AmsStatus } from '@/lib/ams/catalog';
import type { Agent, Store } from '@/lib/db/types';
import { enqueueAmsSync } from '@/lib/jobs/queue';

export interface AmsAnswerInput {
  ams_name: AmsName;
  book_size_est?: number | null;
  agency_name?: string | null;
}

export interface AmsAnswerResult {
  agent: Agent;
  status: AmsStatus;
  /** False for the no-AMS branch, and when enqueueing failed. */
  enqueued: boolean;
}

/**
 * Persist the AMS answer, then queue the Pipedrive sync.
 *
 * The order is the requirement: our own database first, Pipedrive after. A
 * Pipedrive outage — or a queue that refuses the job — costs a CRM row, never a
 * sign-up, so the enqueue is wrapped and its failure is logged rather than
 * raised.
 */
export function recordAmsAnswer(store: Store, agentId: string, input: AmsAnswerInput): AmsAnswerResult {
  const status = amsStatusFor(input.ams_name);

  const agent = store.updateAgent(agentId, {
    ams_name: input.ams_name,
    ams_status: status,
    ams_answered_at: new Date().toISOString(),
    ...(input.book_size_est !== undefined ? { book_size_est: input.book_size_est } : {}),
    ...(input.agency_name !== undefined ? { agency_name: input.agency_name } : {}),
  });

  // `none` never reaches Pipedrive at all. Enrolling spreadsheet agencies in the
  // waitlist would corrupt the integration demand ranking, which is the only
  // thing that pipeline exists to produce.
  if (status === 'none') {
    return { agent, status, enqueued: false };
  }

  try {
    enqueueAmsSync(store, agent.id);
    return { agent, status, enqueued: true };
  } catch (error) {
    console.error('[onboarding] could not enqueue Pipedrive sync', error);
    return { agent, status, enqueued: false };
  }
}
