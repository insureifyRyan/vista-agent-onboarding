/**
 * Compliance copy, sourced from the executed contract form
 * (Elevate Platinum VSC, `AAS VSC 1 11-2022`, © 2022 Ascent Administration
 * Services, LLC) rather than from the design handoff.
 *
 * The handoff's wording was wrong in two ways that mattered: it named no obligor
 * at all, and it placed the administrator in Mesa. Every entity name, address,
 * phone number and licence number below is transcribed from the contract's
 * DEFINITIONS and STATE DISCLOSURES sections. Do not paraphrase them.
 */

/** The administrator and obligor in every state except CA, FL and NY. */
export const ADMINISTRATOR = {
  name: 'Ascent Administration Services, LLC',
  address: '360 South Smith Road, Tempe, Arizona 85281',
  city: 'Tempe, AZ',
  phone: '866-660-7003',
} as const;

/**
 * The insurer standing behind the obligor.
 *
 * Contract, VI(l): "Obligations of the Obligor under this Service Contract are
 * insured under a contractual liability insurance policy issued by Old Republic
 * Insurance Company." That is the precise relationship — Old Republic insures the
 * obligor's obligations; it is not itself the obligor outside Florida.
 */
export const INSURER = {
  name: 'Old Republic Insurance Company',
  address: 'P.O. Box 35008, Tulsa, OK 74153-0008',
  phone: '(800) 331-3780',
} as const;

export interface StateEntity {
  role: 'administrator-and-obligor' | 'administrator' | 'obligor';
  name: string;
  address: string;
  phone: string;
  license?: string;
}

/**
 * States where the contract names a different entity. Old Republic operates
 * these under separate names, so a state-specific disclosure must use the right
 * one rather than defaulting to Ascent.
 */
export const STATE_ENTITIES: Record<string, StateEntity[]> = {
  CA: [
    {
      role: 'administrator-and-obligor',
      name: 'Old Republic Insured Automotive Services, Inc.',
      address: '8282 S Memorial Dr., Ste. 202, Tulsa, OK 74133',
      phone: '800-331-3780',
      license: '0C79822',
    },
  ],
  FL: [
    {
      role: 'administrator',
      name: 'Minnehoma Automobile Association, Inc.',
      address: 'P.O. Box 35008, Tulsa, OK 74153-0008',
      phone: '800-644-9680',
      license: '60033',
    },
    {
      role: 'obligor',
      name: 'Old Republic Insurance Company',
      address: 'P.O. Box 35008, Tulsa, OK 74153-0008',
      phone: '800-644-9680',
    },
  ],
  NY: [
    {
      role: 'administrator-and-obligor',
      name: 'ORIAS Warranty Services',
      address: '8282 S Memorial Dr., Ste. 202, Tulsa, OK 74133',
      phone: '800-331-3780',
    },
  ],
};

/**
 * The disclosure carried on every creative.
 *
 * "not insurance, a warranty, or a guarantee" is the contract's own front-page
 * wording. The administrator is named with its full legal name and correct city,
 * and "varies by state" carries the CA/FL/NY difference without putting a table
 * on a 1080px canvas.
 */
export const AD_DISCLOSURE =
  'Insureify AI, Inc. DBA Kovara AI. Vehicle service contracts are not insurance, a warranty, or a guarantee. Administrator and obligor: Ascent Administration Services, LLC, Tempe, AZ; administrator and obligor vary by state. Obligations are insured under a contractual liability insurance policy issued by Old Republic Insurance Company. Coverage and eligibility subject to contract terms and exclusions. Producer license verification required to sell. Available in all states except California.';

/**
 * The disclosure carried on the onboarding page.
 *
 * The ad block plus the eligible-vehicle qualifier, which is claim-specific and
 * belongs only on a surface that actually shows a count.
 */
export const COMPLIANCE_DISCLOSURE =
  'Insureify AI, Inc. DBA Kovara AI. Vehicle service contracts are not insurance, a warranty, or a guarantee. Administrator and obligor: Ascent Administration Services, LLC, Tempe, AZ; administrator and obligor vary by state. Obligations are insured under a contractual liability insurance policy issued by Old Republic Insurance Company. Coverage and eligibility subject to contract terms and exclusions. Producer license verification required to sell. Eligible-vehicle counts are calculated from your own book at connection. Available in all states except California.';

/** The short in-image line the Reels cuts carry instead of the full block. */
export const REELS_SHORT_DISCLOSURE =
  'Vehicle service contracts are not insurance. Available in all states except California. Full terms in the caption.';

/**
 * The buyer's direct-claim right, contract VI(l). Consumer-facing — it belongs on
 * the contract and the customer flow, not on an agent-recruitment ad.
 */
export const DIRECT_CLAIM_NOTICE =
  `If the obligor fails to pay or provide service on a claim within sixty (60) days after proof of loss has been filed, you are entitled to make a claim directly against the insurer, ${INSURER.name}, ${INSURER.address}, ${INSURER.phone}.`;

export const TRUST_LINE = 'Fully insured by Old Republic';
export const ADMINISTRATOR_LINE = `${ADMINISTRATOR.name}, ${ADMINISTRATOR.city}`;

/** Claim-specific qualifiers. Each must sit next to its claim, never in the footer. */
export const QUALIFIERS = {
  savings: 'Savings vary by vehicle, term and coverage.',
  ams: 'Live today for EZLynx and supported Applied Systems platforms.',
  time: 'Times are typical, not guaranteed.',
} as const;
