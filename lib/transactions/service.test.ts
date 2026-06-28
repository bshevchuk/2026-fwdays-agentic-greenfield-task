// @trace FR-TX-01, FR-TX-02, FR-TX-03, FR-TX-04, FR-TX-05, FR-TX-06, FR-TX-07
// Service-layer unit tests for transaction CRUD and list operations.
// Uses an inline stub implementing IRepository — no real SQLite involved.
// All tests MUST FAIL (red) until lib/transactions/service.ts is created —
// the module does not exist yet, so every import below will produce
// "Cannot find module '@/lib/transactions/service'".

import { describe, it, expect } from 'vitest';
import {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '@/lib/transactions/service';

// ---------------------------------------------------------------------------
// Local type mirrors — matches what lib/transactions/types.ts will export.
// Defined here so the stub compiles without importing non-existent modules.
// ---------------------------------------------------------------------------
interface TransactionRow {
  id: number;
  amount_cents: number;
  currency: string;
  rate_to_usd: number;
  date: string;
  category_id: number | null;
  type: 'expense' | 'income';
  note: string | null;
  created_at: string;
}

interface CreateTransactionInput {
  amount_cents: number;
  currency: string;
  rate_to_usd: number;
  date: string;
  category_id: number | null;
  type: 'expense' | 'income';
  note: string | null;
}

interface UpdateTransactionInput {
  amount_cents?: number;
  currency?: string;
  date?: string;
  category_id?: number | null;
  // rate_to_usd is intentionally excluded — immutable per KD-4
  type?: 'expense' | 'income';
  note?: string | null;
}

interface TransactionFilters {
  month?: string;       // YYYY-MM
  category_id?: number;
  type?: 'expense' | 'income';
  page?: number;
}

// ---------------------------------------------------------------------------
// Stub repo — covers only the methods called by the four service functions.
// Factory pattern: override per-test with the overrides argument.
// ---------------------------------------------------------------------------
interface StubRepo {
  ping(): boolean;
  countTransactions(): number;
  listTransactions(filters: TransactionFilters): TransactionRow[];
  getTransaction(id: number): TransactionRow | undefined;
  createTransaction(input: CreateTransactionInput): TransactionRow;
  updateTransaction(id: number, fields: UpdateTransactionInput): TransactionRow | undefined;
  deleteTransaction(id: number): boolean;
}

const BASE_ROW: TransactionRow = {
  id: 1,
  amount_cents: 10000,
  currency: 'USD',
  rate_to_usd: 1.0,
  date: '2026-06-01',
  category_id: 1,
  type: 'expense',
  note: null,
  created_at: '2026-06-01T00:00:00',
};

function createMockRepo(overrides: Partial<StubRepo> = {}): StubRepo {
  return {
    ping: () => true,
    countTransactions: () => 0,
    listTransactions: (_filters) => [],
    getTransaction: (_id) => undefined,
    createTransaction: (input) => ({
      ...BASE_ROW,
      ...input,
      id: 1,
      created_at: '2026-06-01T00:00:00',
    }),
    updateTransaction: (_id, _fields) => undefined,
    deleteTransaction: (_id) => true,
    ...overrides,
  };
}

// Baseline valid input for createTransaction tests
const VALID_CREATE: CreateTransactionInput = {
  amount_cents: 4999,
  currency: 'USD',
  rate_to_usd: 1.0,
  date: '2026-06-01',
  category_id: 1,
  type: 'expense',
  note: '',
};

// ---------------------------------------------------------------------------
// listTransactions (FR-TX-06)
// Returns TransactionRow[] — the array from the repo, filtered per spec.
// ---------------------------------------------------------------------------
describe('listTransactions', () => {
  it('returns both rows when the repo provides two for a month filter', () => {
    const rows: TransactionRow[] = [
      { ...BASE_ROW, id: 1, date: '2026-06-05' },
      { ...BASE_ROW, id: 2, date: '2026-06-20' },
    ];
    const repo = createMockRepo({ listTransactions: () => rows });
    const result = listTransactions(repo as never, { month: '2026-06' });
    expect(result).toHaveLength(2);
    expect(result).toEqual(rows);
  });

  it('returns only expense rows when the repo is filtered by type=expense', () => {
    const expenseRow: TransactionRow = { ...BASE_ROW, id: 1, type: 'expense' };
    const repo = createMockRepo({ listTransactions: () => [expenseRow] });
    const result = listTransactions(repo as never, { type: 'expense' });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('expense');
  });

  it('returns an empty array when no transactions match the filter', () => {
    const repo = createMockRepo({ listTransactions: () => [] });
    const result = listTransactions(repo as never, { month: '2026-06' });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// createTransaction (FR-TX-01)
// ---------------------------------------------------------------------------
describe('createTransaction', () => {
  it('returns { ok: true, data: TransactionRow } for fully valid input', () => {
    const repo = createMockRepo({
      createTransaction: () => ({ ...BASE_ROW, amount_cents: 4999, currency: 'USD' }),
    });
    const result = createTransaction(repo as never, VALID_CREATE);
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.data).toMatchObject({
        id: expect.any(Number),
        amount_cents: expect.any(Number),
        currency: 'USD',
        type: 'expense',
      });
    }
  });

  it('returns { ok: false, code: VALIDATION_ERROR } for amount_cents = -1', () => {
    const repo = createMockRepo();
    const result = createTransaction(repo as never, { ...VALID_CREATE, amount_cents: -1 });
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
  });

  it('returns { ok: false, code: VALIDATION_ERROR } for amount_cents = 0', () => {
    const repo = createMockRepo();
    const result = createTransaction(repo as never, { ...VALID_CREATE, amount_cents: 0 });
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
  });

  it('returns { ok: false, code: VALIDATION_ERROR } for currency "XYZ"', () => {
    const repo = createMockRepo();
    const result = createTransaction(repo as never, { ...VALID_CREATE, currency: 'XYZ' });
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
  });

  it('returns { ok: false, code: VALIDATION_ERROR } for date "bad-date"', () => {
    const repo = createMockRepo();
    const result = createTransaction(repo as never, { ...VALID_CREATE, date: 'bad-date' });
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
  });

  it('returns { ok: false, code: VALIDATION_ERROR } for type "other"', () => {
    const repo = createMockRepo();
    const result = createTransaction(repo as never, {
      ...VALID_CREATE,
      type: 'other' as never,
    });
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
  });

  it('does not call repo.createTransaction when validation fails', () => {
    let repoCalled = false;
    const repo = createMockRepo({
      createTransaction: (input) => {
        repoCalled = true;
        return { ...BASE_ROW, ...input };
      },
    });
    createTransaction(repo as never, { ...VALID_CREATE, amount_cents: -5 });
    expect(repoCalled).toBe(false);
  });

  it('result.data includes the created_at timestamp returned by repo', () => {
    const repo = createMockRepo({
      createTransaction: () => ({ ...BASE_ROW, created_at: '2026-06-28T12:00:00' }),
    });
    const result = createTransaction(repo as never, VALID_CREATE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.created_at).toBe('2026-06-28T12:00:00');
    }
  });
});

// ---------------------------------------------------------------------------
// updateTransaction (FR-TX-03)
// The service validates partial input fields, then calls repo.updateTransaction.
// If the repo returns undefined (no rows changed), service returns NOT_FOUND.
// rate_to_usd is not in UpdateTransactionInput and must never be forwarded.
// ---------------------------------------------------------------------------
describe('updateTransaction', () => {
  it('returns { ok: true, data: TransactionRow } when repo.updateTransaction returns a row', () => {
    const updated: TransactionRow = { ...BASE_ROW, amount_cents: 7550 };
    const repo = createMockRepo({
      updateTransaction: (id, _fields) => (id === 1 ? updated : undefined),
    });
    const result = updateTransaction(repo as never, 1, { amount_cents: 7550 });
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.data.amount_cents).toBe(7550);
    }
  });

  it('returns { ok: false, code: NOT_FOUND } when repo.updateTransaction returns undefined', () => {
    // Simulates "no rows changed" — record did not exist
    const repo = createMockRepo({
      updateTransaction: () => undefined,
    });
    const result = updateTransaction(repo as never, 999, { amount_cents: 7550 });
    expect(result).toMatchObject({ ok: false, code: 'NOT_FOUND' });
  });

  it('returns { ok: false, code: VALIDATION_ERROR } for amount_cents = -1', () => {
    let repoCalled = false;
    const repo = createMockRepo({
      updateTransaction: () => {
        repoCalled = true;
        return undefined;
      },
    });
    const result = updateTransaction(repo as never, 1, { amount_cents: -1 });
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
    // Service must validate before reaching the repo
    expect(repoCalled).toBe(false);
  });

  it('returns { ok: false, code: VALIDATION_ERROR } for note exceeding 1000 characters', () => {
    const repo = createMockRepo();
    const result = updateTransaction(repo as never, 1, { note: 'a'.repeat(1001) });
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
  });
});

// ---------------------------------------------------------------------------
// deleteTransaction (FR-TX-04)
// Maps repo boolean to discriminated-union result.
// ---------------------------------------------------------------------------
describe('deleteTransaction', () => {
  it('returns { ok: true } when repo.deleteTransaction returns true', () => {
    const repo = createMockRepo({ deleteTransaction: () => true });
    const result = deleteTransaction(repo as never, 1);
    expect(result).toMatchObject({ ok: true });
  });

  it('returns { ok: false, code: NOT_FOUND } when repo.deleteTransaction returns false', () => {
    const repo = createMockRepo({ deleteTransaction: () => false });
    const result = deleteTransaction(repo as never, 999);
    expect(result).toMatchObject({ ok: false, code: 'NOT_FOUND' });
  });
});
