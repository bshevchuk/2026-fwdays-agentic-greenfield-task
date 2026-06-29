// @trace FR-TX-01, FR-TX-02, FR-TX-03, FR-TX-04, FR-TX-05, FR-BUDGET-05, FR-CHART-01, FR-CHART-02
// Cross-slice integration tests — real in-memory SQLite, real migrations.
//
// Each test gets a fresh :memory: database with all migrations applied so
// there is no shared state between cases.  The seed helper is called per-test
// where a multi-row dataset is needed; single-row setups are inlined.
//
// Day-bound assertions use hardcoded LOCAL-format strings (YYYY-MM-DD) as
// required by the correctness rules — never toISOString().slice(0,10).

import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '@/lib/db/migrate';
import { SqliteRepository } from '@/lib/db/adapters/sqlite';
import { seedDemoData } from '../helpers/seed-demo-data';
import { budgetStatus } from '@/lib/budget/status';
import { aggregateDonut, aggregateBar } from '@/lib/charts/aggregate';
import { deleteCategory } from '@/lib/categories/service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function freshDb() {
  const db = new Database(':memory:');
  runMigrations(db);
  return db;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('cross-slice business flow integration (real SQLite)', () => {
  let db: InstanceType<typeof Database>;
  let repo: SqliteRepository;

  beforeEach(() => {
    db = freshDb();
    repo = new SqliteRepository(db);
  });

  // -------------------------------------------------------------------------
  // 1. Create + list transaction round-trip (FR-TX-01, FR-TX-05)
  // -------------------------------------------------------------------------
  it('create + list transaction round-trip — all fields survive persistence', () => {
    const created = repo.createTransaction({
      amount_cents: 1250,
      currency: 'USD',
      rate_to_usd: 1.0,
      date: '2026-06-10',
      category_id: 1,
      type: 'expense',
      note: 'Lunch',
    });

    const all = repo.listAllTransactions({});

    expect(all).toHaveLength(1);
    const row = all[0];
    expect(row.id).toBe(created.id);
    expect(row.amount_cents).toBe(1250);
    expect(row.currency).toBe('USD');
    expect(row.rate_to_usd).toBe(1.0);
    expect(row.date).toBe('2026-06-10');
    expect(row.category_id).toBe(1);
    expect(row.type).toBe('expense');
    expect(row.note).toBe('Lunch');
  });

  // -------------------------------------------------------------------------
  // 2. Update transaction — rate_to_usd is immutable (KD-4)  (FR-TX-03)
  // -------------------------------------------------------------------------
  it('update transaction note — rate_to_usd stays immutable (KD-4)', () => {
    const created = repo.createTransaction({
      amount_cents: 1000,
      currency: 'EUR',
      rate_to_usd: 1.08,
      date: '2026-06-01',
      category_id: 2,
      type: 'expense',
      note: 'Original note',
    });

    // UpdateTransactionInput intentionally has no rate_to_usd field (KD-4).
    const updated = repo.updateTransaction(created.id, { note: 'Updated note' });

    expect(updated).toBeDefined();
    // Rate must be unchanged — immutable after creation
    expect(updated!.rate_to_usd).toBe(1.08);
    expect(updated!.note).toBe('Updated note');
    // Everything else untouched
    expect(updated!.amount_cents).toBe(1000);
    expect(updated!.currency).toBe('EUR');
  });

  // -------------------------------------------------------------------------
  // 3. Delete transaction (FR-TX-04)
  // -------------------------------------------------------------------------
  it('delete transaction removes it from the list', () => {
    const created = repo.createTransaction({
      amount_cents: 500,
      currency: 'USD',
      rate_to_usd: 1.0,
      date: '2026-06-15',
      category_id: null,
      type: 'expense',
      note: null,
    });

    const deleted = repo.deleteTransaction(created.id);
    expect(deleted).toBe(true);

    const all = repo.listAllTransactions({});
    expect(all).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // 4. listTransactions month filter (FR-TX-05)
  // -------------------------------------------------------------------------
  it('listTransactions month filter returns only the requested calendar month', () => {
    // May row
    repo.createTransaction({
      amount_cents: 1000,
      currency: 'USD',
      rate_to_usd: 1.0,
      date: '2026-05-15',
      category_id: 1,
      type: 'expense',
      note: 'May expense',
    });
    // June row
    repo.createTransaction({
      amount_cents: 2000,
      currency: 'USD',
      rate_to_usd: 1.0,
      date: '2026-06-10',
      category_id: 1,
      type: 'expense',
      note: 'June expense',
    });

    const juneRows = repo.listAllTransactions({ month: '2026-06' });

    expect(juneRows).toHaveLength(1);
    expect(juneRows[0].date.startsWith('2026-06')).toBe(true);
    expect(juneRows[0].note).toBe('June expense');
  });

  // -------------------------------------------------------------------------
  // 5. listTransactions type filter (FR-TX-05)
  // -------------------------------------------------------------------------
  it('listTransactions type=expense returns only expense rows', () => {
    repo.createTransaction({
      amount_cents: 1000,
      currency: 'USD',
      rate_to_usd: 1.0,
      date: '2026-06-01',
      category_id: 1,
      type: 'expense',
      note: 'food',
    });
    repo.createTransaction({
      amount_cents: 200000,
      currency: 'USD',
      rate_to_usd: 1.0,
      date: '2026-06-15',
      category_id: 6,
      type: 'income',
      note: 'salary',
    });

    const expenses = repo.listAllTransactions({ type: 'expense' });

    expect(expenses).toHaveLength(1);
    expect(expenses[0].type).toBe('expense');
    expect(expenses[0].note).toBe('food');
  });

  // -------------------------------------------------------------------------
  // 6. countTransactions (FR-TX-05)
  // -------------------------------------------------------------------------
  it('countTransactions returns correct total after insertions', () => {
    expect(repo.countTransactions()).toBe(0);

    repo.createTransaction({ amount_cents: 100, currency: 'USD', rate_to_usd: 1.0, date: '2026-06-01', category_id: null, type: 'expense', note: null });
    repo.createTransaction({ amount_cents: 200, currency: 'USD', rate_to_usd: 1.0, date: '2026-06-02', category_id: null, type: 'expense', note: null });
    repo.createTransaction({ amount_cents: 300, currency: 'USD', rate_to_usd: 1.0, date: '2026-06-03', category_id: null, type: 'income', note: null });

    expect(repo.countTransactions()).toBe(3);
  });

  // -------------------------------------------------------------------------
  // 7. budgetStatus integration (FR-BUDGET-05)
  // -------------------------------------------------------------------------
  it('budgetStatus computes spent, ratio and status from persisted transactions', () => {
    // $30 + $20 = $50 total for Food & Drink in June
    repo.createTransaction({ amount_cents: 3000, currency: 'USD', rate_to_usd: 1.0, date: '2026-06-01', category_id: 1, type: 'expense', note: 'Groceries' });
    repo.createTransaction({ amount_cents: 2000, currency: 'USD', rate_to_usd: 1.0, date: '2026-06-15', category_id: 1, type: 'expense', note: 'Dinner' });
    // Income row in same category — budgetStatus must ignore it
    repo.createTransaction({ amount_cents: 100000, currency: 'USD', rate_to_usd: 1.0, date: '2026-06-20', category_id: 1, type: 'income', note: 'Refund' });

    const rows = repo.listAllTransactions({ category_id: 1, month: '2026-06' });
    const rates: Record<string, number> = { USD: 1.0 };
    const result = budgetStatus(rows, 100, 'USD', rates);

    // spent = 30 + 20 = 50; ratio = 0.5; status = 'ok' (below 80%)
    expect(result.spent).toBeCloseTo(50, 5);
    expect(result.ratio).toBeCloseTo(0.5, 5);
    expect(result.status).toBe('ok');
  });

  it('budgetStatus returns status=warning when spent is between 80-100% of limit', () => {
    // $85 against a $100 limit → 85% → warning
    repo.createTransaction({ amount_cents: 8500, currency: 'USD', rate_to_usd: 1.0, date: '2026-06-10', category_id: 1, type: 'expense', note: 'Big shop' });

    const rows = repo.listAllTransactions({ category_id: 1, month: '2026-06' });
    const rates: Record<string, number> = { USD: 1.0 };
    const result = budgetStatus(rows, 100, 'USD', rates);

    expect(result.spent).toBeCloseTo(85, 5);
    expect(result.status).toBe('warning');
  });

  it('budgetStatus returns status=over when spent exceeds limit', () => {
    // $120 against a $100 limit → over
    repo.createTransaction({ amount_cents: 12000, currency: 'USD', rate_to_usd: 1.0, date: '2026-06-05', category_id: 1, type: 'expense', note: 'Overspend' });

    const rows = repo.listAllTransactions({ category_id: 1, month: '2026-06' });
    const rates: Record<string, number> = { USD: 1.0 };
    const result = budgetStatus(rows, 100, 'USD', rates);

    expect(result.spent).toBeCloseTo(120, 5);
    expect(result.status).toBe('over');
  });

  // -------------------------------------------------------------------------
  // 8. aggregateDonut integration (FR-CHART-01)
  // -------------------------------------------------------------------------
  it('aggregateDonut returns correct slices and percentages from persisted data', () => {
    // $50 Food & Drink, $30 Transport, $2000 income (must NOT appear)
    repo.createTransaction({ amount_cents: 5000, currency: 'USD', rate_to_usd: 1.0, date: '2026-06-01', category_id: 1, type: 'expense', note: 'Food' });
    repo.createTransaction({ amount_cents: 3000, currency: 'USD', rate_to_usd: 1.0, date: '2026-06-10', category_id: 2, type: 'expense', note: 'Train' });
    repo.createTransaction({ amount_cents: 200000, currency: 'USD', rate_to_usd: 1.0, date: '2026-06-15', category_id: 6, type: 'income', note: 'Salary' });

    const rows = repo.listAllTransactions({});
    const categories = repo.listCategories();
    const slices = aggregateDonut(rows, categories, 'USD');

    // Income is excluded — only 2 expense categories
    expect(slices).toHaveLength(2);
    // Sorted descending by value: Food ($50) first
    expect(slices[0].value).toBeCloseTo(50, 5);
    expect(slices[0].categoryId).toBe(1);
    expect(slices[1].value).toBeCloseTo(30, 5);
    expect(slices[1].categoryId).toBe(2);
    // Percentages must sum to 100 (total expenses = $80)
    const percentSum = slices.reduce((s, sl) => s + sl.percent, 0);
    expect(percentSum).toBeCloseTo(100, 4);
    expect(slices[0].percent).toBeCloseTo(62.5, 2);
    expect(slices[1].percent).toBeCloseTo(37.5, 2);
  });

  // -------------------------------------------------------------------------
  // 9. aggregateBar integration (FR-CHART-02)
  // -------------------------------------------------------------------------
  it('aggregateBar returns correct monthly expense and income totals', () => {
    // May: $50 expense
    repo.createTransaction({ amount_cents: 5000, currency: 'USD', rate_to_usd: 1.0, date: '2026-05-20', category_id: 1, type: 'expense', note: 'May expense' });
    // June: $2000 income + $85 expense
    repo.createTransaction({ amount_cents: 200000, currency: 'USD', rate_to_usd: 1.0, date: '2026-06-01', category_id: 6, type: 'income', note: 'Salary' });
    repo.createTransaction({ amount_cents: 8500, currency: 'USD', rate_to_usd: 1.0, date: '2026-06-15', category_id: 1, type: 'expense', note: 'Groceries' });

    const rows = repo.listAllTransactions({});
    const bars = aggregateBar(rows, ['2026-05', '2026-06'], 'USD');

    expect(bars).toHaveLength(2);

    const mayBar = bars.find((b) => b.monthKey === '2026-05');
    const junBar = bars.find((b) => b.monthKey === '2026-06');

    expect(mayBar).toBeDefined();
    expect(mayBar!.expense).toBeCloseTo(50, 5);
    expect(mayBar!.income).toBeCloseTo(0, 5);
    expect(mayBar!.month).toBe('May 2026');

    expect(junBar).toBeDefined();
    expect(junBar!.expense).toBeCloseTo(85, 5);
    expect(junBar!.income).toBeCloseTo(2000, 5);
    expect(junBar!.month).toBe('Jun 2026');
  });

  // -------------------------------------------------------------------------
  // 10. Delete category blocked when it has transactions (FR-CAT-03)
  // -------------------------------------------------------------------------
  it('deleteCategory returns HAS_TRANSACTIONS when category has linked rows', () => {
    // Insert a transaction referencing category 1 (Food & Drink)
    repo.createTransaction({
      amount_cents: 1000,
      currency: 'USD',
      rate_to_usd: 1.0,
      date: '2026-06-01',
      category_id: 1,
      type: 'expense',
      note: null,
    });

    const result = deleteCategory(repo, 1);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('HAS_TRANSACTIONS');
    }
  });

  it('deleteCategory succeeds when category has no transactions', () => {
    // category 3 (Housing) — no transactions seeded
    const result = deleteCategory(repo, 3);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.deleted).toBe(true);
    }
  });

  // -------------------------------------------------------------------------
  // 11. seedDemoData helper — idempotency and shape  (cross-cutting)
  // -------------------------------------------------------------------------
  it('seedDemoData is idempotent — calling twice yields the same 4 transactions', () => {
    seedDemoData(db, repo);
    seedDemoData(db, repo); // second call must clear and re-insert

    const all = repo.listAllTransactions({});
    expect(all).toHaveLength(4);
  });

  it('seedDemoData spans May and June 2026', () => {
    seedDemoData(db, repo);

    const may = repo.listAllTransactions({ month: '2026-05' });
    const jun = repo.listAllTransactions({ month: '2026-06' });

    expect(may.length).toBeGreaterThanOrEqual(1);
    expect(jun.length).toBeGreaterThanOrEqual(1);
  });

  it('seedDemoData inserts both expense and income rows', () => {
    seedDemoData(db, repo);

    const expenses = repo.listAllTransactions({ type: 'expense' });
    const incomes = repo.listAllTransactions({ type: 'income' });

    expect(expenses.length).toBeGreaterThanOrEqual(1);
    expect(incomes.length).toBeGreaterThanOrEqual(1);
  });
});
