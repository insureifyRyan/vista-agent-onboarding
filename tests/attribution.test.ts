import { describe, expect, it } from 'vitest';
import { SqliteStore } from '@/lib/db/sqlite';
import { isEmptyAttribution, parseAttribution } from '@/lib/attribution';

const AD_URL =
  'https://www.kovara.ai/onboarding?utm_source=meta&utm_medium=paid_social&utm_campaign=agent_signup&utm_content=B3';

describe('parsing the landing URL', () => {
  it('reads all four UTM params plus the landing URL and referrer', () => {
    const attribution = parseAttribution(AD_URL, 'https://l.instagram.com/');

    expect(attribution).toEqual({
      utm_source: 'meta',
      utm_medium: 'paid_social',
      utm_campaign: 'agent_signup',
      utm_content: 'B3',
      landing_url: AD_URL,
      referrer: 'https://l.instagram.com/',
    });
  });

  it('keeps utm_content, which is the only thing telling the creatives apart', () => {
    for (const frame of ['A1', 'B5', 'S2', 'R1', 'V3', 'P1']) {
      const url = `https://www.kovara.ai/onboarding?utm_content=${frame}`;
      expect(parseAttribution(url).utm_content).toBe(frame);
    }
  });

  it('treats an empty param as absent rather than an empty string', () => {
    const attribution = parseAttribution('https://www.kovara.ai/onboarding?utm_content=');
    expect(attribution.utm_content).toBeNull();
    expect(isEmptyAttribution(attribution)).toBe(true);
  });

  it('survives a malformed URL', () => {
    expect(parseAttribution('not a url', 'https://ref.example')).toMatchObject({
      utm_content: null,
      referrer: 'https://ref.example',
    });
  });
});

describe('attribution on the agent record', () => {
  it('lands utm_content on the agent at creation', () => {
    const store = new SqliteStore(':memory:');
    const agent = store.upsertAgentByEmail({
      first_name: 'Jordan',
      last_name: 'Reyes',
      email: 'jordan@agency.com',
      ...parseAttribution(AD_URL, 'https://l.instagram.com/'),
    });

    expect(agent.utm_content).toBe('B3');
    expect(agent.utm_source).toBe('meta');
    expect(agent.landing_url).toBe(AD_URL);
    expect(agent.referrer).toBe('https://l.instagram.com/');
  });

  it('does not let a later UTM-less visit erase the creative that converted', () => {
    const store = new SqliteStore(':memory:');
    const identity = { first_name: 'Jordan', last_name: 'Reyes', email: 'jordan@agency.com' };

    store.upsertAgentByEmail({ ...identity, ...parseAttribution(AD_URL) });
    const second = store.upsertAgentByEmail({
      ...identity,
      ...parseAttribution('https://www.kovara.ai/onboarding'),
    });

    expect(second.utm_content).toBe('B3');
  });
});
