import { describe, expect, it } from 'vitest';
import { AMS_OPTIONS, LIVE_AMS, NO_AMS, amsStatusFor, isAmsName } from '@/lib/ams/catalog';
import { primaryButtonLabel, successLine } from '@/lib/ams/copy';

describe('the selector', () => {
  it('offers the sixteen options from the spec', () => {
    expect(AMS_OPTIONS).toHaveLength(16);
  });

  it('is alphabetical with Other / spreadsheet pinned last, not supported-first', () => {
    expect(AMS_OPTIONS[0]).toBe('Agency Matrix');
    expect(AMS_OPTIONS.at(-1)).toBe('Other / spreadsheet');
    // EZLynx must not sit at the top waiting to be mis-picked.
    expect(AMS_OPTIONS.indexOf('EZLynx')).toBe(7);
  });

  it('rejects anything not on the list', () => {
    expect(isAmsName('EZLynx')).toBe(true);
    expect(isAmsName('HawkSoft')).toBe(false);
    expect(isAmsName('')).toBe(false);
  });
});

describe('branching', () => {
  it('routes the four supported platforms to the live branch', () => {
    for (const ams of ['EZLynx', 'Applied Epic', 'Applied TAM', 'Applied CSR24'] as const) {
      expect(amsStatusFor(ams)).toBe('live');
    }
    expect(LIVE_AMS).toHaveLength(4);
  });

  it('routes every other named platform to the waitlist', () => {
    const waitlisted = AMS_OPTIONS.filter((ams) => amsStatusFor(ams) === 'waitlist');
    expect(waitlisted).toHaveLength(AMS_OPTIONS.length - LIVE_AMS.length - 1);
    expect(waitlisted).not.toContain(NO_AMS);
  });

  it('routes Other / spreadsheet to the no-AMS branch', () => {
    expect(amsStatusFor(NO_AMS)).toBe('none');
  });
});

describe('button copy', () => {
  it('reads the gating label when nothing is selected', () => {
    expect(primaryButtonLabel(null)).toBe('Select your AMS to continue');
  });

  it('names the platform on the live and waitlist branches', () => {
    expect(primaryButtonLabel('EZLynx')).toBe('Connect EZLynx →');
    expect(primaryButtonLabel('Jenesis')).toBe('Join the Jenesis waitlist →');
    expect(primaryButtonLabel('Other / spreadsheet')).toBe('Continue →');
  });
});

describe('success copy', () => {
  it('has one variant per branch', () => {
    expect(successLine('EZLynx', 'live')).toBe(
      'Vista is synced with EZLynx and your agent account is live.',
    );
    expect(successLine('Jenesis', 'waitlist')).toBe(
      'Your agent account is live and you are first in line for the Jenesis integration.',
    );
    expect(successLine('Other / spreadsheet', 'none')).toBe(
      'Your agent account is live and you can quote with manual vehicle entry.',
    );
  });
});
