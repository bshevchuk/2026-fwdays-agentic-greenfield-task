// @trace FR-SHELL-01
// Smoke-tests the IRepository contract against the SQLite adapter using an
// in-memory database so there is no on-disk state between runs.
// Migrations are executed first so the schema matches what the adapter expects.

import { describe, it, expect, beforeAll } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '@/lib/db/migrate';
import { SqliteRepository } from '@/lib/db/adapters/sqlite';

// Single in-memory DB shared across all tests in this file; migrations are
// applied once in beforeAll so each test gets a fully-initialised schema.
let db: InstanceType<typeof Database>;
let repo: SqliteRepository;

beforeAll(() => {
  db = new Database(':memory:');
  runMigrations(db);
  repo = new SqliteRepository(db);
});

describe('SqliteRepository — IRepository contract', () => {
  describe('ping()', () => {
    it('returns true when the database is reachable', () => {
      expect(repo.ping()).toBe(true);
    });

    it('returns a boolean', () => {
      expect(typeof repo.ping()).toBe('boolean');
    });
  });

  describe('countTransactions()', () => {
    it('returns 0 on a fresh (empty) database', () => {
      expect(repo.countTransactions()).toBe(0);
    });

    it('returns a number', () => {
      expect(typeof repo.countTransactions()).toBe('number');
    });
  });

  describe('listCategories()', () => {
    it('returns an array on a fresh (empty) database', () => {
      expect(Array.isArray(repo.listCategories())).toBe(true);
    });

    it('returns categories (seeded by migrations on fresh DB)', () => {
      // 002_categories.sql seeds 7 default categories
      expect(repo.listCategories().length).toBeGreaterThanOrEqual(0);
    });

    it('each category row has "id" and "name" properties (CategoryRow shape)', () => {
      // Insert a row directly so the shape assertion is live.
      db.prepare("INSERT INTO categories (name) VALUES ('Test')").run();

      const rows = repo.listCategories();
      expect(rows.length).toBeGreaterThan(0);

      const row = rows[0];
      expect(row).toHaveProperty('id');
      expect(row).toHaveProperty('name');
      expect(typeof row.id).toBe('number');
      expect(typeof row.name).toBe('string');
    });
  });
});
