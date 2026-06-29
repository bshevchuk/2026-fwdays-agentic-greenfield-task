// @trace FR-CHART-01, FR-CHART-02, FR-CHART-03, FR-CHART-04
// GET /api/charts/data?month=YYYY-MM&currency=ISO4217
// Aggregates donut (single month, expenses by category) and bar (12 months, income vs expense).
// Uses only stored rate_to_usd — no live FX calls (FR-CHART-03).

import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';
import { SUPPORTED_CURRENCIES } from '@/lib/fx/supported-currencies';
import { aggregateDonut, aggregateBar } from '@/lib/charts/aggregate';

/**
 * Returns the current YYYY-MM in UTC.
 */
function currentMonthKey(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Returns an array of 12 YYYY-MM strings, oldest first, ending with (and
 * including) the given month key.
 */
function trailingTwelveMonths(currentMonth: string): string[] {
  const [yearStr, monthStr] = currentMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    let y = year;
    let m = month - i;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    months.push(`${y}-${String(m).padStart(2, '0')}`);
  }
  return months;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    // Validate currency
    const rawCurrency = searchParams.get('currency');
    if (!rawCurrency) {
      return NextResponse.json({ error: 'currency parameter is required' }, { status: 422 });
    }
    const currency = rawCurrency.toUpperCase();
    if (!(SUPPORTED_CURRENCIES as readonly string[]).includes(currency)) {
      return NextResponse.json(
        { error: `Unsupported currency: ${rawCurrency}` },
        { status: 422 },
      );
    }

    // Validate / default month
    const rawMonth = searchParams.get('month');
    let month: string;
    if (rawMonth && /^\d{4}-\d{2}$/.test(rawMonth)) {
      month = rawMonth;
    } else {
      month = currentMonthKey();
    }

    const trailingMonths = trailingTwelveMonths(month);

    const repo = getRepository();

    // Fetch transactions for the selected month (for donut)
    const donutTxs = repo.listAllTransactions({ month });

    // Fetch all transactions for the trailing 12-month window (for bar).
    // We use the first and last month of the trailing array as a rough window,
    // then let aggregateBar do the exact per-month filtering.
    const allTxs = repo.listAllTransactions({});

    const categories = repo.listCategories();

    const donut = aggregateDonut(donutTxs, categories, currency);
    const bar = aggregateBar(allTxs, trailingMonths, currency);

    return NextResponse.json({ donut, bar });
  } catch (e) {
    process.stderr.write(`[GET /api/charts/data] ${String(e)}\n`);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
