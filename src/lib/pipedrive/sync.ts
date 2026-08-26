import type { Store } from '@/lib/db/types';
import { amsStatusFor, isAmsName } from '@/lib/ams/catalog';
import { PipedriveClient, PipedriveError } from './client';
import { dealTitle, personFieldKey, type PersonFieldName } from './config';

export interface SyncResult {
  /** What the sync decided to do, for logs and tests. */
  action: 'person-only' | 'deal-created' | 'deal-exists' | 'skipped';
  personId: number | null;
  dealId: number | null;
  /** Deals closed because the agent changed their AMS answer. */
  closedDealIds: number[];
}

function personCustomFields(agent: {
  ams_name: string | null;
  ams_status: string | null;
  npn: string | null;
  resident_state: string | null;
  book_size_est: number | null;
  utm_content: string | null;
}): Record<string, unknown> {
  const values: Record<PersonFieldName, unknown> = {
    ams_name: agent.ams_name,
    ams_status: agent.ams_status,
    npn: agent.npn,
    resident_state: agent.resident_state,
    book_size_est: agent.book_size_est,
    utm_content: agent.utm_content,
  };

  const payload: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(values) as [PersonFieldName, unknown][]) {
    if (value == null) continue;
    const key = personFieldKey(name);
    if (key) payload[key] = value;
  }
  return payload;
}

/**
 * Push one agent's AMS answer into Pipedrive.
 *
 * Runs from the job queue, never from the request path — see lib/jobs. It is
 * written to be safe to run any number of times for the same agent.
 */
export async function syncAmsAnswer(
  store: Store,
  agentId: string,
  client: PipedriveClient = new PipedriveClient(),
): Promise<SyncResult> {
  const agent = store.getAgent(agentId);
  if (!agent || !agent.ams_name || !isAmsName(agent.ams_name)) {
    return { action: 'skipped', personId: null, dealId: null, closedDealIds: [] };
  }

  const status = amsStatusFor(agent.ams_name);

  // 1. Upsert the Person. Every branch does this — it is the AMS answer itself,
  //    and it is what the demand report reconciles against.
  const existingPerson = await client.findPersonByEmail(agent.email);
  const custom = personCustomFields(agent);
  const person = existingPerson
    ? await client.updatePerson(existingPerson.id, custom)
    : await client.createPerson({
        name: `${agent.first_name} ${agent.last_name}`.trim(),
        emails: [{ value: agent.email, primary: true, label: 'work' }],
        ...custom,
      });

  // 2. Retire waitlist deals for any AMS this agent no longer runs, so a switch
  //    from HawkSoft to EZLynx stops counting as HawkSoft demand.
  const closedDealIds = await closeStaleWaitlistDeals(store, client, agentId, agent.ams_name, person.id);

  // 3. Only the waitlist branch produces a deal.
  //
  //    `none` (Other / spreadsheet) must not: enrolling spreadsheet agencies
  //    would corrupt the integration demand ranking, which is the only thing
  //    this pipeline exists to produce.
  //
  //    `live` must not either: there is nothing to wait for.
  if (status !== 'waitlist') {
    store.upsertPipedriveLink({
      agent_id: agentId,
      ams_name: agent.ams_name,
      person_id: person.id,
      deal_id: null,
      state: 'closed',
    });
    return { action: 'person-only', personId: person.id, dealId: null, closedDealIds };
  }

  // 4. Idempotent deal creation, keyed on person_id + ams_name.
  //    Our own link row is the fast path; the Pipedrive-side search covers a
  //    deal created by an earlier run whose link row never got written.
  const link = store.getPipedriveLink(agentId, agent.ams_name);
  if (link?.deal_id && link.state === 'open') {
    return { action: 'deal-exists', personId: person.id, dealId: link.deal_id, closedDealIds };
  }

  const { id: pipelineId } = await client.resolvePipeline();
  const openDeals = await client.listOpenDealsForPerson(person.id, pipelineId);
  const title = dealTitle(agent.ams_name, agent.agency_name);
  const alreadyThere = openDeals.find((deal) => deal.title === title);
  if (alreadyThere) {
    store.upsertPipedriveLink({
      agent_id: agentId,
      ams_name: agent.ams_name,
      person_id: person.id,
      deal_id: alreadyThere.id,
      state: 'open',
    });
    return { action: 'deal-exists', personId: person.id, dealId: alreadyThere.id, closedDealIds };
  }

  const deal = await client.createDeal({
    title,
    person_id: person.id,
    pipeline_id: pipelineId,
    stage_id: await client.stageId('Waitlisted'),
  });
  store.upsertPipedriveLink({
    agent_id: agentId,
    ams_name: agent.ams_name,
    person_id: person.id,
    deal_id: deal.id,
    state: 'open',
  });
  return { action: 'deal-created', personId: person.id, dealId: deal.id, closedDealIds };
}

/**
 * Mark as lost any open waitlist deal for an AMS the agent has moved off.
 *
 * A stale deal is worse than no deal: it inflates the demand for a platform
 * nobody on the list is still waiting for, and the whole point of the report is
 * to pick the next integration off the top row.
 */
async function closeStaleWaitlistDeals(
  store: Store,
  client: PipedriveClient,
  agentId: string,
  currentAms: string,
  personId: number,
): Promise<number[]> {
  const closed: number[] = [];
  for (const link of store.listPipedriveLinks(agentId)) {
    if (link.ams_name === currentAms || link.state !== 'open' || !link.deal_id) continue;
    try {
      await client.updateDeal(link.deal_id, {
        status: 'lost',
        lost_reason: `Agent switched to ${currentAms}`,
      });
      closed.push(link.deal_id);
    } catch (error) {
      // A deal deleted in Pipedrive by hand should not wedge the sync forever.
      if (error instanceof PipedriveError && error.status === 404) {
        // fall through and close the link locally
      } else {
        throw error;
      }
    }
    store.upsertPipedriveLink({
      agent_id: agentId,
      ams_name: link.ams_name,
      person_id: personId,
      deal_id: link.deal_id,
      state: 'closed',
    });
  }
  return closed;
}
