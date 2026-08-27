import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AD_DISCLOSURE,
  ADMINISTRATOR,
  COMPLIANCE_DISCLOSURE,
  DIRECT_CLAIM_NOTICE,
  INSURER,
  QUALIFIERS,
  REELS_SHORT_DISCLOSURE,
  STATE_ENTITIES,
} from '@/lib/compliance';
import { LIVE_PANEL } from '@/lib/ams/copy';

const ADS_HTML = readFileSync('design_handoff_agent_signup/AgentSignupAds.dc.html', 'utf8');
const CAPTIONS = readFileSync('design_handoff_agent_signup/CAPTIONS.md', 'utf8');

/**
 * Every value here is transcribed from the executed contract form
 * (Elevate Platinum VSC, AAS VSC 1 11-2022). These tests exist because the
 * design handoff had them wrong: it named no obligor and put the administrator
 * in the wrong city.
 */
describe('the parties, as named in the contract', () => {
  it('names Ascent as administrator and obligor, in Tempe', () => {
    expect(ADMINISTRATOR.name).toBe('Ascent Administration Services, LLC');
    expect(ADMINISTRATOR.address).toBe('360 South Smith Road, Tempe, Arizona 85281');
    expect(ADMINISTRATOR.phone).toBe('866-660-7003');
  });

  it('does not repeat the handoff’s Mesa error anywhere', () => {
    for (const source of [AD_DISCLOSURE, COMPLIANCE_DISCLOSURE, ADS_HTML, CAPTIONS]) {
      expect(source).not.toMatch(/Mesa/);
    }
  });

  it('names Old Republic as the insurer of the obligor, not the obligor', () => {
    expect(INSURER.name).toBe('Old Republic Insurance Company');
    expect(INSURER.address).toBe('P.O. Box 35008, Tulsa, OK 74153-0008');
    // The contract's phrasing: obligations are insured under a contractual
    // liability policy issued by Old Republic — a different claim from
    // "insured by Old Republic", which the handoff used.
    expect(AD_DISCLOSURE).toContain('contractual liability insurance policy issued by');
  });

  it('carries the direct-claim right with the insurer’s real address', () => {
    expect(DIRECT_CLAIM_NOTICE).toContain('sixty (60) days');
    expect(DIRECT_CLAIM_NOTICE).toContain('P.O. Box 35008, Tulsa, OK 74153-0008');
  });
});

describe('the states where a different entity applies', () => {
  it('covers California, Florida and New York', () => {
    expect(Object.keys(STATE_ENTITIES).sort()).toEqual(['CA', 'FL', 'NY']);
  });

  it('uses Old Republic Insured Automotive Services in California, with its licence', () => {
    const [ca] = STATE_ENTITIES.CA;
    expect(ca.name).toBe('Old Republic Insured Automotive Services, Inc.');
    expect(ca.role).toBe('administrator-and-obligor');
    expect(ca.license).toBe('0C79822');
  });

  it('splits administrator and obligor in Florida', () => {
    const roles = STATE_ENTITIES.FL.map((entity) => entity.role);
    expect(roles).toEqual(['administrator', 'obligor']);
    expect(STATE_ENTITIES.FL[0].name).toBe('Minnehoma Automobile Association, Inc.');
    expect(STATE_ENTITIES.FL[0].license).toBe('60033');
    expect(STATE_ENTITIES.FL[1].name).toBe('Old Republic Insurance Company');
  });

  it('uses ORIAS Warranty Services in New York', () => {
    expect(STATE_ENTITIES.NY[0].name).toBe('ORIAS Warranty Services');
  });

  it('tells the reader the parties change by state', () => {
    expect(AD_DISCLOSURE).toContain('administrator and obligor vary by state');
  });
});

describe('the disclosure blocks', () => {
  it('puts the ad block on every CTA-bearing frame', () => {
    expect(ADS_HTML.split(AD_DISCLOSURE).length - 1).toBe(17);
  });

  it('gives the Reels cuts the short line, which defers to the caption', () => {
    expect(ADS_HTML).toContain(REELS_SHORT_DISCLOSURE);
  });

  it('differs from the page version only by the eligible-count qualifier', () => {
    const qualifier = ' Eligible-vehicle counts are calculated from your own book at connection.';
    expect(COMPLIANCE_DISCLOSURE.replace(qualifier, '')).toBe(AD_DISCLOSURE);
  });

  it('states the product is not insurance, a warranty, or a guarantee', () => {
    // The contract's own front-page wording; "not insurance" alone understates it.
    expect(AD_DISCLOSURE).toContain('not insurance, a warranty, or a guarantee');
  });

  it('leaves no run-on between the obligor and the terms sentence', () => {
    for (const source of [ADS_HTML, CAPTIONS]) {
      expect(source).not.toContain('Insurance Company Coverage');
    }
  });

  it('keeps the full block in the caption file the Reels cuts depend on', () => {
    expect(CAPTIONS).toContain(AD_DISCLOSURE);
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
