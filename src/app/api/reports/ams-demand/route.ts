import { NextResponse } from 'next/server';
import { getStore } from '@/lib/db';
import type { DemandSort } from '@/lib/db/types';

export const dynamic = 'force-dynamic';

/**
 * The demand report the waitlist exists to produce:
 *
 *   ams_name | agents waiting | est. vehicles represented | oldest signup date
 *
 * Build the next integration for the top row. `oldest_signup` is the churn
 * warning — a platform waiting six months is a platform whose agents have
 * stopped believing us.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const expected = process.env.REPORTS_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'REPORTS_SECRET is not configured' }, { status: 503 });
  }
  if (request.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sortParam = new URL(request.url).searchParams.get('sort');
  const sort: DemandSort = sortParam === 'agents' ? 'agents' : 'vehicles';
  return NextResponse.json({ sort, rows: getStore().amsDemandReport(sort) });
}
