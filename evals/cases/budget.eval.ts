// @trace FR-BUDGET-05

/**
 * Eval cases for budgetStatus quality.
 *
 * Dimension: correctness
 * These cases grade boundary semantics (exactly 80%, exactly 100%), income
 * exclusion, and the zero-transaction baseline. A judge can reason about
 * whether the returned JSON reflects the specified thresholds, which is harder
 * to express in a single boolean unit assertion.
 *
 * All produce() calls are pure function invocations — no HTTP needed.
 */

import { EvalCase } from './shell.eval';
import { budgetStatus } from '../../lib/budget/status';
import type { TransactionRow } from '../../lib/transactions/types';

/** Construct a minimal TransactionRow for test purposes. */
function makeRow(
  overrides: Pick<TransactionRow, 'amount_cents' | 'currency' | 'type'>,
): TransactionRow {
  return {
    id: 1,
    rate_to_usd: 1,
    date: '2026-06-01',
    category_id: null,
    note: null,
    created_at: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

export const cases: EvalCase[] = [
  {
    id: 'eval-budget-status-boundary-warning',
    trace: ['FR-BUDGET-05'],
    dimension: 'correctness',
    capability: 'budget',
    scenario:
      'budgetStatus receives one expense transaction that spends exactly 80% of ' +
      'the monthly limit (80 USD against a 100 USD limit). ' +
      'The boundary condition: ratio ≥ 0.8 triggers "warning", ratio < 1.0 keeps it out of "over".',
    produce: async () => {
      const rows: TransactionRow[] = [
        makeRow({ amount_cents: 8000, currency: 'USD', type: 'expense' }),
      ];
      const result = budgetStatus(rows, 100, 'USD', { USD: 1 });
      return JSON.stringify(result);
    },
    rubric: [
      'CRITICAL: status is "warning" — not "ok" and not "over"',
      'CRITICAL: ratio is exactly 0.8 — the boundary value must not drift',
      'spent is 80 (USD, converted from 8000 cents)',
      'the JSON has exactly the fields: spent, ratio, status',
    ],
  },
  {
    id: 'eval-budget-status-boundary-over',
    trace: ['FR-BUDGET-05'],
    dimension: 'correctness',
    capability: 'budget',
    scenario:
      'budgetStatus receives one expense that spends exactly 100% of the limit ' +
      '(100 USD against a 100 USD limit). ' +
      'The boundary condition: ratio ≥ 1.0 must flip status to "over".',
    produce: async () => {
      const rows: TransactionRow[] = [
        makeRow({ amount_cents: 10000, currency: 'USD', type: 'expense' }),
      ];
      const result = budgetStatus(rows, 100, 'USD', { USD: 1 });
      return JSON.stringify(result);
    },
    rubric: [
      'CRITICAL: status is "over" — the 100% boundary must cross into over, not stay at warning',
      'CRITICAL: ratio is exactly 1.0',
      'spent is 100',
      'the JSON has exactly the fields: spent, ratio, status',
    ],
  },
  {
    id: 'eval-budget-status-income-exclusion',
    trace: ['FR-BUDGET-05'],
    dimension: 'correctness',
    capability: 'budget',
    scenario:
      'budgetStatus receives one expense of $50 and one income of $200 against ' +
      'a $100 limit. Only expenses count toward the budget. The $200 income must ' +
      'be ignored, leaving spent=50, ratio=0.5, status="ok".',
    produce: async () => {
      const rows: TransactionRow[] = [
        makeRow({ amount_cents: 5000, currency: 'USD', type: 'expense' }),
        makeRow({ amount_cents: 20000, currency: 'USD', type: 'income' }),
      ];
      const result = budgetStatus(rows, 100, 'USD', { USD: 1 });
      return JSON.stringify(result);
    },
    rubric: [
      'CRITICAL: status is "ok" — income must not reduce the spent total below zero or distort the ratio',
      'CRITICAL: spent is 50, not 50 - 200 = -150 and not 50 + 200 = 250',
      'ratio is 0.5',
      'income transactions are completely excluded from the budget calculation',
    ],
  },
  {
    id: 'eval-budget-status-empty',
    trace: ['FR-BUDGET-05'],
    dimension: 'correctness',
    capability: 'budget',
    scenario:
      'budgetStatus is called with an empty transaction array and a non-zero limit. ' +
      'Must return a safe zero-state without errors.',
    produce: async () => {
      const result = budgetStatus([], 100, 'USD', { USD: 1 });
      return JSON.stringify(result);
    },
    rubric: [
      'CRITICAL: no exception is thrown — empty array is a valid baseline state',
      'CRITICAL: spent is 0',
      'CRITICAL: ratio is 0',
      'CRITICAL: status is "ok"',
      'all three fields (spent, ratio, status) are present in the output',
    ],
  },
];
