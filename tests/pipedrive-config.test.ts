import { afterEach, describe, expect, it } from 'vitest';
import { AMS_OPTIONS } from '@/lib/ams/catalog';
import {
  PERSON_FIELDS,
  PERSON_FIELD_NAMES,
  PIPELINE_NAME,
  STAGES,
  dealTitle,
  personFieldKey,
  personFieldStatus,
} from '@/lib/pipedrive/config';

const ENV_KEYS = PERSON_FIELD_NAMES.map((name) => PERSON_FIELDS[name].envVar);

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});

describe('the pipeline contract', () => {
  it('names the pipeline and its five stages in order', () => {
    expect(PIPELINE_NAME).toBe('AMS integrations');
    expect(STAGES).toEqual([
      'Waitlisted',
      'Build scheduled',
      'In development',
      'Ready to activate',
      'Activated',
    ]);
  });
});

describe('the Person custom fields', () => {
  it('specifies the six fields the waitlist needs', () => {
    expect(PERSON_FIELD_NAMES).toEqual([
      'ams_name',
      'ams_status',
      'npn',
      'resident_state',
      'book_size_est',
      'utm_content',
    ]);
  });

  it('gives every field a Pipedrive-createable type and an env var', () => {
    for (const name of PERSON_FIELD_NAMES) {
      const spec = PERSON_FIELDS[name];
      expect(spec.name).toBe(name);
      expect(['enum', 'varchar', 'double']).toContain(spec.field_type);
      expect(spec.envVar).toMatch(/^PIPEDRIVE_FIELD_[A-Z_]+$/);
      expect(spec.purpose.length).toBeGreaterThan(0);
    }
  });

  it('offers exactly the selector options for ams_name, so the two cannot drift', () => {
    expect(PERSON_FIELDS.ams_name.options).toEqual(AMS_OPTIONS);
  });

  it('offers the three derived statuses for ams_status', () => {
    expect(PERSON_FIELDS.ams_status.options).toEqual(['live', 'waitlist', 'none']);
  });

  it('leaves California out of resident_state — the product is not sold there', () => {
    expect(PERSON_FIELDS.resident_state.options).not.toContain('CA');
    expect(PERSON_FIELDS.resident_state.options).toContain('AZ');
  });

  it('counts book size as a number, so the report can sum it', () => {
    expect(PERSON_FIELDS.book_size_est.field_type).toBe('double');
  });
});

describe('wiring', () => {
  it('reports a field as unwired when its env var is unset', () => {
    expect(personFieldKey('ams_name')).toBeNull();
    expect(personFieldStatus().every((field) => field.key === null)).toBe(true);
  });

  it('picks up a hashed key once it is set', () => {
    process.env.PIPEDRIVE_FIELD_AMS_NAME = 'deadbeef';
    expect(personFieldKey('ams_name')).toBe('deadbeef');
    expect(personFieldStatus().filter((field) => field.key !== null)).toHaveLength(1);
  });
});

describe('deal titles', () => {
  it('names the platform and the agency', () => {
    expect(dealTitle('Jenesis', 'Reyes Insurance')).toBe('AMS waitlist — Jenesis — Reyes Insurance');
  });

  it('says so plainly when the agency is not known yet', () => {
    // Step 1 collects name and email only; agency arrives at the licensing step.
    expect(dealTitle('NowCerts', null)).toBe('AMS waitlist — NowCerts — Unknown agency');
  });
});
