import { COMPLIANCE_DISCLOSURE } from '@/lib/compliance';

/**
 * Verification-code email.
 *
 * Uses Resend when `RESEND_API_KEY` is set; otherwise logs the code to the server
 * console so the flow is walkable in development without an email provider.
 */
export interface SendCodeInput {
  to: string;
  firstName: string;
  code: string;
}

export async function sendVerificationCode({ to, firstName, code }: SendCodeInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.VERIFICATION_FROM_EMAIL ?? 'Vista <onboarding@kovara.ai>';

  if (!apiKey) {
    console.log(`[email] verification code for ${to}: ${code} (set RESEND_API_KEY to send for real)`);
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `${code} is your Vista verification code`,
      text: [
        `Hi ${firstName},`,
        '',
        `Your Vista verification code is ${code}. It expires in ten minutes.`,
        '',
        'If you did not request this, you can ignore this email.',
        '',
        COMPLIANCE_DISCLOSURE,
      ].join('\n'),
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend responded ${response.status}: ${await response.text().catch(() => '')}`);
  }
}
