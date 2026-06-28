// @trace FR-CAT-04
// DB smoke-flow: verifies that 002_categories.sql seeds exactly 7 default
// categories on a fresh database and that re-running migrations is idempotent.
//
// These tests MUST FAIL (red) until lib/db/migrations/002_categories.sql is
// created. Without it, runMigrations applies only 001_initial.sql — the
// categories table will have 0 rows and no icon/color columns.

import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '@/lib/db/migrate';

function freshDb(): InstanceType<typeof Database> {
  return new Database(':memory:');
}

describe('002_categories.sql — default seed (FR-CAT-04)', () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = freshDb();
  });

  // -------------------------------------------------------------------------
  // Row count
  // -------------------------------------------------------------------------
  it('seeds exactly 7 categories on first run', () => {
    runMigrations(db);
    const row = db.prepare('SELECT COUNT(*) AS n FROM categories').get() as { n: number };
    expect(row.n).toBe(7);
  });

  it('still has exactly 7 categories after running migrations a second time (idempotent)', () => {
    runMigrations(db);
    runMigrations(db);
    const row = db.prepare('SELECT COUNT(*) AS n FROM categories').get() as { n: number };
    expect(row.n).toBe(7);
  });

  // -------------------------------------------------------------------------
  // Column presence and non-null icon
  // -------------------------------------------------------------------------
  it('each seeded category has a non-null, non-empty icon string', () => {
    runMigrations(db);
    const rows = db
      .prepare('SELECT icon FROM categories')
      .all() as Array<{ icon: string | null }>;
    expect(rows).toHaveLength(7);
    for (const row of rows) {
      expect(row.icon).not.toBeNull();
      expect(typeof row.icon).toBe('string');
      expect((row.icon as string).length).toBeGreaterThan(0);
    }
  });

  // -------------------------------------------------------------------------
  // Color format
  // -------------------------------------------------------------------------
  it('each seeded category has a valid 6-digit hex color matching /^#[0-9a-fA-F]{6}$/', () => {
    runMigrations(db);
    const rows = db
      .prepare('SELECT color FROM categories')
      .all() as Array<{ color: string | null }>;
    expect(rows).toHaveLength(7);
    const hexPattern = /^#[0-9a-fA-F]{6}$/;
    for (const row of rows) {
      expect(row.color).not.toBeNull();
      expect(hexPattern.test(row.color as string)).toBe(true);
    }
  });

  // -------------------------------------------------------------------------
  // Expected category names (from spec: FR-CAT-04)
  // -------------------------------------------------------------------------
  it('seeds all 7 expected category names', () => {
    runMigrations(db);
    const rows = db
      .prepare('SELECT name FROM categories ORDER BY name')
      .all() as Array<{ name: string }>;
    const names = rows.map((r) => r.name);

    expect(names).toHaveLength(7);
    expect(names).toEqual(
      expect.arrayContaining([
        'Entertainment',
        'Food & Drink',
        'Health',
        'Housing',
        'Income',
        'Other',
        'Transport',
      ]),
    );
  });

  // -------------------------------------------------------------------------
  // Migration tracking
  // -------------------------------------------------------------------------
  it('records exactly 2 entries in _migrations after both sql files are applied', () => {
    runMigrations(db);
    const row = db
      .prepare('SELECT COUNT(*) AS n FROM _migrations')
      .get() as { n: number };
    expect(row.n).toBe(2);
  });

  it('the second migration file is recorded as "002_categories.sql"', () => {
    runMigrations(db);
    const rows = db
      .prepare('SELECT filename FROM _migrations ORDER BY filename')
      .all() as Array<{ filename: string }>;
    expect(rows.map((r) => r.filename)).toContain('002_categories.sql');
  });

  // -------------------------------------------------------------------------
  // Specific seed values — spot-check two rows from the spec
  // -------------------------------------------------------------------------
  it('Food & Drink is seeded with icon "utensils" and color "#ef4444"', () => {
    runMigrations(db);
    const row = db
      .prepare('SELECT icon, color FROM categories WHERE name = ?')
      .get('Food & Drink') as { icon: string; color: string } | undefined;
    expect(row).toBeDefined();
    expect(row?.icon).toBe('utensils');
    expect(row?.color).toBe('#ef4444');
  });

  it('Transport is seeded with icon "car" and color "#3b82f6"', () => {
    runMigrations(db);
    const row = db
      .prepare('SELECT icon, color FROM categories WHERE name = ?')
      .get('Transport') as { icon: string; color: string } | undefined;
    expect(row).toBeDefined();
    expect(row?.icon).toBe('car');
    expect(row?.color).toBe('#3b82f6');
  });
});
