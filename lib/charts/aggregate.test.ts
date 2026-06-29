// @trace FR-CHART-01, FR-CHART-02, FR-CHART-03
//
// Unit tests for aggregateDonut() and aggregateBar() pure functions.
// Written RED-first: lib/charts/aggregate.ts and lib/charts/types.ts do not
// exist yet.  All cases must fail with "Cannot find module" until the
// implementation is in place.  Never weaken a test to make it pass.

import { describe, it, expect } from 'vitest';
import { aggregateDonut, aggregateBar } from '@/lib/charts/aggregate';
import type { DonutSlice, MonthBar } from '@/lib/charts/types';
import type { TransactionRow } from '@/lib/transactions/types';
import type { CategoryFullRow } from '@/lib/categories/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTx(overrides: Partial<TransactionRow> = {}): TransactionRow {
  return {
    id: 1,
    amount_cents: 10000,
    currency: 'USD',
    rate_to_usd: 1.0,
    date: '2026-06-15',
    category_id: 1,
    type: 'expense',
    note: null,
    created_at: '2026-06-15T00:00:00Z',
    ...overrides,
  };
}

function makeCat(overrides: Partial<CategoryFullRow> = {}): CategoryFullRow {
  return {
    id: 1,
    name: 'Food',
    icon: 'tag',
    color: '#ef4444',
    budget_limit: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// aggregateDonut — FR-CHART-01, FR-CHART-03
// ---------------------------------------------------------------------------

describe('aggregateDonut — FR-CHART-01, FR-CHART-03', () => {
  // 1. Empty transactions → empty array
  it('returns empty array when there are no transactions', () => {
    const cat = makeCat();
    const result: DonutSlice[] = aggregateDonut([], [cat], 'USD');
    expect(result).toEqual([]);
  });

  // 2. Single expense, single category → one slice
  it('returns one DonutSlice for a single expense transaction in one category', () => {
    const tx = makeTx({ amount_cents: 10000, currency: 'USD', rate_to_usd: 1.0, category_id: 1 });
    const cat = makeCat({ id: 1, name: 'Food', color: '#ef4444' });

    const result: DonutSlice[] = aggregateDonut([tx], [cat], 'USD');

    expect(result).toHaveLength(1);
    expect(result[0].categoryId).toBe(1);
    expect(result[0].categoryName).toBe('Food');
    expect(result[0].color).toBe('#ef4444');
    expect(result[0].value).toBeCloseTo(100, 2);
    expect(result[0].percent).toBeCloseTo(100, 1);
  });

  // 3. Two categories — correct proportions
  it('computes correct percent proportions across two categories', () => {
    const txFood = makeTx({ amount_cents: 12000, currency: 'USD', rate_to_usd: 1.0, category_id: 1 });
    const txTransport = makeTx({ id: 2, amount_cents: 3000, currency: 'USD', rate_to_usd: 1.0, category_id: 2 });
    const cat1 = makeCat({ id: 1, name: 'Food', color: '#ef4444' });
    const cat2 = makeCat({ id: 2, name: 'Transport', color: '#3b82f6' });

    const result: DonutSlice[] = aggregateDonut([txFood, txTransport], [cat1, cat2], 'USD');

    expect(result).toHaveLength(2);

    const food = result.find((s) => s.categoryId === 1);
    const transport = result.find((s) => s.categoryId === 2);

    expect(food).toBeDefined();
    expect(food!.value).toBeCloseTo(120, 2);
    expect(food!.percent).toBeCloseTo(80, 1);

    expect(transport).toBeDefined();
    expect(transport!.value).toBeCloseTo(30, 2);
    expect(transport!.percent).toBeCloseTo(20, 1);
  });

  // 4. Income transactions excluded
  it('excludes income transactions from the donut (only expenses counted)', () => {
    const expense = makeTx({ amount_cents: 10000, currency: 'USD', rate_to_usd: 1.0, type: 'expense', category_id: 1 });
    const income = makeTx({ id: 2, amount_cents: 20000, currency: 'USD', rate_to_usd: 1.0, type: 'income', category_id: 1 });
    const cat = makeCat({ id: 1 });

    const result: DonutSlice[] = aggregateDonut([expense, income], [cat], 'USD');

    expect(result).toHaveLength(1);
    // Only the $100 expense should count, not the $200 income
    expect(result[0].value).toBeCloseTo(100, 2);
    expect(result[0].percent).toBeCloseTo(100, 1);
  });

  // 5. Multi-currency: stored rate used (not live) — FR-CHART-03
  it('converts amount via stored rate_to_usd without live FX call', () => {
    // 100 EUR * rate_to_usd 1.08 → 108 USD displayed
    const tx = makeTx({
      amount_cents: 10000,
      currency: 'EUR',
      rate_to_usd: 1.08,
      category_id: 1,
      type: 'expense',
    });
    const cat = makeCat({ id: 1 });

    const result: DonutSlice[] = aggregateDonut([tx], [cat], 'USD');

    expect(result).toHaveLength(1);
    expect(result[0].value).toBeCloseTo(108, 2);
  });

  // 6. Same category_id appears twice → values summed into one slice
  it('merges two transactions with the same category_id into one slice', () => {
    const tx1 = makeTx({ id: 1, amount_cents: 5000, currency: 'USD', rate_to_usd: 1.0, category_id: 1 });
    const tx2 = makeTx({ id: 2, amount_cents: 7000, currency: 'USD', rate_to_usd: 1.0, category_id: 1 });
    const cat = makeCat({ id: 1 });

    const result: DonutSlice[] = aggregateDonut([tx1, tx2], [cat], 'USD');

    expect(result).toHaveLength(1);
    expect(result[0].value).toBeCloseTo(120, 2);
    expect(result[0].percent).toBeCloseTo(100, 1);
  });
});

// ---------------------------------------------------------------------------
// aggregateBar — FR-CHART-02, FR-CHART-03
// ---------------------------------------------------------------------------

describe('aggregateBar — FR-CHART-02, FR-CHART-03', () => {
  // 7. Returns a MonthBar slot for each month in the months array (even zero-tx months)
  it('returns one bar per entry in months array even when there are no transactions', () => {
    const months = ['2026-01', '2026-02', '2026-03'];

    const result: MonthBar[] = aggregateBar([], months, 'USD');

    expect(result).toHaveLength(3);

    // Every bar has zero income and zero expense
    for (const bar of result) {
      expect(bar.income).toBe(0);
      expect(bar.expense).toBe(0);
    }

    // Month labels follow human-readable format, e.g. "Jan 2026"
    expect(result[0].month).toMatch(/Jan.*2026/);
    expect(result[1].month).toMatch(/Feb.*2026/);
    expect(result[2].month).toMatch(/Mar.*2026/);
  });

  // 8. Income and expense separated into correct buckets
  it('places income and expense transactions into their respective buckets for the correct month', () => {
    const income = makeTx({ id: 1, amount_cents: 5000, currency: 'USD', rate_to_usd: 1.0, type: 'income', date: '2026-06-10', category_id: 1 });
    const expense = makeTx({ id: 2, amount_cents: 8000, currency: 'USD', rate_to_usd: 1.0, type: 'expense', date: '2026-06-20', category_id: 1 });
    const months = ['2026-04', '2026-05', '2026-06'];

    const result: MonthBar[] = aggregateBar([income, expense], months, 'USD');

    expect(result).toHaveLength(3);

    const junBar = result.find((b) => b.month.includes('Jun'));
    expect(junBar).toBeDefined();
    expect(junBar!.income).toBeCloseTo(50, 2);
    expect(junBar!.expense).toBeCloseTo(80, 2);

    // Other months should have zeros
    const aprBar = result.find((b) => b.month.includes('Apr'));
    expect(aprBar!.income).toBe(0);
    expect(aprBar!.expense).toBe(0);
  });

  // 9. Transaction in a month not in the months array is ignored
  it('ignores transactions whose date falls outside the provided months array', () => {
    // Transaction in 2025-01 which is NOT in months array (2026-01 through 2026-12)
    const tx = makeTx({
      id: 1,
      amount_cents: 99999,
      currency: 'USD',
      rate_to_usd: 1.0,
      type: 'expense',
      date: '2025-01-15',
      category_id: 1,
    });
    const months = [
      '2026-01', '2026-02', '2026-03', '2026-04',
      '2026-05', '2026-06', '2026-07', '2026-08',
      '2026-09', '2026-10', '2026-11', '2026-12',
    ];

    const result: MonthBar[] = aggregateBar([tx], months, 'USD');

    expect(result).toHaveLength(12);
    for (const bar of result) {
      expect(bar.income).toBe(0);
      expect(bar.expense).toBe(0);
    }
  });

  // 10. Multi-currency bar amounts converted via stored rate — FR-CHART-03
  it('converts EUR expense via stored rate_to_usd, no live FX call', () => {
    // 100 EUR * rate_to_usd 1.08 → 108 USD
    const tx = makeTx({
      id: 1,
      amount_cents: 10000,
      currency: 'EUR',
      rate_to_usd: 1.08,
      type: 'expense',
      date: '2026-06-15',
      category_id: 1,
    });
    const months = ['2026-04', '2026-05', '2026-06'];

    const result: MonthBar[] = aggregateBar([tx], months, 'USD');

    const junBar = result.find((b) => b.month.includes('Jun'));
    expect(junBar).toBeDefined();
    expect(junBar!.expense).toBeCloseTo(108, 2);
    expect(junBar!.income).toBe(0);
  });
});
