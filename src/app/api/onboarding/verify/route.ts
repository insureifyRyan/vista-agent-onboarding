import { NextResponse } from 'next/server';
import { getStore } from '@/lib/db';
import { verifySchema } from '@/lib/validation';
import { VERIFY_ERROR_COPY, verifyCode } from '@/lib/verification';
import { readSession, writeSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** Step 2 submit. Expiry and attempt limits are enforced here, not in the browser. */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Your session expired. Start again.' }, { status: 401 });
  }

  const parsed = verifySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Enter the six digits from your email' },
      { status: 400 },
    );
  }

  const store = getStore();
  const outcome = verifyCode(store, session.agentId, parsed.data.code);
  if (!outcome.ok) {
    return NextResponse.json({ error: VERIFY_ERROR_COPY[outcome.reason] }, { status: 400 });
  }

  store.updateAgent(session.agentId, { email_verified_at: new Date().toISOString() });
  await writeSession({ ...session, emailVerified: true });
  return NextResponse.json({ ok: true });
}
