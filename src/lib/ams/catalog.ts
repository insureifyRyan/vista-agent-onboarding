/**
 * The agency-management-system catalog.
 *
 * Order is taken verbatim from `design_handoff_agent_signup/README.md`: alphabetical,
 * with "Other / spreadsheet" pinned last. It is deliberately NOT "supported platforms
 * first" — an agent scanning for their own system finds it faster alphabetically, and
 * the answers stay clean because EZLynx never sits at the top waiting to be mis-picked.
 *
 * Do not reorder.
 */
export const AMS_OPTIONS = [
  'Agency Matrix',
  'AMS360',
  'Applied CSR24',
  'Applied Epic',
  'Applied TAM',
  'Better Agency',
  'BriteCore',
  'EZLynx',
  'InsurancePro (ITC)',
  'Jenesis',
  'NowCerts',
  'Novidea',
  'QQCatalyst',
  'Sagitta',
  'Veruna',
  'Other / spreadsheet',
] as const;

export type AmsName = (typeof AMS_OPTIONS)[number];

/** Platforms with a live read-only book sync today. */
export const LIVE_AMS: readonly AmsName[] = [
  'EZLynx',
  'Applied Epic',
  'Applied TAM',
  'Applied CSR24',
];

/** The "I don't run an AMS" answer. Never produces a waitlist record. */
export const NO_AMS: AmsName = 'Other / spreadsheet';

export type AmsStatus = 'live' | 'waitlist' | 'none';

export function isAmsName(value: unknown): value is AmsName {
  return typeof value === 'string' && (AMS_OPTIONS as readonly string[]).includes(value);
}

/**
 * Derive the branch from the answer.
 *
 *   live     -> green confirmation panel, "Connect {AMS} →"
 *   waitlist -> waitlist card, "Join the {AMS} waitlist →", one Pipedrive deal
 *   none     -> manual-entry card, "Continue →", and NO Pipedrive deal.
 *
 * Enrolling spreadsheet agencies in the waitlist would corrupt the integration
 * demand ranking, which is the only thing that list exists to produce.
 */
export function amsStatusFor(ams: AmsName): AmsStatus {
  if (ams === NO_AMS) return 'none';
  return LIVE_AMS.includes(ams) ? 'live' : 'waitlist';
}
