// @trace FR-TX-01, FR-TX-06
// DB smoke-flow: verifies that 003_transactions.sql creates the correct
// transactions schema on a fresh in-memory SQLite database.
//
// Tests MUST FAIL (red) until lib/db/migrations/003_transactions.sql is
// created. Without it, runMigrations only applies 001 and 002, leaving the
// transactions table with only `id` and `amount_cents` from 001_initial.sql.
// Assertions for `currency`, `rate_to_usd`, `date`, `type`, `note`, and
// `created_at` will fail immediately; the idempotency count (expects 3 rows
// in _migrations) will also fail.

import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '@/lib/db/migrate';

// SQLite PRAGMA table_info row shape
type ColumnInfo = {
  cid: number;
  name: string;
  type: string; // SQLite type affinity string
  notnull: number; // 1 = NOT NULL, 0 = nullable
  dflt_value: string | null;
  pk: number; // 1 = part of primary key
};

function freshDb(): InstanceType<typeof Database> {
  return new Database(':memory:');
}

function getColumns(db: InstanceType<typeof Database>, table: string): ColumnInfo[] {
  return db.prepare(`PRAGMA table_info(${table})`).all() as ColumnInfo[];
}

function findColumn(cols: ColumnInfo[], name: string): ColumnInfo | undefined {
  return cols.find((c) => c.name === name);
}

