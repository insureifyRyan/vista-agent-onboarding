import { beforeEach, describe, expect, it } from 'vitest';
import { SqliteStore } from '@/lib/db/sqlite';
import type { Store } from '@/lib/db/types';
import { amsStatusFor, type AmsName } from '@/lib/ams/catalog';
import { PipedriveClient } from '@/lib/pipedrive/client';
import { syncAmsAnswer } from '@/lib/pipedrive/sync';
import { FakePipedrive } from './helpers/fakePipedrive';

let store: Store;
let pipedrive: FakePipedrive;

function client(): PipedriveClient {
  return new PipedriveClient({ token: 'test-token', baseUrl: 'https://pipedrive.test', fetchImpl: pipedrive.fetch });
}

function agentWith(ams: AmsName, email = 'jordan@agency.com'): string {
  const agent = store.upsertAgentByEmail({
    first_name: 'Jordan',
    last_name: 'Reyes',
    email,
    utm_content: 'B3',
  });
  store.updateAgent(agent.id, {
    ams_name: ams,
    ams_status: amsStatusFor(ams),
    agency_name: 'Reyes Insurance',
    book_size_est: 400,
  });
  return agent.id;
}

beforeEach(() => {
  store = new SqliteStore(':memory:');
  pipedrive = new FakePipedrive();
});

describe('waitlist branch', () => {
  it('creates exactly one deal, and re-running onboarding creates none', async () => {
    const agentId = agentWith('Jenesis');

    const first = await syncAmsAnswer(store, agentId, client());
    expect(first.action).toBe('deal-created');
    expect(pipedrive.openDeals).toHaveLength(1);

    const second = await syncAmsAnswer(store, agentId, client());
    expect(second.action).toBe('deal-exists');
    expect(second.dealId).toBe(first.dealId);
    expect(pipedrive.deals).toHaveLength(1);
  });

  it('titles the deal for the AMS and the agency', async () => {
    const agentId = agentWith('Jenesis');
    await syncAmsAnswer(store, agentId, client());
    expect(pipedrive.deals[0].title).toBe('AMS waitlist — Jenesis — Reyes Insurance');
    expect(pipedrive.deals[0].stage_id).toBe(pipedrive.stages.get('Waitlisted'));
  });

  it('does not duplicate a deal that exists in Pipedrive but not in our link table', async () => {
    const agentId = agentWith('Jenesis');
    await syncAmsAnswer(store, agentId, client());

    // Simulate a link row lost to a failed write: the Pipedrive-side search is
    // what stops the second run creating a twin.
    store.upsertPipedriveLink({
      agent_id: agentId,
      ams_name: 'Jenesis',
      person_id: null,
      deal_id: null,
      state: 'open',
    });

    const again = await syncAmsAnswer(store, agentId, client());
    expect(again.action).toBe('deal-exists');
    expect(pipedrive.deals).toHaveLength(1);
  });
});

describe('branches that must never create a deal', () => {
  it('creates zero deals for Other / spreadsheet', async () => {
    const agentId = agentWith('Other / spreadsheet');
    const result = await syncAmsAnswer(store, agentId, client());

    expect(result.action).toBe('person-only');
    expect(result.dealId).toBeNull();
    expect(pipedrive.deals).toHaveLength(0);
  });

  it('creates zero deals for a live integration', async () => {
    const agentId = agentWith('EZLynx');
    const result = await syncAmsAnswer(store, agentId, client());

    expect(result.action).toBe('person-only');
    expect(pipedrive.deals).toHaveLength(0);
  });

  it('still records the AMS answer on the Person for every branch', async () => {
    process.env.PIPEDRIVE_FIELD_AMS_NAME = 'field_ams';
    process.env.PIPEDRIVE_FIELD_AMS_STATUS = 'field_status';

    const agentId = agentWith('Other / spreadsheet');
    await syncAmsAnswer(store, agentId, client());

    expect(pipedrive.persons[0].custom.field_ams).toBe('Other / spreadsheet');
    expect(pipedrive.persons[0].custom.field_status).toBe('none');

    delete process.env.PIPEDRIVE_FIELD_AMS_NAME;
    delete process.env.PIPEDRIVE_FIELD_AMS_STATUS;
  });
});

describe('changing AMS', () => {
  it('closes the stale waitlist deal so the agent stops counting as old demand', async () => {
    const agentId = agentWith('Jenesis');
    await syncAmsAnswer(store, agentId, client());
    const staleDealId = pipedrive.deals[0].id;

    store.updateAgent(agentId, { ams_name: 'EZLynx', ams_status: 'live' });
    const result = await syncAmsAnswer(store, agentId, client());

    expect(result.closedDealIds).toEqual([staleDealId]);
    expect(pipedrive.deals.find((deal) => deal.id === staleDealId)?.status).toBe('lost');
    expect(pipedrive.deals.find((deal) => deal.id === staleDealId)?.lost_reason).toContain('EZLynx');
    expect(pipedrive.openDeals).toHaveLength(0);
    expect(store.getPipedriveLink(agentId, 'Jenesis')?.state).toBe('closed');
  });

  it('opens a deal for the new platform when switching between two waitlisted ones', async () => {
    const agentId = agentWith('Jenesis');
    await syncAmsAnswer(store, agentId, client());

    store.updateAgent(agentId, { ams_name: 'NowCerts', ams_status: 'waitlist' });
    await syncAmsAnswer(store, agentId, client());

    expect(pipedrive.openDeals).toHaveLength(1);
    expect(pipedrive.openDeals[0].title).toContain('NowCerts');
  });
});
