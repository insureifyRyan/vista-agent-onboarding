import { NextResponse } from 'next/server';
import { getStore } from '@/lib/db';
import { canResend, issueCode } from '@/lib/verification';
import { sendVerificationCode } from '@/lib/email/send';
import { readSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(): Promise<NextResponse> {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Your session expired. Start again.' }, { status: 401 });
  }

  const store = getStore();
  if (!canResend(store, session.agentId)) {
    return NextResponse.json(
      { error: 'Hang on a few seconds before requesting another code.' },
      { status: 429 },
    );
  }

  const agent = store.getAgent(session.agentId);
  if (!agent) {
    return NextResponse.json({ error: 'Your session expired. Start again.' }, { status: 401 });
  }

  const { code } = issueCode(store, agent.id);
  try {
    await sendVerificationCode({ to: agent.email, firstName: agent.first_name, code });
  } catch (error) {
    console.error('[onboarding] verification resend failed', error);
    return NextResponse.json(
      { error: 'We could not send your code just now. Try again in a moment.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
