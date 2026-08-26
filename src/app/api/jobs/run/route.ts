import { NextResponse } from 'next/server';
import { getStore } from '@/lib/db';
import { drainJobs } from '@/lib/jobs/queue';

export const dynamic = 'force-dynamic';

/**
 * Drain the job queue. Point a scheduler at this (Vercel Cron, or anything that
 * can issue an authenticated POST every minute).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const expected = process.env.JOBS_RUN_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'JOBS_RUN_SECRET is not configured' }, { status: 503 });
  }

  const authorization = request.headers.get('authorization');
  if (authorization !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(await drainJobs(getStore()));
}
