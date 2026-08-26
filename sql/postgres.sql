-- Vista agent onboarding — Postgres schema.
--
-- NOT YET EXERCISED. This repo ships only the SQLite adapter (src/lib/db/sqlite.ts).
-- To move to Postgres: apply this file, implement src/lib/db/types.ts#Store against
-- your driver, and run tests/store-contract.test.ts against it — the contract suite
-- is adapter-agnostic and is what proves the new adapter behaves identically.

CREATE TABLE IF NOT EXISTS agents (
  id                TEXT PRIMARY KEY,
  first_name        TEXT NOT NULL,
  last_name         TEXT NOT NULL,
  email             TEXT NOT NULL,
  agency_name       TEXT,
  npn               TEXT,
  resident_state    TEXT,
  book_size_est     INTEGER,
  ams_name          TEXT,
  ams_status        TEXT CHECK (ams_status IN ('live','waitlist','none')),
  ams_answered_at   TIMESTAMPTZ,
  email_verified_at TIMESTAMPTZ,
  utm_source        TEXT,
  utm_medium        TEXT,
  utm_campaign      TEXT,
  utm_content       TEXT,
  landing_url       TEXT,
  referrer          TEXT,
  created_at        TIMESTAMPTZ NOT NULL,
  updated_at        TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS agents_email_idx ON agents (lower(email));
CREATE INDEX IF NOT EXISTS agents_ams_idx ON agents (ams_status, ams_name);

CREATE TABLE IF NOT EXISTS verification_codes (
  id          TEXT PRIMARY KEY,
  agent_id    TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  code_hash   TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  attempts    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS verification_codes_agent_idx
  ON verification_codes (agent_id, created_at DESC);

CREATE TABLE IF NOT EXISTS jobs (
  id           TEXT PRIMARY KEY,
  kind         TEXT NOT NULL,
  payload      JSONB NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done','failed')),
  run_at       TIMESTAMPTZ NOT NULL,
  attempts     INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 8,
  last_error   TEXT,
  created_at   TIMESTAMPTZ NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS jobs_due_idx ON jobs (status, run_at);

-- One row per (agent, AMS). The composite key is what makes the Pipedrive sync
-- idempotent: re-running onboarding can never produce a second deal.
CREATE TABLE IF NOT EXISTS pipedrive_links (
  agent_id   TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  ams_name   TEXT NOT NULL,
  person_id  BIGINT,
  deal_id    BIGINT,
  state      TEXT NOT NULL DEFAULT 'open' CHECK (state IN ('open','closed')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (agent_id, ams_name)
);

-- Claim a batch of due jobs without two workers taking the same row.
-- SQLite runs single-writer so its adapter does not need this.
--
--   UPDATE jobs SET status = 'pending', attempts = attempts + 1, updated_at = now()
--   WHERE id IN (
--     SELECT id FROM jobs WHERE status = 'pending' AND run_at <= now()
--     ORDER BY run_at LIMIT $1 FOR UPDATE SKIP LOCKED
--   ) RETURNING *;
