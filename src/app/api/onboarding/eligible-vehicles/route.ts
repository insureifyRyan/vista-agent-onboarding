import { NextResponse } from 'next/server';
import { getStore } from '@/lib/db';
import { isAmsName } from '@/lib/ams/catalog';
import { getEligibleVehicleCount } from '@/lib/ams/eligibleVehicles';
import { readSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * The eligible-vehicle count for a connected book.
 *
 * Returns `unavailable` until a real AMS connector exists. The UI shows a
 * skeleton while this is in flight and renders nothing if it comes back
 * unavailable — it never substitutes a sample figure.
 */
export async function GET(): Promise<NextResponse> {
  const session = await readSession();
  if (!session) return NextResponse.json({ status: 'unavailable' });

  const agent = getStore().getAgent(session.agentId);
  if (!agent?.ams_name || !isAmsName(agent.ams_name) || agent.ams_status !== 'live') {
    return NextResponse.json({ status: 'unavailable' });
  }

  return NextResponse.json(await getEligibleVehicleCount(agent.ams_name, agent.id));
}
