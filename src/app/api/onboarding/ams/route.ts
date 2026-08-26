import { NextResponse } from 'next/server';
import { getStore } from '@/lib/db';
import { successLine } from '@/lib/ams/copy';
import { recordAmsAnswer } from '@/lib/onboarding/amsAnswer';
import { amsSchema } from '@/lib/validation';
import { readSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** Step 3 submit. */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Your session expired. Start again.' }, { status: 401 });
  }
  if (!session.emailVerified) {
    return NextResponse.json({ error: 'Verify your email first.' }, { status: 403 });
  }

  const parsed = amsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Select your AMS to continue.' }, { status: 400 });
  }

  const { status } = recordAmsAnswer(getStore(), session.agentId, parsed.data);

  return NextResponse.json({
    ok: true,
    ams_name: parsed.data.ams_name,
    ams_status: status,
    success_line: successLine(parsed.data.ams_name, status),
  });
}
