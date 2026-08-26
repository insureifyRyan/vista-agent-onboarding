import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import type { Store, VerificationCode } from '@/lib/db/types';

export const CODE_LENGTH = 6;
export const CODE_TTL_MS = 10 * 60_000;
export const MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_MS = 30_000;

/** Codes are stored hashed, so a database read never yields a usable code. */
function hashCode(code: string): string {
  const secret = process.env.VERIFICATION_SECRET ?? 'dev-only-verification-secret';
  return createHmac('sha256', secret).update(code).digest('hex');
}

export function generateCode(): string {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0');
}

export function issueCode(store: Store, agentId: string): { code: string; expiresAt: string } {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();
  store.createVerificationCode(agentId, hashCode(code), expiresAt);
  return { code, expiresAt };
}

export type VerifyOutcome =
  | { ok: true }
  | { ok: false; reason: 'no-code' | 'expired' | 'consumed' | 'too-many-attempts' | 'mismatch' };

/** Error copy. Expiry is surfaced explicitly — a silent "wrong code" on an
 *  expired code sends agents hunting for a typo that isn't there. */
export const VERIFY_ERROR_COPY: Record<Exclude<VerifyOutcome, { ok: true }>['reason'], string> = {
  'no-code': 'We don’t have a code for this email. Request a new one.',
  expired: 'That code has expired. Codes last ten minutes — tap Resend for a new one.',
  consumed: 'That code has already been used. Tap Resend for a new one.',
  'too-many-attempts': 'Too many incorrect attempts. Tap Resend for a new code.',
  mismatch: 'That code isn’t right. Check the six digits and try again.',
};

/** Expiry and attempt limits are enforced here, server-side. */
export function verifyCode(store: Store, agentId: string, submitted: string): VerifyOutcome {
  const record: VerificationCode | null = store.latestVerificationCode(agentId);
  if (!record) return { ok: false, reason: 'no-code' };
  if (record.consumed_at) return { ok: false, reason: 'consumed' };
  if (record.attempts >= MAX_ATTEMPTS) return { ok: false, reason: 'too-many-attempts' };
  if (Date.parse(record.expires_at) <= Date.now()) return { ok: false, reason: 'expired' };

  store.recordCodeAttempt(record.id);

  const expected = Buffer.from(record.code_hash, 'hex');
  const actual = Buffer.from(hashCode(submitted.trim()), 'hex');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return { ok: false, reason: 'mismatch' };
  }

  store.consumeVerificationCode(record.id);
  return { ok: true };
}

export function canResend(store: Store, agentId: string): boolean {
  const record = store.latestVerificationCode(agentId);
  if (!record) return true;
  return Date.now() - Date.parse(record.created_at) >= RESEND_COOLDOWN_MS;
}
