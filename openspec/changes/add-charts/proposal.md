# Proposal: add-charts

## Why

Users have transactions and budget limits but no visual overview of spending patterns. Charts turn raw data into insight — a donut shows category share for the current month; a bar chart shows income vs expense trends over 12 months.

## What

- `components/charts/SpendingDonutChart.tsx` — Recharts PieChart (donut), category spend for selected month, colored segments, legend, tooltips, empty-state message
- `components/charts/MonthlyBarChart.tsx` — Recharts BarChart, 12-month trailing income vs expense, tooltips
- `components/charts/ChartSkeleton.tsx` — SSR skeleton matching chart footprint (no SVG in SSR)
- `app/api/charts/data/route.ts` — GET handler aggregating chart data from transactions; accepts `?month=YYYY-MM&currency=XXX`; returns pre-converted amounts using stored rates
- Both chart components lazy-loaded via `next/dynamic` to keep initial JS bundle under 200 KB gzipped (NFR-PERF-03)
- i18n keys for all chart strings

## Impact

- Depends on: add-transactions (TransactionRow with rate_to_usd), add-categories (category colors), add-budget-limits (page layout)
- No new DB migration
- `IRepository` gains no new methods — uses `listTransactions` with month filter
- FX conversion uses stored `rate_to_usd` only — no live frankfurter.app calls during render (FR-CHART-03)

## Covered FRs

FR-CHART-01 (donut), FR-CHART-02 (bar), FR-CHART-03 (no live FX at render), FR-CHART-04 (display currency changes re-render without DB refetch), FR-CHART-05 (tooltips)
