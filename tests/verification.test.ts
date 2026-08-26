import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SqliteStore } from '@/lib/db/sqlite';
import type { Store } from '@/lib/db/types';
import {
  CODE_TTL_MS,
  MAX_ATTEMPTS,
  canResend,
  generateCode,
  issueCode,
  verifyCode,
} from '@/lib/verification';

let store: Store;
let agentId: string;

beforeEach(() => {
  store = new SqliteStore(':memory:');
  agentId = store.upsertAgentByEmail({
    first_name: 'Jordan',
    last_name: 'Reyes',
    email: 'jordan@agency.com',
  }).id;
});

it('generates a six-digit code, zero-padded', () => {
  for (let i = 0; i < 200; i += 1) {
    expect(generateCode()).toMatch(/^\d{6}$/);
  }
});

it('accepts the right code exactly once', () => {
  const { code } = issueCode(store, agentId);

  expect(verifyCode(store, agentId, code)).toEqual({ ok: true });
  expect(verifyCode(store, agentId, code)).toEqual({ ok: false, reason: 'consumed' });
});

it('rejects a wrong code', () => {
  const { code } = issueCode(store, agentId);
  const wrong = code === '000000' ? '111111' : '000000';

  expect(verifyCode(store, agentId, wrong)).toEqual({ ok: false, reason: 'mismatch' });
});

it('expires after ten minutes, server-side', () => {
  vi.useFakeTimers();
  try {
    const { code } = issueCode(store, agentId);
    vi.setSystemTime(Date.now() + CODE_TTL_MS + 1000);
    expect(verifyCode(store, agentId, code)).toEqual({ ok: false, reason: 'expired' });
  } finally {
    vi.useRealTimers();
  }
});

it('stops accepting attempts after the limit', () => {
  const { code } = issueCode(store, agentId);
  const wrong = code === '000000' ? '111111' : '000000';

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    expect(verifyCode(store, agentId, wrong)).toEqual({ ok: false, reason: 'mismatch' });
  }
  // Even the correct code is refused once the budget is spent.
  expect(verifyCode(store, agentId, code)).toEqual({ ok: false, reason: 'too-many-attempts' });
});

it('never stores the code in the clear', () => {
  const { code } = issueCode(store, agentId);
  const record = store.latestVerificationCode(agentId)!;

  expect(record.code_hash).not.toContain(code);
  expect(record.code_hash).toMatch(/^[0-9a-f]{64}$/);
});

it('reports no code when none was issued', () => {
  expect(verifyCode(store, agentId, '123456')).toEqual({ ok: false, reason: 'no-code' });
});

it('throttles resends', () => {
  expect(canResend(store, agentId)).toBe(true);
  issueCode(store, agentId);
  expect(canResend(store, agentId)).toBe(false);
});