describe('003_transactions.sql — transactions schema (FR-TX-01, FR-TX-06)', () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = freshDb();
    runMigrations(db);
  });

  // -------------------------------------------------------------------------
  // Table existence
  // -------------------------------------------------------------------------
  it('transactions table exists after all migrations', () => {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'")
      .get() as { name: string } | undefined;
    expect(row).toBeDefined();
    expect(row?.name).toBe('transactions');
  });

  // -------------------------------------------------------------------------
  // Column presence and constraints — each assertion fails without 003
  // -------------------------------------------------------------------------
  it('has column id as INTEGER PRIMARY KEY', () => {
    const cols = getColumns(db, 'transactions');
    const col = findColumn(cols, 'id');
    expect(col).toBeDefined();
    expect(col?.pk).toBe(1);
  });

  it('has column amount_cents as INTEGER NOT NULL', () => {
    const cols = getColumns(db, 'transactions');
    const col = findColumn(cols, 'amount_cents');
    expect(col).toBeDefined();
    expect(col?.notnull).toBe(1);
  });

  it('has column currency as TEXT NOT NULL', () => {
    const cols = getColumns(db, 'transactions');
    const col = findColumn(cols, 'currency');
    // Without 003 this column does not exist → expect(col).toBeDefined() fails
    expect(col).toBeDefined();
    expect(col?.type.toUpperCase()).toContain('TEXT');
    expect(col?.notnull).toBe(1);
  });

  it('has column rate_to_usd as REAL NOT NULL', () => {
    const cols = getColumns(db, 'transactions');
    const col = findColumn(cols, 'rate_to_usd');
    // Without 003 this column does not exist → expect(col).toBeDefined() fails
    expect(col).toBeDefined();
    expect(col?.type.toUpperCase()).toContain('REAL');
    expect(col?.notnull).toBe(1);
  });

  it('has column date as TEXT NOT NULL', () => {
    const cols = getColumns(db, 'transactions');
    const col = findColumn(cols, 'date');
    // Without 003 this column does not exist → expect(col).toBeDefined() fails
    expect(col).toBeDefined();
    expect(col?.type.toUpperCase()).toContain('TEXT');
    expect(col?.notnull).toBe(1);
  });

  it('has column category_id and it is nullable (no NOT NULL)', () => {
    const cols = getColumns(db, 'transactions');
    const col = findColumn(cols, 'category_id');
    // Without 003 this column does not exist → expect(col).toBeDefined() fails
    expect(col).toBeDefined();
    expect(col?.notnull).toBe(0);
  });

  it('has column type as TEXT NOT NULL', () => {
    const cols = getColumns(db, 'transactions');
    const typeCol = findColumn(cols, 'type'); // column named "type"
    // Without 003 this column does not exist → expect(typeCol).toBeDefined() fails
    expect(typeCol).toBeDefined();
    expect(typeCol?.type.toUpperCase()).toContain('TEXT'); // affinity
    expect(typeCol?.notnull).toBe(1);
  });

  it('has column note and it is nullable', () => {
    const cols = getColumns(db, 'transactions');
    const col = findColumn(cols, 'note');
    // Without 003 this column does not exist → expect(col).toBeDefined() fails
    expect(col).toBeDefined();
    expect(col?.notnull).toBe(0);
  });

  it('has column created_at with a non-null default value', () => {
    const cols = getColumns(db, 'transactions');
    const col = findColumn(cols, 'created_at');
    // Without 003 this column does not exist → expect(col).toBeDefined() fails
    expect(col).toBeDefined();
    expect(col?.dflt_value).not.toBeNull();
  });

  // -------------------------------------------------------------------------
  // CHECK constraint: type must be 'expense' or 'income'
  // -------------------------------------------------------------------------
  it("CHECK constraint: inserting type='invalid' throws", () => {
    // Without 003, there is no `type` column → INSERT with the column list fails,
    // which also causes this test to fail (for the wrong reason until 003 exists).
    expect(() => {
      db.prepare(
        `INSERT INTO transactions
         (amount_cents, currency, rate_to_usd, date, category_id, type)
         VALUES (1000, 'USD', 1.0, '2026-06-01', NULL, 'invalid')`,
      ).run();
    }).toThrow();
  });

  it("CHECK constraint: inserting type='expense' succeeds", () => {
    expect(() => {
      db.prepare(
        `INSERT INTO transactions
         (amount_cents, currency, rate_to_usd, date, category_id, type)
         VALUES (1000, 'USD', 1.0, '2026-06-01', NULL, 'expense')`,
      ).run();
    }).not.toThrow();
  });

  it("CHECK constraint: inserting type='income' succeeds", () => {
    expect(() => {
      db.prepare(
        `INSERT INTO transactions
         (amount_cents, currency, rate_to_usd, date, category_id, type)
         VALUES (2000, 'EUR', 1.08, '2026-06-01', NULL, 'income')`,
      ).run();
    }).not.toThrow();
  });

  // -------------------------------------------------------------------------
  // Nullable fields: category_id and note can both be NULL
  // -------------------------------------------------------------------------
  it('allows INSERT with category_id=NULL and note=NULL', () => {
    expect(() => {
      db.prepare(
        `INSERT INTO transactions
         (amount_cents, currency, rate_to_usd, date, category_id, type, note)
         VALUES (500, 'USD', 1.0, '2026-06-10', NULL, 'expense', NULL)`,
      ).run();
    }).not.toThrow();
  });

  // -------------------------------------------------------------------------
  // FK constraint: category_id REFERENCES categories(id)
  // -------------------------------------------------------------------------
  it('FK constraint: INSERT with a non-existent category_id throws when FK enforcement is on', () => {
    db.pragma('foreign_keys = ON');
    expect(() => {
      db.prepare(
        `INSERT INTO transactions
         (amount_cents, currency, rate_to_usd, date, category_id, type)
         VALUES (1000, 'USD', 1.0, '2026-06-01', 9999, 'expense')`,
      ).run();
    }).toThrow();
  });

  it('FK constraint: INSERT with an existing category_id succeeds when FK enforcement is on', () => {
    db.pragma('foreign_keys = ON');
    // categories table was seeded by 002_categories.sql; id=1 exists
    const catId = (
      db
        .prepare(
          "INSERT INTO categories (name, icon, color) VALUES ('TestCat', 'tag', '#123456')",
        )
        .run() as { lastInsertRowid: number }
    ).lastInsertRowid;

    expect(() => {
      db.prepare(
        `INSERT INTO transactions
         (amount_cents, currency, rate_to_usd, date, category_id, type)
         VALUES (1000, 'USD', 1.0, '2026-06-01', ?, 'expense')`,
      ).run(catId);
    }).not.toThrow();
  });

  // -------------------------------------------------------------------------
  // Idempotency: running migrations twice still leaves exactly 3 rows in
  // _migrations (001, 002, 003). Without 003 this asserts 3 but finds 2 → FAIL.
  // -------------------------------------------------------------------------
  it('is idempotent — running migrations twice leaves exactly 3 rows in _migrations', () => {
    runMigrations(db); // second run
    const row = db
      .prepare('SELECT COUNT(*) AS n FROM _migrations')
      .get() as { n: number };
    expect(row.n).toBe(3);
  });

  // -------------------------------------------------------------------------
  // Empty table after fresh migration
  // -------------------------------------------------------------------------
  it('transactions table is empty immediately after migration', () => {
    const row = db
      .prepare('SELECT COUNT(*) AS n FROM transactions')
      .get() as { n: number };
    expect(row.n).toBe(0);
  });
});
