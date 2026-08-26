import { NextResponse } from 'next/server';
import { getStore } from '@/lib/db';
import { startSchema } from '@/lib/validation';
import { issueCode } from '@/lib/verification';
import { sendVerificationCode } from '@/lib/email/send';
import { writeSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * Step 1 submit: create (or find) the agent, stamp attribution, email a code.
 *
 * Attribution is written here, at agent creation, exactly as the spec requires —
 * `utm_content` is what tells the twenty creatives apart in reporting.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = startSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Check the form and try again.' },
      { status: 400 },
    );
  }

  const { first_name, last_name, email, attribution } = parsed.data;
  const store = getStore();
  const agent = store.upsertAgentByEmail({ first_name, last_name, email, ...attribution });

  const { code } = issueCode(store, agent.id);
  try {
    await sendVerificationCode({ to: agent.email, firstName: agent.first_name, code });
  } catch (error) {
    console.error('[onboarding] verification email failed', error);
    return NextResponse.json(
      { error: 'We could not send your code just now. Try again in a moment.' },
      { status: 502 },
    );
  }

  await writeSession({ agentId: agent.id, emailVerified: false });
  return NextResponse.json({ ok: true, email: agent.email });
}
