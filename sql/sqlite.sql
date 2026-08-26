-- Vista agent onboarding — SQLite schema (node:sqlite).
-- The Postgres port lives in sql/postgres.sql; keep the two in step.

CREATE TABLE IF NOT EXISTS agents (
  id              TEXT PRIMARY KEY,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  email           TEXT NOT NULL,
  agency_name     TEXT,
  npn             TEXT,
  resident_state  TEXT,
  book_size_est   INTEGER,
  ams_name        TEXT,
  ams_status      TEXT CHECK (ams_status IN ('live','waitlist','none')),
  ams_answered_at TEXT,
  email_verified_at TEXT,
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  utm_content     TEXT,
  landing_url     TEXT,
  referrer        TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS agents_email_idx ON agents (lower(email));
CREATE INDEX IF NOT EXISTS agents_ams_idx ON agents (ams_status, ams_name);

CREATE TABLE IF NOT EXISTS verification_codes (
  id          TEXT PRIMARY KEY,
  agent_id    TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  code_hash   TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  consumed_at TEXT,
  attempts    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS verification_codes_agent_idx
  ON verification_codes (agent_id, created_at DESC);

CREATE TABLE IF NOT EXISTS jobs (
  id           TEXT PRIMARY KEY,
  kind         TEXT NOT NULL,
  payload      TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done','failed')),
  run_at       TEXT NOT NULL,
  attempts     INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 8,
  last_error   TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS jobs_due_idx ON jobs (status, run_at);

-- One row per (agent, AMS). The UNIQUE key is what makes the Pipedrive sync
-- idempotent: re-running onboarding can never produce a second deal.
CREATE TABLE IF NOT EXISTS pipedrive_links (
  agent_id   TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  ams_name   TEXT NOT NULL,
  person_id  INTEGER,
  deal_id    INTEGER,
  state      TEXT NOT NULL DEFAULT 'open' CHECK (state IN ('open','closed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (agent_id, ams_name)
);
