import { beforeEach, describe, expect, it } from 'vitest';
import { SqliteStore } from '@/lib/db/sqlite';
import type { Store } from '@/lib/db/types';
import type { AmsName } from '@/lib/ams/catalog';
import { recordAmsAnswer } from '@/lib/onboarding/amsAnswer';

let store: Store;

function enrol(email: string, ams: AmsName, bookSize: number | null): void {
  const agent = store.upsertAgentByEmail({ first_name: 'A', last_name: 'B', email });
  recordAmsAnswer(store, agent.id, { ams_name: ams, book_size_est: bookSize });
}

beforeEach(() => {
  store = new SqliteStore(':memory:');
});

describe('the report the waitlist exists to produce', () => {
  it('returns ams_name, agents waiting, vehicles represented and oldest signup', () => {
    enrol('a@x.com', 'Jenesis', 200);
    enrol('b@x.com', 'Jenesis', 150);
    enrol('c@x.com', 'NowCerts', 20);

    const rows = store.amsDemandReport();

    expect(rows[0]).toMatchObject({
      ams_name: 'Jenesis',
      agents_waiting: 2,
      est_vehicles_represented: 350,
    });
    expect(rows[0].oldest_signup).toEqual(expect.any(String));
  });

  it('ranks by vehicles represented, not headcount', () => {
    // Forty agents with 200 vehicles each beats ninety agents with twenty.
    for (let i = 0; i < 40; i += 1) enrol(`few${i}@x.com`, 'Jenesis', 200);
    for (let i = 0; i < 90; i += 1) enrol(`many${i}@x.com`, 'NowCerts', 20);

    const rows = store.amsDemandReport();

    expect(rows[0].ams_name).toBe('Jenesis');
    expect(rows[0].est_vehicles_represented).toBe(8000);
    expect(rows[1].ams_name).toBe('NowCerts');
    expect(rows[1].agents_waiting).toBe(90);
  });

  it('can rank by headcount when asked', () => {
    for (let i = 0; i < 2; i += 1) enrol(`few${i}@x.com`, 'Jenesis', 500);
    for (let i = 0; i < 5; i += 1) enrol(`many${i}@x.com`, 'NowCerts', 10);

    expect(store.amsDemandReport('agents')[0].ams_name).toBe('NowCerts');
    expect(store.amsDemandReport('vehicles')[0].ams_name).toBe('Jenesis');
  });

  it('counts an agent who left book size blank without inflating the total', () => {
    enrol('a@x.com', 'Jenesis', null);
    enrol('b@x.com', 'Jenesis', 100);

    expect(store.amsDemandReport()[0]).toMatchObject({
      agents_waiting: 2,
      est_vehicles_represented: 100,
    });
  });

  it('excludes live integrations and spreadsheet agencies entirely', () => {
    enrol('live@x.com', 'EZLynx', 900);
    enrol('sheet@x.com', 'Other / spreadsheet', 900);
    enrol('wait@x.com', 'Jenesis', 10);

    const rows = store.amsDemandReport();

    expect(rows).toHaveLength(1);
    expect(rows[0].ams_name).toBe('Jenesis');
  });

  it('stops counting an agent for the platform they left', () => {
    const agent = store.upsertAgentByEmail({ first_name: 'A', last_name: 'B', email: 'a@x.com' });
    recordAmsAnswer(store, agent.id, { ams_name: 'Jenesis', book_size_est: 300 });
    expect(store.amsDemandReport()[0].ams_name).toBe('Jenesis');

    recordAmsAnswer(store, agent.id, { ams_name: 'EZLynx' });
    expect(store.amsDemandReport()).toHaveLength(0);
  });
});
