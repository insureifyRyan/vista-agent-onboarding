/**
 * Compliance copy. Verbatim from `design_handoff_agent_signup/PROMPT.md`.
 *
 * Do not edit, shorten, or reflow. It renders at `--text-body` (#353C54) on the
 * page surface — deliberately not the lowest-contrast text on the page.
 *
 * Still open for legal review: the disclosure names an insurer (Old Republic) and
 * an administrator (Ascent) but no obligor. Confirm both the exact Old Republic
 * underwriting entity name and who the contract obligor is before launch — that
 * is a question for counsel, not something to infer from the handoff.
 */
export const COMPLIANCE_DISCLOSURE =
  'Insureify AI, Inc. DBA Kovara AI. Vehicle service contracts are not insurance; obligations insured by Old Republic Insurance Company. Coverage and eligibility subject to contract terms and exclusions. License verification required to sell. Eligible-vehicle counts are calculated from your own book at connection. All states except California. Administered by Ascent Administration, Mesa, AZ.';

/**
 * The disclosure as it appears on the creatives.
 *
 * Identical to the page version except that it omits the eligible-vehicle
 * sentence: that is a claim-specific qualifier, and it belongs only on a surface
 * that actually shows a count. An ad shows none.
 *
 * `tests/compliance.test.ts` asserts the exported creatives carry this string, so
 * the art and the landing page cannot drift apart again.
 */
export const AD_DISCLOSURE =
  'Insureify AI, Inc. DBA Kovara AI. Vehicle service contracts are not insurance; obligations insured by Old Republic Insurance Company. Coverage and eligibility subject to contract terms and exclusions. License verification required to sell. All states except California. Administered by Ascent Administration, Mesa, AZ.';

/** The short in-image line the Reels cuts carry instead of the full block. */
export const REELS_SHORT_DISCLOSURE =
  'Vehicle service contracts are not insurance. Available in all states except California. Full terms in the caption.';

export const TRUST_LINE = 'Fully insured by Old Republic';
export const ADMINISTRATOR_LINE = 'Ascent Administration, Mesa AZ';

/** Claim-specific qualifiers. Each must sit next to its claim, never in the footer. */
export const QUALIFIERS = {
  savings: 'Savings vary by vehicle, term and coverage.',
  ams: 'Live today for EZLynx and supported Applied Systems platforms.',
  time: 'Times are typical, not guaranteed.',
} as const;
