// @trace FR-TX-01, FR-TX-02, FR-TX-03, FR-TX-04, FR-TX-05
// Deterministic seed helper for integration and smoke-flow tests.
//
// Categories seeded by 002_categories.sql (INSERT OR IGNORE, stable order):
//   id=1 Food & Drink  id=2 Transport   id=3 Housing
//   id=4 Health        id=5 Entertainment  id=6 Income  id=7 Other
//
// Transactions span May AND June 2026, mixing expense + income, USD + EUR.
// amount_cents is integer: amount_in_original_currency × 100.
//
// Idempotent: clears the transactions table before inserting so calling this
// function twice on the same database yields identical state.

import type Database from 'better-sqlite3';
import type { SqliteRepository } from '@/lib/db/adapters/sqlite';
import type { TransactionRow } from '@/lib/transactions/types';

export interface SeedResult {
  tx1: TransactionRow; // 2026-05 expense USD Food & Drink
  tx2: TransactionRow; // 2026-05 expense EUR Transport
  tx3: TransactionRow; // 2026-06 income USD Income
  tx4: TransactionRow; // 2026-06 expense USD Food & Drink
}

export function seedDemoData(
  db: InstanceType<typeof Database>,
  repo: SqliteRepository,
): SeedResult {
  // Clear without foreign_key trouble — transactions is the child table.
  db.exec('DELETE FROM transactions');

  // 2026-05-15  $12.50  USD  expense  Food & Drink
  const tx1 = repo.createTransaction({
    amount_cents: 1250,
    currency: 'USD',
    rate_to_usd: 1.0,
    date: '2026-05-15',
    category_id: 1,
    type: 'expense',
    note: 'Lunch',
  });

  // 2026-05-20  €30.00  EUR  expense  Transport
  const tx2 = repo.createTransaction({
    amount_cents: 3000,
    currency: 'EUR',
    rate_to_usd: 1.08,
    date: '2026-05-20',
    category_id: 2,
    type: 'expense',
    note: 'Train',
  });

  // 2026-06-01  $2000.00  USD  income  Income category
  const tx3 = repo.createTransaction({
    amount_cents: 200000,
    currency: 'USD',
    rate_to_usd: 1.0,
    date: '2026-06-01',
    category_id: 6,
    type: 'income',
    note: 'Salary',
  });

  // 2026-06-15  $85.00  USD  expense  Food & Drink
  const tx4 = repo.createTransaction({
    amount_cents: 8500,
    currency: 'USD',
    rate_to_usd: 1.0,
    date: '2026-06-15',
    category_id: 1,
    type: 'expense',
    note: 'Groceries',
  });

  return { tx1, tx2, tx3, tx4 };
}
