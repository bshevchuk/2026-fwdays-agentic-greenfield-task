'use client';
// @trace FR-CHART-01, FR-CHART-02, FR-CHART-04, FR-CHART-05, NFR-PERF-03, NFR-I18N-01

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ChartSkeleton } from './ChartSkeleton';
import { useDisplayCurrency } from '@/lib/fx/currency-context';
import { en } from '@/lib/i18n/en';
import type { DonutSlice, MonthBar } from '@/lib/charts/types';

// Lazy-load chart components with ssr:false to avoid Recharts SSR errors (NFR-PERF-03)
const SpendingDonutChart = dynamic(
  () => import('./SpendingDonutChart'),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

const MonthlyBarChart = dynamic(
  () => import('./MonthlyBarChart'),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

interface ChartData {
  donut: DonutSlice[];
  bar: MonthBar[];
}

interface ChartState {
  loading: boolean;
  data: ChartData | null;
  error: string | null;
}

function currentMonthKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function ChartsDashboard() {
  const { displayCurrency } = useDisplayCurrency();
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [state, setState] = useState<ChartState>({
    loading: true,
    data: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    fetch(
      `/api/charts/data?month=${encodeURIComponent(selectedMonth)}&currency=${encodeURIComponent(displayCurrency)}`,
    )
      .then((res) => {
        if (!res.ok) {
          return res.json().then((d: { error?: string }) =>
            Promise.reject(d.error ?? 'Error'),
          );
        }
        return res.json() as Promise<ChartData>;
      })
      .then((data) => {
        if (cancelled) return;
        setState({ loading: false, data, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({ loading: false, data: null, error: String(err) });
      });

    return () => {
      cancelled = true;
    };
  }, [displayCurrency, selectedMonth]);

  const { loading, data, error } = state;

  return (
    <section className="mt-8 space-y-8">
      {/* Donut chart section */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{en.CHART_DONUT_TITLE}</h2>
          <label className="flex items-center gap-2 text-sm">
            <span>{en.CHART_MONTH_SELECTOR_LABEL}</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded border border-border bg-background px-2 py-1 text-sm"
            />
          </label>
        </div>

        {loading && <ChartSkeleton />}
        {!loading && error && (
          <p role="alert" className="text-sm text-red-600">{error}</p>
        )}
        {!loading && !error && data && (
          <SpendingDonutChart slices={data.donut} currency={displayCurrency} />
        )}
      </div>

      {/* Bar chart section */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">{en.CHART_BAR_TITLE}</h2>

        {loading && <ChartSkeleton />}
        {!loading && error && (
          <p role="alert" className="text-sm text-red-600">{error}</p>
        )}
        {!loading && !error && data && (
          <MonthlyBarChart bars={data.bar} currency={displayCurrency} />
        )}
      </div>
    </section>
  );
}
