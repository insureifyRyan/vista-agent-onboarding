import type { AttributionInput } from '@/lib/db/types';

export const ATTRIBUTION_STORAGE_KEY = 'vista.onboarding.attribution';

const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const;

export const EMPTY_ATTRIBUTION: AttributionInput = {
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_content: null,
  landing_url: null,
  referrer: null,
};

/** Trim and drop empties so `?utm_content=` never lands as an empty string. */
function clean(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, 255) : null;
}

/**
 * Read the campaign attribution off a landing URL.
 *
 * `utm_content` carries the frame id (A1, B3, S2, R1, P1 …) and is the only thing
 * that tells the twenty creatives apart in reporting.
 */
export function parseAttribution(url: string, referrer: string | null = null): AttributionInput {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ...EMPTY_ATTRIBUTION, referrer: clean(referrer) };
  }

  const result: AttributionInput = {
    ...EMPTY_ATTRIBUTION,
    landing_url: url.slice(0, 2048),
    referrer: clean(referrer),
  };
  for (const param of UTM_PARAMS) {
    result[param] = clean(parsed.searchParams.get(param));
  }
  return result;
}

export function isEmptyAttribution(attribution: AttributionInput): boolean {
  return UTM_PARAMS.every((param) => attribution[param] == null);
}

/**
 * Capture on first load and hold for the session.
 *
 * First touch wins: the agent leaves for their inbox and comes back to
 * /onboarding with no query string at all, and the creative that produced them
 * must survive that round trip.
 */
export function captureAttribution(): AttributionInput {
  if (typeof window === 'undefined') return EMPTY_ATTRIBUTION;

  const stored = readAttribution();
  if (stored && !isEmptyAttribution(stored)) return stored;

  const fresh = parseAttribution(window.location.href, document.referrer || null);
  try {
    window.sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(fresh));
  } catch {
    // Private-mode Safari and friends. Attribution is nice to have; the sign-up is not.
  }
  return fresh;
}

export function readAttribution(): AttributionInput | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    return raw ? ({ ...EMPTY_ATTRIBUTION, ...JSON.parse(raw) } as AttributionInput) : null;
  } catch {
    return null;
  }
}
