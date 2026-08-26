/**
 * One-time Pipedrive setup.
 *
 *   PIPEDRIVE_API_TOKEN=... node --experimental-strip-types scripts/pipedrive-setup.ts
 *
 * Creates the "AMS integrations" pipeline with its five stages and the Person
 * custom fields, then prints the environment variables to copy into .env.
 *
 * Safe to re-run: it reuses anything already present rather than duplicating it.
 * Pass --dry-run to see what it would do without writing to your account.
 */
import { AMS_OPTIONS } from '../src/lib/ams/catalog.ts';
import { PERSON_FIELDS, PIPELINE_NAME, STAGES, type PersonFieldName } from '../src/lib/pipedrive/config.ts';

const TOKEN = process.env.PIPEDRIVE_API_TOKEN;
const BASE = process.env.PIPEDRIVE_BASE_URL ?? 'https://api.pipedrive.com';
const DRY_RUN = process.argv.includes('--dry-run');

if (!TOKEN) {
  console.error('Set PIPEDRIVE_API_TOKEN first.');
  process.exit(1);
}

const US_STATES = [
  'AL','AK','AZ','AR','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI',
  'SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
  // California is deliberately absent: the product is not available there.
];

async function api<T>(method: string, path: string, body?: unknown, query: Record<string, string> = {}): Promise<T> {
  const url = new URL(path, BASE);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);

  const response = await fetch(url.toString(), {
    method,
    headers: { 'x-api-token': TOKEN!, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    throw new Error(`${method} ${path} -> ${response.status} ${await response.text().catch(() => '')}`);
  }
  return ((await response.json()) as { data: T }).data;
}

function enumOptions(name: PersonFieldName): { label: string }[] | undefined {
  if (name === 'ams_name') return AMS_OPTIONS.map((label) => ({ label }));
  if (name === 'ams_status') return ['live', 'waitlist', 'none'].map((label) => ({ label }));
  if (name === 'resident_state') return US_STATES.map((label) => ({ label }));
  return undefined;
}

async function ensurePipeline(): Promise<number> {
  const pipelines = await api<{ id: number; name: string }[]>('GET', '/api/v2/pipelines', undefined, { limit: '100' });
  const existing = pipelines?.find((pipeline) => pipeline.name === PIPELINE_NAME);
  if (existing) {
    console.log(`pipeline "${PIPELINE_NAME}" already exists (id ${existing.id})`);
    return existing.id;
  }
  if (DRY_RUN) {
    console.log(`would create pipeline "${PIPELINE_NAME}"`);
    return -1;
  }
  const created = await api<{ id: number }>('POST', '/api/v2/pipelines', { name: PIPELINE_NAME });
  console.log(`created pipeline "${PIPELINE_NAME}" (id ${created.id})`);
  return created.id;
}

async function ensureStages(pipelineId: number): Promise<void> {
  const existing =
    pipelineId === -1
      ? []
      : await api<{ id: number; name: string }[]>('GET', '/api/v2/stages', undefined, {
          pipeline_id: String(pipelineId),
          limit: '100',
        });

  for (const [index, name] of STAGES.entries()) {
    if (existing?.some((stage) => stage.name === name)) {
      console.log(`  stage "${name}" already exists`);
      continue;
    }
    if (DRY_RUN) {
      console.log(`  would create stage "${name}"`);
      continue;
    }
    await api('POST', '/api/v2/stages', { name, pipeline_id: pipelineId, order_nr: index + 1 });
    console.log(`  created stage "${name}"`);
  }
}

async function ensurePersonFields(): Promise<Record<string, string>> {
  const existing = await api<{ key: string; name: string }[]>('GET', '/v1/personFields', undefined, { limit: '500' });
  const env: Record<string, string> = {};

  for (const [name, spec] of Object.entries(PERSON_FIELDS)) {
    const already = existing?.find((field) => field.name === spec.name);
    if (already) {
      console.log(`  field "${name}" already exists (${already.key})`);
      env[`PIPEDRIVE_FIELD_${name.toUpperCase()}`] = already.key;
      continue;
    }
    if (DRY_RUN) {
      console.log(`  would create field "${name}" (${spec.field_type})`);
      continue;
    }
    const created = await api<{ key: string }>('POST', '/v1/personFields', {
      name: spec.name,
      field_type: spec.field_type,
      options: enumOptions(name as PersonFieldName),
    });
    console.log(`  created field "${name}" (${created.key})`);
    env[`PIPEDRIVE_FIELD_${name.toUpperCase()}`] = created.key;
  }

  return env;
}

const pipelineId = await ensurePipeline();
await ensureStages(pipelineId);
console.log('person fields:');
const env = await ensurePersonFields();

console.log('\nAdd to .env:\n');
if (pipelineId !== -1) console.log(`PIPEDRIVE_PIPELINE_ID=${pipelineId}`);
for (const [key, value] of Object.entries(env)) console.log(`${key}=${value}`);
