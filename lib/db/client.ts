// @trace FR-SHELL-01
// Singleton DB connection for the server process.
// Guard against accidental browser imports.
import type Database from 'better-sqlite3';
import path from 'node:path';
import { runMigrations } from './migrate';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (typeof window !== 'undefined') {
    throw new Error('getDb() must only be called on the server');
  }
  if (!_db) {
    const dbPath = path.resolve(process.env.DATABASE_PATH ?? './budget.db');
    if (!dbPath.endsWith('.db')) {
      throw new Error(`DATABASE_PATH must point to a .db file`);
    }
    // Dynamic require so this module can be statically imported in edge builds
    // that never actually call getDb().
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Db = require('better-sqlite3') as typeof Database;
    _db = new Db(dbPath);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    runMigrations(_db);
  }
  return _db;
}
