/**
 * Development job worker: drains the queue every few seconds.
 * In production, hit POST /api/jobs/run from a scheduler instead.
 *
 *   npm run jobs:work
 */
import { getStore } from '../src/lib/db/index.ts';
import { drainJobs } from '../src/lib/jobs/queue.ts';

const INTERVAL_MS = Number(process.env.JOB_POLL_MS ?? 5000);

async function tick(): Promise<void> {
  try {
    const result = await drainJobs(getStore());
    if (result.processed > 0) console.log('[jobs]', result);
  } catch (error) {
    console.error('[jobs] drain failed', error);
  }
}

console.log(`[jobs] worker started, polling every ${INTERVAL_MS}ms`);
await tick();
setInterval(() => void tick(), INTERVAL_MS);
