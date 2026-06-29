// @trace FR-BUDGET-05
// Unit tests for budgetStatus() pure function.
// Written RED-first: lib/budget/status.ts does not exist yet.
// All cases must fail with "Cannot find module" until the implementation lands.

import { describe, it, expect } from 'vitest';
import type { TransactionRow } from '@/lib/transactions/types';
import { budgetStatus } from '@/lib/budget/status';

// ---------------------------------------------------------------------------
// Helper — build a minimal TransactionRow with sensible defaults
// ---------------------------------------------------------------------------

let nextId = 1;

function makeTransaction(
  overrides: Pick<TransactionRow, 'amount_cents' | 'currency' | 'rate_to_usd' | 'type'> &
    Partial<TransactionRow>,
): TransactionRow {
  return {
    id: nextId++,
    date: '2026-06-15',
    category_id: 1,
    note: null,
    created_at: '2026-06-15T00:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('budgetStatus — FR-BUDGET-05', () => {
  // 1. Empty transactions
  it('returns spent=0, ratio=0, status=ok for empty transaction list', () => {
    const result = budgetStatus([], 100, 'USD', { USD: 1.0 });
    expect(result).toEqual({ spent: 0, ratio: 0, status: 'ok' });
  });

  // 2. Below 80% threshold → ok
  it('returns status=ok when spend 60 is below 80% of limit 100', () => {
    const txs: TransactionRow[] = [
      makeTransaction({ amount_cents: 6000, currency: 'USD', rate_to_usd: 1.0, type: 'expense' }),
    ];
    const result = budgetStatus(txs, 100, 'USD', { USD: 1.0 });
    expect(result.spent).toBeCloseTo(60, 5);
    expect(result.ratio).toBeCloseTo(0.6, 5);
    expect(result.status).toBe('ok');
  });

  // 3. Exactly at 80% boundary → warning
  it('returns status=warning at exactly 80% of limit (ratio=0.8, boundary)', () => {
    const txs: TransactionRow[] = [
      makeTransaction({ amount_cents: 8000, currency: 'USD', rate_to_usd: 1.0, type: 'expense' }),
    ];
    const result = budgetStatus(txs, 100, 'USD', { USD: 1.0 });
    expect(result.spent).toBeCloseTo(80, 5);
    expect(result.ratio).toBeCloseTo(0.8, 5);
    expect(result.status).toBe('warning');
  });

  // 4. Between 80% and 99% → warning
  it('returns status=warning when spend 95 is between 80% and 100% of limit 100', () => {
    const txs: TransactionRow[] = [
      makeTransaction({ amount_cents: 9500, currency: 'USD', rate_to_usd: 1.0, type: 'expense' }),
    ];
    const result = budgetStatus(txs, 100, 'USD', { USD: 1.0 });
    expect(result.spent).toBeCloseTo(95, 5);
    expect(result.ratio).toBeCloseTo(0.95, 5);
    expect(result.status).toBe('warning');
  });

  // 5. Exactly at 100% boundary → over
  it('returns status=over at exactly 100% of limit (ratio=1.0, boundary)', () => {
    const txs: TransactionRow[] = [
      makeTransaction({ amount_cents: 10000, currency: 'USD', rate_to_usd: 1.0, type: 'expense' }),
    ];
    const result = budgetStatus(txs, 100, 'USD', { USD: 1.0 });
    expect(result.spent).toBeCloseTo(100, 5);
    expect(result.ratio).toBeCloseTo(1.0, 5);
    expect(result.status).toBe('over');
  });

  // 6. Exceeds 100% → over
  it('returns status=over when spend 130 exceeds limit 100', () => {
    const txs: TransactionRow[] = [
      makeTransaction({ amount_cents: 13000, currency: 'USD', rate_to_usd: 1.0, type: 'expense' }),
    ];
    const result = budgetStatus(txs, 100, 'USD', { USD: 1.0 });
    expect(result.spent).toBeCloseTo(130, 5);
    expect(result.ratio).toBeCloseTo(1.3, 5);
    expect(result.status).toBe('over');
  });

  // 7. Multi-currency conversion via USD pivot
  // 50 USD (rate_to_usd=1.0) → convertAmount(50, 'USD', 'USD', rates) = 50
  // 40 EUR (rate_to_usd=1.1) → convertAmount(40, 'EUR', 'USD', rates) = 40 * 1.1 / 1.0 = 44
  // Total spent = 94; ratio = 94/200 = 0.47; status = 'ok'
  it('converts multi-currency transactions via USD-pivot: 50 USD + 40 EUR → spent=94, ratio=0.47, ok', () => {
    const rates = { USD: 1.0, EUR: 1.1 };
    const txs: TransactionRow[] = [
      makeTransaction({ amount_cents: 5000, currency: 'USD', rate_to_usd: 1.0, type: 'expense' }),
      makeTransaction({ amount_cents: 4000, currency: 'EUR', rate_to_usd: 1.1, type: 'expense' }),
    ];
    const result = budgetStatus(txs, 200, 'USD', rates);
    expect(result.spent).toBeCloseTo(94, 5);
    expect(result.ratio).toBeCloseTo(0.47, 5);
    expect(result.status).toBe('ok');
  });

  // 8. Income transactions excluded from spend total
  it('excludes income transactions — expense 80 USD + income 200 USD → spent=80, status=warning', () => {
    const txs: TransactionRow[] = [
      makeTransaction({ amount_cents: 8000, currency: 'USD', rate_to_usd: 1.0, type: 'expense' }),
      makeTransaction({ amount_cents: 20000, currency: 'USD', rate_to_usd: 1.0, type: 'income' }),
    ];
    const result = budgetStatus(txs, 100, 'USD', { USD: 1.0 });
    expect(result.spent).toBeCloseTo(80, 5);
    expect(result.ratio).toBeCloseTo(0.8, 5);
    expect(result.status).toBe('warning');
  });

  // 9. No framework imports — post-implementation safety net
  // This test passes vacuously before the file exists (early return when absent).
  it('source file contains no imports from next/* or react (TC-PURE-01)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    const filePath = path.resolve(__dirname, 'status.ts');
    if (!fs.existsSync(filePath)) {
      // Implementation not yet created — nothing to check; pass vacuously.
      return;
    }
    const src = fs.readFileSync(filePath, 'utf-8');
    expect(src).not.toMatch(/from ['"]next\//);
    expect(src).not.toMatch(/from ['"]react['"]/);
    expect(src).not.toMatch(/from ['"]react-dom['"]/);
  });
});
