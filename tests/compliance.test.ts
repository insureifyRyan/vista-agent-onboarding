import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AD_DISCLOSURE,
  COMPLIANCE_DISCLOSURE,
  QUALIFIERS,
  REELS_SHORT_DISCLOSURE,
} from '@/lib/compliance';
import { LIVE_PANEL } from '@/lib/ams/copy';

const ADS_HTML = readFileSync('design_handoff_agent_signup/AgentSignupAds.dc.html', 'utf8');
const CAPTIONS = readFileSync('design_handoff_agent_signup/CAPTIONS.md', 'utf8');

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

describe('the creatives carry the same disclosure as the page', () => {
  it('puts the ad disclosure on every CTA-bearing frame', () => {
    // Seventeen frames carry the full block; the three Reels cuts carry the short
    // line instead, because Reels covers the bottom third with its own chrome.
    const occurrences = ADS_HTML.split(AD_DISCLOSURE).length - 1;
    expect(occurrences).toBe(17);
  });

  it('gives the Reels cuts the short line, which defers to the caption', () => {
    expect(ADS_HTML).toContain(REELS_SHORT_DISCLOSURE);
  });

  it('differs from the page version only by the eligible-count qualifier', () => {
    const qualifier = ' Eligible-vehicle counts are calculated from your own book at connection.';
    expect(COMPLIANCE_DISCLOSURE.replace(qualifier, '')).toBe(AD_DISCLOSURE);
  });

  it('leaves no run-on between the obligor and the terms sentence', () => {
    // The defect this guards: a missing full stop turned "…insured by Old Republic
    // Insurance Company." and "Coverage and eligibility subject to…" into one
    // unreadable sentence, across all seventeen frames and the caption boilerplate.
    for (const source of [ADS_HTML, CAPTIONS]) {
      expect(source).not.toContain('Insurance Company Coverage');
    }
  });

  it('keeps the full boilerplate in the caption file the Reels cuts depend on', () => {
    expect(CAPTIONS).toContain('Old Republic Insurance Company. Coverage');
    expect(CAPTIONS).toContain('Available in all states except California');
  });
});
