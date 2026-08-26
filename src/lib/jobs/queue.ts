import type { Job, Store } from '@/lib/db/types';
import { PipedriveClient, PipedriveError, PipedriveNotConfiguredError } from '@/lib/pipedrive/client';
import { syncAmsAnswer } from '@/lib/pipedrive/sync';

export const JOB_PIPEDRIVE_AMS_SYNC = 'pipedrive:ams-sync';

export interface AmsSyncPayload {
  agentId: string;
}

/**
 * Enqueue the Pipedrive sync.
 *
 * Deliberately returns void and swallows nothing: the caller wraps it so that a
 * queue failure cannot fail a sign-up. Onboarding writes the AMS answer to our
 * own database first; Pipedrive is downstream of that, always.
 */
export function enqueueAmsSync(store: Store, agentId: string): Job {
  return store.enqueueJob(JOB_PIPEDRIVE_AMS_SYNC, { agentId } satisfies AmsSyncPayload);
}

/** Exponential backoff with a cap: 30s, 1m, 2m, 4m … 1h. */
export function backoffMs(attempt: number): number {
  return Math.min(30_000 * 2 ** Math.max(0, attempt - 1), 60 * 60_000);
}

export interface WorkerDeps {
  client?: PipedriveClient;
  now?: () => Date;
}

export interface DrainResult {
  processed: number;
  succeeded: number;
  retried: number;
  failed: number;
}

/**
 * Run every job that is due.
 *
 * Called by `POST /api/jobs/run` (Vercel Cron or any scheduler) and by
 * `npm run jobs:work` in development.
 */
export async function drainJobs(
  store: Store,
  { client, now = () => new Date() }: WorkerDeps = {},
  limit = 25,
): Promise<DrainResult> {
  const result: DrainResult = { processed: 0, succeeded: 0, retried: 0, failed: 0 };
  const due = store.claimDueJobs(now().toISOString(), limit);

  for (const job of due) {
    result.processed += 1;
    try {
      await runJob(store, job, client);
      store.completeJob(job.id);
      result.succeeded += 1;
    } catch (error) {
      const permanent =
        error instanceof PipedriveNotConfiguredError ||
        (error instanceof PipedriveError && !error.retryable) ||
        job.attempts >= job.max_attempts;

      if (permanent) {
        store.failJob(job.id, String(error), null);
        result.failed += 1;
      } else {
        const retryAt = new Date(now().getTime() + backoffMs(job.attempts)).toISOString();
        store.failJob(job.id, String(error), retryAt);
        result.retried += 1;
      }
    }
  }

  return result;
}

async function runJob(store: Store, job: Job, client?: PipedriveClient): Promise<void> {
  switch (job.kind) {
    case JOB_PIPEDRIVE_AMS_SYNC: {
      const { agentId } = JSON.parse(job.payload) as AmsSyncPayload;
      await syncAmsAnswer(store, agentId, client ?? new PipedriveClient());
      return;
    }
    default:
      throw new Error(`Unknown job kind: ${job.kind}`);
  }
}
