/**
 * Print the Person custom fields this app expects, and which are wired up.
 *
 *   node --experimental-strip-types scripts/pipedrive-fields.mts
 *
 * Needs no network and no API token — it reads the field spec from
 * src/lib/pipedrive/config.ts and checks your environment for the hashed keys.
 * Run it after creating the fields in Pipedrive to confirm the wiring.
 */
import { PERSON_FIELDS, PERSON_FIELD_NAMES, personFieldKey } from '../src/lib/pipedrive/config.ts';

const MAX_INLINE_OPTIONS = 6;

console.log('Person custom fields — create these in Pipedrive:');
console.log('  Settings → Company settings → Data fields → Person → Add custom field\n');

let wired = 0;

for (const name of PERSON_FIELD_NAMES) {
  const spec = PERSON_FIELDS[name];
  const key = personFieldKey(name);
  if (key) wired += 1;

  console.log(`${key ? '[wired]  ' : '[missing]'} ${spec.name}  (${spec.field_type})`);
  console.log(`           ${spec.purpose}`);
  console.log(`           env: ${spec.envVar}${key ? ` = ${key}` : ' — not set'}`);

  if ('options' in spec) {
    const options = spec.options as readonly string[];
    const shown = options.slice(0, MAX_INLINE_OPTIONS).join(', ');
    const rest = options.length > MAX_INLINE_OPTIONS ? `, … (${options.length} total)` : '';
    console.log(`           options: ${shown}${rest}`);
  }
  console.log();
}

console.log(`${wired}/${PERSON_FIELD_NAMES.length} wired.`);

if (wired < PERSON_FIELD_NAMES.length) {
  console.log(
    '\nUntil all six are wired the sync still runs — it omits the unset fields rather\n' +
      'than failing — but the demand report needs ams_name and book_size_est as\n' +
      'structured values, so it cannot be built from Pipedrive yet.',
  );
}
