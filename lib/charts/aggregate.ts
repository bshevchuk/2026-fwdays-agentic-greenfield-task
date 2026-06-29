// @trace FR-CHART-01, FR-CHART-02, FR-CHART-03
// Pure aggregation functions — no framework imports, no side effects.

import type { TransactionRow } from '@/lib/transactions/types';
import type { CategoryFullRow } from '@/lib/categories/types';
import { convertAmount } from '@/lib/fx/convert';
import type { DonutSlice, MonthBar } from './types';

/**
 * Build a USD-pivot rates map from a set of transactions.
 * rates[currency] = rate_to_usd (last-seen per currency).
 * Always ensures displayCurrency and USD have entries (fallback 1.0).
 */
function buildRatesMap(
  transactions: TransactionRow[],
  displayCurrency: string,
): Record<string, number> {
  const rates: Record<string, number> = {};
  for (const t of transactions) {
    rates[t.currency] = t.rate_to_usd;
  }
  // USD baseline (always 1.0 in USD-pivot)
  if (!('USD' in rates)) {
    rates['USD'] = 1.0;
  }
  // Ensure displayCurrency has an entry so convertAmount never throws
  if (!(displayCurrency in rates)) {
    rates[displayCurrency] = 1.0;
  }
  return rates;
}

/**
 * Aggregate expense transactions for the donut chart.
 *
 * Steps:
 * 1. Filter to expense type only.
 * 2. Build rates map from stored rate_to_usd (last-seen per currency).
 * 3. Sum amount_cents/100 converted to displayCurrency per category_id.
 * 4. Map each category_id → DonutSlice using the categories array for name/color.
 *    Skip if category not found.
 * 5. Compute percent = (value / total) * 100.
 * 6. Return sorted by value descending.
 */
export function aggregateDonut(
  transactions: TransactionRow[],
  categories: CategoryFullRow[],
  displayCurrency: string,
): DonutSlice[] {
  const expenses = transactions.filter((t) => t.type === 'expense');
  if (expenses.length === 0) return [];

  const rates = buildRatesMap(expenses, displayCurrency);
  const catMap = new Map<number, CategoryFullRow>(categories.map((c) => [c.id, c]));

  // Sum per category_id
  const totals = new Map<number, number>();
  for (const t of expenses) {
    const catId = t.category_id;
    if (catId === null) continue;
    const amount = t.amount_cents / 100;
    let converted: number;
    try {
      converted = convertAmount(amount, t.currency, displayCurrency, rates);
    } catch {
      converted = amount; // graceful fallback
    }
    totals.set(catId, (totals.get(catId) ?? 0) + converted);
  }

  if (totals.size === 0) return [];

  const total = Array.from(totals.values()).reduce((s, v) => s + v, 0);

  const slices: DonutSlice[] = [];
  for (const [catId, value] of totals) {
    const cat = catMap.get(catId);
    if (!cat) continue; // skip if category not found
    slices.push({
      categoryId: catId,
      categoryName: cat.name,
      color: cat.color,
      value,
      percent: total > 0 ? (value / total) * 100 : 0,
    });
  }

  // Sort by value descending
  slices.sort((a, b) => b.value - a.value);
  return slices;
}

/**
 * Format a YYYY-MM key into a human-readable month label ("Jun 2026").
 */
function formatMonthLabel(monthKey: string): string {
  const d = new Date(`${monthKey}-01`);
  return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Aggregate transactions into monthly income/expense bars.
 *
 * Steps:
 * 1. Build rates map from ALL transactions (last-seen per currency).
 * 2. For each month in months array:
 *    - Find transactions where date starts with the month key.
 *    - Sum expense and income amount_cents/100 converted to displayCurrency.
 *    - Produce MonthBar { month, monthKey, income, expense }.
 * 3. Transactions outside the months array are ignored.
 */
export function aggregateBar(
  transactions: TransactionRow[],
  months: string[],
  displayCurrency: string,
): MonthBar[] {
  const rates = buildRatesMap(transactions, displayCurrency);

  return months.map((monthKey) => {
    const monthTxs = transactions.filter((t) => t.date.startsWith(monthKey));

    let income = 0;
    let expense = 0;

    for (const t of monthTxs) {
      const amount = t.amount_cents / 100;
      let converted: number;
      try {
        converted = convertAmount(amount, t.currency, displayCurrency, rates);
      } catch {
        converted = amount;
      }
      if (t.type === 'income') {
        income += converted;
      } else {
        expense += converted;
      }
    }

    return {
      month: formatMonthLabel(monthKey),
      monthKey,
      income,
      expense,
    };
  });
}
