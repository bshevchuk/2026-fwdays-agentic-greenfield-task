// @trace FR-SHELL-01
// Migration runner — creates _migrations tracking table, applies 001_initial.sql,
// and is idempotent on subsequent runs.

import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '@/lib/db/migrate';

function freshDb(): InstanceType<typeof Database> {
  return new Database(':memory:');
}

function tableExists(db: InstanceType<typeof Database>, tableName: string): boolean {
  const row = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    )
    .get(tableName) as { name: string } | undefined;
  return row !== undefined;
}

describe('runMigrations', () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = freshDb();
  });

  it('creates the _migrations tracking table on first run', () => {
    runMigrations(db);
    expect(tableExists(db, '_migrations')).toBe(true);
  });

  it('applies 001_initial.sql — categories table is created', () => {
    runMigrations(db);
    expect(tableExists(db, 'categories')).toBe(true);
  });

  it('applies 001_initial.sql — transactions table is created', () => {
    runMigrations(db);
    expect(tableExists(db, 'transactions')).toBe(true);
  });

  it('records exactly one row in _migrations after first run', () => {
    runMigrations(db);
    const count = (
      db.prepare('SELECT COUNT(*) AS n FROM _migrations').get() as { n: number }
    ).n;
    expect(count).toBe(1);
  });

  it('is idempotent — second call does not add a duplicate migration row', () => {
    runMigrations(db);
    runMigrations(db);

    const count = (
      db.prepare('SELECT COUNT(*) AS n FROM _migrations').get() as { n: number }
    ).n;
    // Still exactly one row: 001_initial.sql was not applied twice
    expect(count).toBe(1);
  });

  it('is idempotent — second call does not throw', () => {
    runMigrations(db);
    expect(() => runMigrations(db)).not.toThrow();
  });

  it('records the filename of the applied migration', () => {
    runMigrations(db);
    const row = db
      .prepare('SELECT filename FROM _migrations LIMIT 1')
      .get() as { filename: string } | undefined;
    expect(row?.filename).toBe('001_initial.sql');
  });
});
