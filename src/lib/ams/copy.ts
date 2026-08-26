import { type AmsName, type AmsStatus, amsStatusFor } from './catalog';

/**
 * Step 3 / step 4 copy. Legal- and marketing-approved — do not paraphrase.
 *
 * The "you can still sell today" clause in the waitlist body is load-bearing:
 * without it a non-EZLynx agent reads "waitlist" as "come back later" and never
 * returns.
 */
export function primaryButtonLabel(ams: AmsName | null): string {
  if (!ams) return 'Select your AMS to continue';
  switch (amsStatusFor(ams)) {
    case 'live':
      return `Connect ${ams} →`;
    case 'waitlist':
      return `Join the ${ams} waitlist →`;
    case 'none':
      return 'Continue →';
  }
}

/** Step 4 body line, one variant per branch. */
export function successLine(ams: AmsName, status: AmsStatus): string {
  switch (status) {
    case 'live':
      return `Vista is synced with ${ams} and your agent account is live.`;
    case 'waitlist':
      return `Your agent account is live and you are first in line for the ${ams} integration.`;
    case 'none':
      return 'Your agent account is live and you can quote with manual vehicle entry.';
  }
}

export const LIVE_PANEL = {
  title: (ams: AmsName) => `${ams} is live today`,
  body: 'Read-only sync. Vista reads eligible vehicles and never writes to your book.',
  promise:
    'Vista counts the eligible vehicles in your book the moment you connect, and prices coverage for each one.',
  /** Sits with the count, not in the footer — a claim-specific qualifier. */
  countDisclosure:
    'Eligible-vehicle counts are calculated from your own book at connection.',
} as const;

export const WAITLIST_PANEL = {
  eyebrow: 'Integration waitlist',
  title: (ams: AmsName) => `${ams} is next in line, not next month`,
  body: (ams: AmsName) =>
    `We build integrations in the order agents ask for them. Join the list and you can still sell today — you enter the vehicle once instead of it being read from your book, and we migrate you the day ${ams} goes live.`,
} as const;

export const MANUAL_PANEL = {
  eyebrow: 'Manual entry',
  title: 'No AMS needed to sell',
  body: 'You enter the vehicle details once at quote time instead of Vista reading them from a book. Everything after that — pricing, the client’s online checkout, claims — works exactly the same.',
} as const;

/** Shown before an answer is picked. Carries the AMS claim qualifier. */
export const AMS_HINT =
  'Live today for EZLynx and supported Applied Systems platforms. Everything else joins the integration waitlist and can still sell.';
