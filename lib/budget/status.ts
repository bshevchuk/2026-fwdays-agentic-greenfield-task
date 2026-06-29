// @trace FR-BUDGET-05
// TC-PURE-01: no next/*, react, or DOM imports — pure function only.

import type { TransactionRow } from '@/lib/transactions/types';
import { convertAmount } from '@/lib/fx/convert';

/**
 * Compute month-to-date budget status for a category.
 *
 * @param transactions - pre-filtered list (caller filters to category + month)
 * @param limit        - positive monthly limit in display currency (0 = no limit; caller guards)
 * @param displayCurrency - target ISO currency code for the spent sum
 * @param rates        - USD-pivot rate map: { [ISO]: rateToUsd }
 */
export function budgetStatus(
  transactions: TransactionRow[],
  limit: number,
  displayCurrency: string,
  rates: Record<string, number>,
): { spent: number; ratio: number; status: 'ok' | 'warning' | 'over' } {
  const spent = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => {
      return sum + convertAmount(t.amount_cents / 100, t.currency, displayCurrency, rates);
    }, 0);

  const ratio = limit > 0 ? spent / limit : 0;

  const status: 'ok' | 'warning' | 'over' =
    ratio >= 1.0 ? 'over' : ratio >= 0.8 ? 'warning' : 'ok';

  return { spent, ratio, status };
}
