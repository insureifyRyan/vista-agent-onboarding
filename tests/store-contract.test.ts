import { beforeEach, describe, expect, it } from 'vitest';
import { SqliteStore } from '@/lib/db/sqlite';
import type { Store } from '@/lib/db/types';

/**
 * The contract every Store adapter must satisfy.
 *
 * Only the SQLite adapter ships today. When a Postgres one is added (see
 * sql/postgres.sql), point this suite at it too — it is what proves the two
 * behave identically, particularly around the (agent, AMS) uniqueness the
 * Pipedrive idempotency rests on.
 */
function describeStore(name: string, create: () => Store): void {
  describe(name, () => {
    let store: Store;
    beforeEach(() => {
      store = create();
    });

    describe('agents', () => {
      it('creates once per email and updates thereafter', () => {
        const first = store.upsertAgentByEmail({
          first_name: 'Jordan',
          last_name: 'Reyes',
          email: 'jordan@agency.com',
        });
        const second = store.upsertAgentByEmail({
          first_name: 'Jordy',
          last_name: 'Reyes',
          email: 'jordan@agency.com',
        });

        expect(second.id).toBe(first.id);
        expect(second.first_name).toBe('Jordy');
      });

      it('matches email case-insensitively', () => {
        const created = store.upsertAgentByEmail({
          first_name: 'A',
          last_name: 'B',
          email: 'Jordan@Agency.com',
        });
        expect(store.getAgentByEmail('jordan@agency.com')?.id).toBe(created.id);
      });

      it('returns null for an unknown agent', () => {
        expect(store.getAgent('nope')).toBeNull();
        expect(store.getAgentByEmail('nobody@example.com')).toBeNull();
      });

      it('ignores unknown keys in a patch', () => {
        const agent = store.upsertAgentByEmail({ first_name: 'A', last_name: 'B', email: 'a@b.com' });
        const updated = store.updateAgent(agent.id, { npn: '1234567' });
        expect(updated.npn).toBe('1234567');
      });
    });

    describe('jobs', () => {
      it('claims only jobs that are due, and counts the attempt', () => {
        const soon = new Date(Date.now() + 60_000).toISOString();
        store.enqueueJob('now', {});
        store.enqueueJob('later', {}, { runAt: soon });

        const claimed = store.claimDueJobs(new Date().toISOString(), 10);

        expect(claimed).toHaveLength(1);
        expect(claimed[0].kind).toBe('now');
        expect(claimed[0].attempts).toBe(1);
      });

      it('reschedules a retry and marks a dead job failed', () => {
        const retryable = store.enqueueJob('a', {});
        const dead = store.enqueueJob('b', {});
        const later = new Date(Date.now() + 60_000).toISOString();

        store.failJob(retryable.id, 'transient', later);
        store.failJob(dead.id, 'permanent', null);

        expect(store.getJob(retryable.id)).toMatchObject({ status: 'pending', run_at: later });
        expect(store.getJob(dead.id)).toMatchObject({ status: 'failed', last_error: 'permanent' });
      });

      it('clears the error when a job finally succeeds', () => {
        const job = store.enqueueJob('a', {});
        store.failJob(job.id, 'transient', new Date().toISOString());
        store.completeJob(job.id);

        expect(store.getJob(job.id)).toMatchObject({ status: 'done', last_error: null });
      });
    });

    describe('pipedrive links', () => {
      it('holds one row per (agent, AMS)', () => {
        const agent = store.upsertAgentByEmail({ first_name: 'A', last_name: 'B', email: 'a@b.com' });

        store.upsertPipedriveLink({
          agent_id: agent.id,
          ams_name: 'Jenesis',
          person_id: 1,
          deal_id: 100,
          state: 'open',
        });
        store.upsertPipedriveLink({
          agent_id: agent.id,
          ams_name: 'Jenesis',
          person_id: 1,
          deal_id: null,
          state: 'closed',
        });

        const links = store.listPipedriveLinks(agent.id);
        expect(links).toHaveLength(1);
        // A null deal_id in the patch must not wipe the id we already hold.
        expect(links[0]).toMatchObject({ deal_id: 100, state: 'closed' });
      });

      it('keeps separate rows for separate platforms', () => {
        const agent = store.upsertAgentByEmail({ first_name: 'A', last_name: 'B', email: 'a@b.com' });
        for (const ams of ['Jenesis', 'NowCerts']) {
          store.upsertPipedriveLink({
            agent_id: agent.id,
            ams_name: ams,
            person_id: 1,
            deal_id: 1,
            state: 'open',
          });
        }
        expect(store.listPipedriveLinks(agent.id)).toHaveLength(2);
      });
    });
  });
}

describeStore('SqliteStore', () => new SqliteStore(':memory:'));
