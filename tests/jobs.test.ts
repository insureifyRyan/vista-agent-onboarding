import { beforeEach, describe, expect, it } from 'vitest';
import { SqliteStore } from '@/lib/db/sqlite';
import type { Store } from '@/lib/db/types';
import { PipedriveClient } from '@/lib/pipedrive/client';
import { backoffMs, drainJobs, enqueueAmsSync, JOB_PIPEDRIVE_AMS_SYNC } from '@/lib/jobs/queue';
import { recordAmsAnswer } from '@/lib/onboarding/amsAnswer';
import { FakePipedrive } from './helpers/fakePipedrive';

let store: Store;
let pipedrive: FakePipedrive;

const client = () =>
  new PipedriveClient({ token: 't', baseUrl: 'https://pipedrive.test', fetchImpl: pipedrive.fetch });

function waitlistAgent(): string {
  const agent = store.upsertAgentByEmail({
    first_name: 'Jordan',
    last_name: 'Reyes',
    email: 'jordan@agency.com',
  });
  store.updateAgent(agent.id, {
    ams_name: 'Jenesis',
    ams_status: 'waitlist',
    agency_name: 'Reyes Insurance',
  });
  return agent.id;
}

beforeEach(() => {
  store = new SqliteStore(':memory:');
  pipedrive = new FakePipedrive();
});

describe('a Pipedrive outage never costs a sign-up', () => {
  it('keeps the AMS answer in our own database when the sync fails', async () => {
    const agentId = waitlistAgent();
    enqueueAmsSync(store, agentId);

    pipedrive.failWith = { status: 503 };
    const result = await drainJobs(store, { client: client() });

    expect(result.retried).toBe(1);
    expect(result.succeeded).toBe(0);
    // The agent's own record is untouched by the failure: onboarding completed.
    const agent = store.getAgent(agentId)!;
    expect(agent.ams_name).toBe('Jenesis');
    expect(agent.ams_status).toBe('waitlist');
    // And the demand report still counts them.
    expect(store.amsDemandReport()[0].ams_name).toBe('Jenesis');
  });

  it('retries with backoff and eventually succeeds', async () => {
    const agentId = waitlistAgent();
    enqueueAmsSync(store, agentId);

    pipedrive.failFirst = 1;
    const firstPass = await drainJobs(store, { client: client() });
    expect(firstPass.retried).toBe(1);
    expect(pipedrive.deals).toHaveLength(0);

    // The retry is scheduled in the future, so a drain now finds nothing due.
    expect(await drainJobs(store, { client: client() })).toMatchObject({ processed: 0 });

    const later = new Date(Date.now() + backoffMs(1) + 1000);
    const secondPass = await drainJobs(store, { client: client(), now: () => later });
    expect(secondPass.succeeded).toBe(1);
    expect(pipedrive.openDeals).toHaveLength(1);
  });

  it('gives up on a non-retryable error instead of looping forever', async () => {
    const agentId = waitlistAgent();
    enqueueAmsSync(store, agentId);

    pipedrive.failWith = { status: 400, body: 'bad request' };
    const result = await drainJobs(store, { client: client() });

    expect(result.failed).toBe(1);
    expect(store.listJobs(JOB_PIPEDRIVE_AMS_SYNC)[0].status).toBe('failed');
  });

  it('stops retrying once attempts are exhausted', async () => {
    const agentId = waitlistAgent();
    store.enqueueJob(JOB_PIPEDRIVE_AMS_SYNC, { agentId }, { maxAttempts: 2 });
    pipedrive.failWith = { status: 503 };

    let now = new Date();
    for (let pass = 0; pass < 3; pass += 1) {
      await drainJobs(store, { client: client(), now: () => now });
      now = new Date(now.getTime() + 60 * 60_000);
    }

    expect(store.listJobs(JOB_PIPEDRIVE_AMS_SYNC)[0].status).toBe('failed');
  });

  it('backs off exponentially and caps at an hour', () => {
    expect(backoffMs(1)).toBe(30_000);
    expect(backoffMs(2)).toBe(60_000);
    expect(backoffMs(3)).toBe(120_000);
    expect(backoffMs(20)).toBe(60 * 60_000);
  });
});

describe('recording the AMS answer', () => {
  it('writes to our own database before anything is queued', () => {
    const agent = store.upsertAgentByEmail({ first_name: 'A', last_name: 'B', email: 'a@b.com' });
    const result = recordAmsAnswer(store, agent.id, { ams_name: 'Jenesis', book_size_est: 250 });

    expect(result.agent.ams_name).toBe('Jenesis');
    expect(result.agent.ams_status).toBe('waitlist');
    expect(result.agent.book_size_est).toBe(250);
    expect(result.enqueued).toBe(true);
    expect(store.listJobs(JOB_PIPEDRIVE_AMS_SYNC)).toHaveLength(1);
  });

  it('queues nothing for Other / spreadsheet', () => {
    const agent = store.upsertAgentByEmail({ first_name: 'A', last_name: 'B', email: 'a@b.com' });
    const result = recordAmsAnswer(store, agent.id, { ams_name: 'Other / spreadsheet' });

    expect(result.status).toBe('none');
    expect(result.enqueued).toBe(false);
    expect(store.listJobs(JOB_PIPEDRIVE_AMS_SYNC)).toHaveLength(0);
  });

  it('completes the answer even when the queue itself throws', () => {
    const agent = store.upsertAgentByEmail({ first_name: 'A', last_name: 'B', email: 'a@b.com' });
    const broken: Store = {
      ...store,
      updateAgent: store.updateAgent.bind(store),
      enqueueJob() {
        throw new Error('queue is down');
      },
    };

    const result = recordAmsAnswer(broken, agent.id, { ams_name: 'Jenesis' });

    expect(result.enqueued).toBe(false);
    expect(result.agent.ams_name).toBe('Jenesis');
    expect(store.getAgent(agent.id)!.ams_status).toBe('waitlist');
  });
});
