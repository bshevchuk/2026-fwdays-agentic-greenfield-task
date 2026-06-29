# Design: add-charts

## KD-1: Data aggregation in Route Handler, not client

`GET /api/charts/data?month=YYYY-MM&currency=USD` does all aggregation server-side:
1. Fetches transactions for the month (donut data)
2. Fetches transactions for the trailing 12 months (bar data)
3. Converts `amount_cents / 100` via `convertAmount` using stored `rate_to_usd`
4. Groups by category_id (donut) or by month+type (bar)
5. Returns JSON: `{ donut: DonutSlice[]; bar: MonthBar[] }`

No live FX calls — only stored rates (FR-CHART-03). Client components receive pre-converted numbers.

## KD-2: Lazy loading for bundle budget

Both chart components use `next/dynamic` with `ssr: false`:

```ts
const SpendingDonutChart = dynamic(
  () => import('@/components/charts/SpendingDonutChart'),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
```

The SSR skeleton is a plain `<div>` matching the chart's height (e.g. `h-64`) — no SVG, no Recharts. This avoids layout shift on hydration while keeping chart JS out of the initial bundle. Required for NFR-PERF-03 (≤200 KB gzipped initial payload).

## KD-3: SSR skeleton

`components/charts/ChartSkeleton.tsx` — Server Component, renders an animated Tailwind placeholder (`animate-pulse bg-muted rounded-lg h-64`) matching the chart footprint. Used as the `loading` prop in both `next/dynamic` calls.

## KD-4: Display currency changes

When `displayCurrency` changes (from `useDisplayCurrency()`), the dashboard re-fetches `/api/charts/data?currency=<new>` — no DB refetch needed beyond the API call, which itself uses stored rates. Client state (`useState` with a `refetch` key or effect dependency on `displayCurrency`) drives re-fetch.

## KD-5: Month selector for donut

A `<select>` or `<input type="month">` scoped to the chart section lets users pick the donut month. Default: current local calendar month. The bar chart always shows trailing 12 months from today and is not affected by the donut month selector.

## KD-6: Recharts component structure

```
SpendingDonutChart:
  Recharts PieChart > Pie (innerRadius=60, outerRadius=90) + Legend + Tooltip

MonthlyBarChart:
  Recharts BarChart > Bar (income, green) + Bar (expense, red) + XAxis + YAxis + Tooltip
```

Custom `<Tooltip>` components render strings from `lib/i18n/en.ts` (NFR-I18N-01).

## KD-7: Empty state for donut

When the API returns `donut: []` (no expense transactions for the selected month):
- Render a centered `<p>` with `en.CHART_DONUT_EMPTY` instead of the PieChart
- The surrounding `<div>` keeps its `h-64` height so no layout shift occurs

## KD-8: Trailing 12 months calculation

The Route Handler computes 12 month keys: from `(currentMonth - 11)` to `currentMonth` inclusive, server-side using UTC date. Each month that has no transactions still appears in the response with income=0 / expense=0, so the bar chart always shows exactly 12 columns (FR-CHART-02 scenario).

## KD-9: DonutSlice and MonthBar types

```ts
interface DonutSlice {
  categoryId: number;
  categoryName: string;
  color: string;       // hex from category
  value: number;       // converted amount in display currency (decimal)
  percent: number;     // 0-100
}

interface MonthBar {
  month: string;       // e.g. "Jun 2026"
  income: number;      // converted total
  expense: number;     // converted total
}
```

## KD-10: `lib/charts/aggregate.ts` — pure aggregation functions

Pure functions used by the Route Handler (no framework deps):
- `aggregateDonut(transactions, categories, displayCurrency): DonutSlice[]`
- `aggregateBar(transactions, months, displayCurrency): MonthBar[]`

Colocate `lib/charts/aggregate.test.ts` with tests for these pure functions — they are the testable core.

## Module layout

```
lib/charts/
  aggregate.ts       — pure donut + bar aggregation
  aggregate.test.ts  — unit tests (RED first)
  types.ts           — DonutSlice, MonthBar

components/charts/
  SpendingDonutChart.tsx  — 'use client'
  MonthlyBarChart.tsx     — 'use client'
  ChartSkeleton.tsx       — Server Component

app/api/charts/
  data/route.ts      — GET aggregation handler
```
