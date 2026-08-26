/**
 * Pipedrive wiring.
 *
 * The pipeline and stages are created once, by hand or by scripts/pipedrive-setup.mts:
 *
 *   Pipeline: "AMS integrations"
 *   Stages:   Waitlisted → Build scheduled → In development → Ready to activate → Activated
 *
 * Custom fields live on Person and are addressed by Pipedrive's hashed field keys,
 * which differ per account — so they come from the environment rather than being
 * hard-coded. `scripts/pipedrive-setup.mts` prints the keys it creates.
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

/** Person custom fields, by the name they were created with. */
export const PERSON_FIELDS = {
  ams_name: { name: 'ams_name', field_type: 'enum' },
  ams_status: { name: 'ams_status', field_type: 'enum' },
  npn: { name: 'npn', field_type: 'varchar' },
  resident_state: { name: 'resident_state', field_type: 'enum' },
  book_size_est: { name: 'book_size_est', field_type: 'double' },
  utm_content: { name: 'utm_content', field_type: 'varchar' },
} as const;

export type PersonFieldName = keyof typeof PERSON_FIELDS;

/**
 * Hashed field keys, e.g. PIPEDRIVE_FIELD_AMS_NAME=8d2b1f...
 * Absent keys are simply omitted from the payload rather than failing the sync —
 * a missing custom field must never cost us the waitlist record itself.
 */
export function personFieldKey(name: PersonFieldName): string | null {
  return process.env[`PIPEDRIVE_FIELD_${name.toUpperCase()}`] ?? null;
}

export function dealTitle(amsName: string, agencyName: string | null): string {
  return `AMS waitlist — ${amsName} — ${agencyName ?? 'Unknown agency'}`;
}
