// Relative, with an extension, so scripts/*.mts can import this module under
// node --experimental-strip-types, which does not resolve the "@/" alias.
import { AMS_OPTIONS } from '../ams/catalog.ts';

/**
 * Pipedrive wiring.
 *
 * The pipeline and stages are created once, by hand or by scripts/pipedrive-setup.mts:
 *
 *   Pipeline: "AMS integrations"
 *   Stages:   Waitlisted → Build scheduled → In development → Ready to activate → Activated
 */
export const PIPELINE_NAME = 'AMS integrations';

export const STAGES = [
  'Waitlisted',
  'Build scheduled',
  'In development',
  'Ready to activate',
  'Activated',
] as const;

export type StageName = (typeof STAGES)[number];

/** Resident states. California is absent — the product is not sold there. */
export const RESIDENT_STATES = [
  'AL','AK','AZ','AR','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI',
  'SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
] as const;

export interface PersonFieldSpec {
  /** The field's name in Pipedrive. Create it with exactly this name. */
  name: string;
  /** Pipedrive field type, as shown in the "Add custom field" dialog. */
  field_type: 'enum' | 'varchar' | 'double';
  /** Set options, in this order, for enum fields. */
  options?: readonly string[];
  /** Environment variable that carries the hashed key once the field exists. */
  envVar: string;
  /** Why the field exists — what breaks without it. */
  purpose: string;
}

/**
 * Person custom fields.
 *
 * This object is the contract: create these six fields in Pipedrive with these
 * names and types, then put each field's hashed key into the named environment
 * variable. Pipedrive generates those keys per account, which is why they cannot
 * live in source. `scripts/pipedrive-setup.mts` creates the fields and prints the
 * keys; `scripts/pipedrive-fields.mts` prints this spec and which keys are wired.
 *
 * A missing key is not fatal — the sync omits that field rather than failing, so
 * an unconfigured field never costs you the waitlist record itself. It does cost
 * you the demand report, which needs ams_name and book_size_est as structured,
 * queryable values rather than text in a note.
 */
export const PERSON_FIELDS = {
  ams_name: {
    name: 'ams_name',
    field_type: 'enum',
    options: AMS_OPTIONS,
    envVar: 'PIPEDRIVE_FIELD_AMS_NAME',
    purpose: 'Which platform the agent is waiting on. The demand report groups by this.',
  },
  ams_status: {
    name: 'ams_status',
    field_type: 'enum',
    options: ['live', 'waitlist', 'none'] as const,
    envVar: 'PIPEDRIVE_FIELD_AMS_STATUS',
    purpose: 'Which branch they landed in. Filters live and spreadsheet agents out of the report.',
  },
  npn: {
    name: 'npn',
    field_type: 'varchar',
    envVar: 'PIPEDRIVE_FIELD_NPN',
    purpose: 'Ties demand to a verified producer rather than a tire-kicker.',
  },
  resident_state: {
    name: 'resident_state',
    field_type: 'enum',
    options: RESIDENT_STATES,
    envVar: 'PIPEDRIVE_FIELD_RESIDENT_STATE',
    purpose: 'From the NIPR/PDB pull at the licensing step.',
  },
  book_size_est: {
    name: 'book_size_est',
    field_type: 'double',
    envVar: 'PIPEDRIVE_FIELD_BOOK_SIZE_EST',
    purpose:
      'Vehicles represented. This is what turns the list from a signup log into a build plan — 40 agents with 200 vehicles beats 90 with 20.',
  },
  utm_content: {
    name: 'utm_content',
    field_type: 'varchar',
    envVar: 'PIPEDRIVE_FIELD_UTM_CONTENT',
    purpose: 'Which of the twenty creatives produced this demand.',
  },
} as const satisfies Record<string, PersonFieldSpec>;

export type PersonFieldName = keyof typeof PERSON_FIELDS;

export const PERSON_FIELD_NAMES = Object.keys(PERSON_FIELDS) as PersonFieldName[];

/**
 * The hashed field key for a field, or null when it has not been wired up yet.
 * Absent keys are omitted from the payload rather than failing the sync.
 */
export function personFieldKey(name: PersonFieldName): string | null {
  return process.env[PERSON_FIELDS[name].envVar] ?? null;
}

/** Which fields are wired and which are still missing. */
export function personFieldStatus(): { name: PersonFieldName; key: string | null }[] {
  return PERSON_FIELD_NAMES.map((name) => ({ name, key: personFieldKey(name) }));
}

export function dealTitle(amsName: string, agencyName: string | null): string {
  return `AMS waitlist — ${amsName} — ${agencyName ?? 'Unknown agency'}`;
}
