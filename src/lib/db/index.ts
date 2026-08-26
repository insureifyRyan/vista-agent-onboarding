import { SqliteStore } from './sqlite';
import type { Store } from './types';

export type { Store } from './types';

let singleton: Store | null = null;

/**
 * The app's store.
 *
 * `DATABASE_FILE` defaults to a file under ./data so a local dev server keeps its
 * agents between restarts. On a serverless host the filesystem is ephemeral —
 * point this at a mounted volume, or implement the Store interface against
 * Postgres (see sql/postgres.sql) before going to production.
 */
export function getStore(): Store {
  if (!singleton) {
    singleton = new SqliteStore(process.env.DATABASE_FILE ?? 'data/onboarding.sqlite');
  }
  return singleton;
}

/** Test seam. */
export function setStore(store: Store | null): void {
  singleton = store;
}
