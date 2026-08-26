import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'vista_onboarding';
const MAX_AGE_SECONDS = 60 * 60 * 2;

export interface OnboardingSession {
  agentId: string;
  emailVerified: boolean;
}

function secret(): string {
  return process.env.SESSION_SECRET ?? 'dev-only-session-secret';
}

function sign(value: string): string {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

function serialize(session: OnboardingSession): string {
  const body = Buffer.from(JSON.stringify(session)).toString('base64url');
  return `${body}.${sign(body)}`;
}

function deserialize(raw: string): OnboardingSession | null {
  const [body, signature] = raw.split('.');
  if (!body || !signature) return null;

  const expected = Buffer.from(sign(body));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as OnboardingSession;
    return typeof parsed.agentId === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export async function readSession(): Promise<OnboardingSession | null> {
  const cookie = (await cookies()).get(SESSION_COOKIE);
  return cookie ? deserialize(cookie.value) : null;
}

export async function writeSession(session: OnboardingSession): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, serialize(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
