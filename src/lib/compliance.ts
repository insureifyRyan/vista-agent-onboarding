/**
 * Compliance copy. Verbatim from `design_handoff_agent_signup/PROMPT.md`.
 *
 * Do not edit, shorten, or reflow. It renders at `--text-body` (#353C54) on the
 * page surface — deliberately not the lowest-contrast text on the page.
 *
 * Note for legal review: the handoff carries three slightly different wordings of
 * this block (PROMPT.md, README.md, and the flow prototype's footer). PROMPT.md is
 * the one reproduced here because it is the only version that punctuates
 * "Old Republic Insurance Company." correctly and includes the eligible-count line.
 * Confirm the exact Old Republic underwriting entity name before launch.
 */
export const COMPLIANCE_DISCLOSURE =
  'Insureify AI, Inc. DBA Kovara AI. Vehicle service contracts are not insurance; obligations insured by Old Republic Insurance Company. Coverage and eligibility subject to contract terms and exclusions. License verification required to sell. Eligible-vehicle counts are calculated from your own book at connection. All states except California. Administered by Ascent Administration, Mesa, AZ.';

export const TRUST_LINE = 'Fully insured by Old Republic';
export const ADMINISTRATOR_LINE = 'Ascent Administration, Mesa AZ';

/** Claim-specific qualifiers. Each must sit next to its claim, never in the footer. */
export const QUALIFIERS = {
  savings: 'Savings vary by vehicle, term and coverage.',
  ams: 'Live today for EZLynx and supported Applied Systems platforms.',
  time: 'Times are typical, not guaranteed.',
} as const;
