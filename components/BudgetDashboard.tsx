'use client';
// @trace FR-BUDGET-02, FR-BUDGET-03, FR-BUDGET-04
import { useEffect, useState } from 'react';
import { en } from '@/lib/i18n/en';
import { useDisplayCurrency } from '@/lib/fx/currency-context';
import { budgetStatus } from '@/lib/budget/status';
import type { CategoryFullRow } from '@/lib/categories/types';
import type { TransactionRow } from '@/lib/transactions/types';

function currentMonthParam(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

const STATUS_COLOR: Record<'ok' | 'warning' | 'over', string> = {
  ok: 'bg-green-500',
  warning: 'bg-yellow-500',
  over: 'bg-red-500',
};

interface DashboardState {
  loading: boolean;
  categories: CategoryFullRow[];
  transactions: TransactionRow[];
  error: string | null;
}

export function BudgetDashboard() {
  const { displayCurrency } = useDisplayCurrency();
  const [state, setState] = useState<DashboardState>({
    loading: true,
    categories: [],
    transactions: [],
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    const month = currentMonthParam();

    Promise.all([
      fetch('/api/categories').then((r) => r.json() as Promise<CategoryFullRow[]>),
      fetch(`/api/transactions?month=${month}&type=expense`).then(
        (r) => r.json() as Promise<{ transactions: TransactionRow[]; total: number }>,
      ),
    ])
      .then(([cats, txData]) => {
        if (cancelled) return;
        setState({
          loading: false,
          categories: Array.isArray(cats) ? cats : [],
          transactions: Array.isArray(txData.transactions) ? txData.transactions : [],
          error: null,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({ loading: false, categories: [], transactions: [], error: String(err) });
      });

    return () => {
      cancelled = true;
    };
  }, [displayCurrency]);

  if (state.loading) {
    return (
      <section aria-label={en.BUDGET_DASHBOARD_TITLE} className="mb-8">
        <h2 className="text-lg font-semibold mb-4">{en.BUDGET_DASHBOARD_TITLE}</h2>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </section>
    );
  }

  if (state.error) {
    return (
      <section aria-label={en.BUDGET_DASHBOARD_TITLE} className="mb-8">
        <h2 className="text-lg font-semibold mb-4">{en.BUDGET_DASHBOARD_TITLE}</h2>
        <p role="alert" className="text-sm text-red-600">{state.error}</p>
      </section>
    );
  }

  const { categories, transactions } = state;

  // Build a rates map from transaction rows (stored rate_to_usd at entry time)
  // Always seed USD=1 so the USD-pivot in convertAmount works regardless of displayCurrency
  const rates: Record<string, number> = { USD: 1 };
  for (const t of transactions) {
    if (!(t.currency in rates)) {
      rates[t.currency] = t.rate_to_usd;
    }
  }
  // If displayCurrency isn't in rates yet (no transactions in that currency), seed it as 1
  // relative to itself — convertAmount handles same-currency as pass-through anyway
  if (!(displayCurrency in rates)) {
    rates[displayCurrency] = 1;
  }

  return (
    <section aria-label={en.BUDGET_DASHBOARD_TITLE} className="mb-8">
      <h2 className="text-lg font-semibold mb-4">{en.BUDGET_DASHBOARD_TITLE}</h2>

      {categories.length === 0 && (
        <p className="text-sm text-muted-foreground">{en.BUDGET_NO_LIMIT}</p>
      )}

      <ul className="space-y-4">
        {categories.map((cat) => {
          // Filter transactions to this category (already filtered to expense + month by API)
          const catTxs = transactions.filter((t) => t.category_id === cat.id);
          const hasLimit = cat.budget_limit != null && cat.budget_limit > 0;

          if (hasLimit) {
            const limit = cat.budget_limit as number;
            const result = budgetStatus(catTxs, limit, displayCurrency, rates);
            const barWidth = `${Math.min(result.ratio * 100, 100)}%`;
            const colorClass = STATUS_COLOR[result.status];
            const statusLabel =
              result.status === 'ok'
                ? en.BUDGET_STATUS_OK
                : result.status === 'warning'
                  ? en.BUDGET_STATUS_WARNING
                  : en.BUDGET_STATUS_OVER;

            return (
              <li key={cat.id} className="rounded border border-border p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{cat.name}</span>
                  <span className="text-xs text-muted-foreground">{statusLabel}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden mb-1">
                  <div
                    className={`${colorClass} h-2 rounded-full transition-all`}
                    style={{ width: barWidth }}
                    role="progressbar"
                    aria-valuenow={Math.round(result.ratio * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${cat.name} budget: ${statusLabel}`}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {displayCurrency} {result.spent.toFixed(2)} {en.BUDGET_OF_LIMIT}{' '}
                  {displayCurrency} {limit.toFixed(2)}
                </p>
              </li>
            );
          }

          // No limit — show spend-only row using stored rate_to_usd for a best-effort conversion
          const spentNoLimit = catTxs.reduce((sum, t) => {
            try {
              const txRates: Record<string, number> = { ...rates };
              if (!(t.currency in txRates)) txRates[t.currency] = t.rate_to_usd;
              return sum + budgetStatus([t], 1, displayCurrency, txRates).spent;
            } catch {
              return sum + t.amount_cents / 100;
            }
          }, 0);

          return (
            <li key={cat.id} className="rounded border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{cat.name}</span>
                <span className="text-xs text-muted-foreground">{en.BUDGET_NO_LIMIT}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {en.BUDGET_SPEND_LABEL}: {displayCurrency} {spentNoLimit.toFixed(2)}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
