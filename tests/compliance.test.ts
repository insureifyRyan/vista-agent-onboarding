import { describe, expect, it } from 'vitest';
import { COMPLIANCE_DISCLOSURE, QUALIFIERS } from '@/lib/compliance';
import { LIVE_PANEL } from '@/lib/ams/copy';

describe('the disclosure block', () => {
  it('is the approved text, unedited', () => {
    expect(COMPLIANCE_DISCLOSURE).toBe(
      'Insureify AI, Inc. DBA Kovara AI. Vehicle service contracts are not insurance; obligations insured by Old Republic Insurance Company. Coverage and eligibility subject to contract terms and exclusions. License verification required to sell. Eligible-vehicle counts are calculated from your own book at connection. All states except California. Administered by Ascent Administration, Mesa, AZ.',
    );
  });

  it('carries every required element', () => {
    for (const clause of [
      'Insureify AI, Inc. DBA Kovara AI',
      'are not insurance',
      'Old Republic Insurance Company',
      'License verification required to sell',
      'All states except California',
      'Ascent Administration, Mesa, AZ',
    ]) {
      expect(COMPLIANCE_DISCLOSURE).toContain(clause);
    }
  });
});

describe('claim-specific qualifiers', () => {
  it('keeps the AMS qualifier available to sit beside the AMS claim', () => {
    expect(QUALIFIERS.ams).toBe('Live today for EZLynx and supported Applied Systems platforms.');
  });

  it('states where the eligible-vehicle count comes from, next to the count', () => {
    expect(LIVE_PANEL.countDisclosure).toBe(
      'Eligible-vehicle counts are calculated from your own book at connection.',
    );
  });
});
