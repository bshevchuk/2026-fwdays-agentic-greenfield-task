# Tasks: add-charts

## 1. Pre-flight

- [x] 1.1 Read FR-CHART-01 through FR-CHART-05 in spec.md
- [x] 1.2 Confirm recharts is installed: `ls node_modules/recharts` (installed in scaffold)
- [x] 1.3 Confirm 178 tests pass on main before starting

## 2. RED tests (write first, confirm they FAIL)

- [x] 2.1 Write `lib/charts/aggregate.test.ts` (`@trace FR-CHART-01, FR-CHART-02, FR-CHART-03`):

  **aggregateDonut tests:**
  - Empty transactions → empty array
  - Single expense 100 USD in "Food" → one slice, value=100, percent=100
  - Two expenses: Food 120 + Transport 30, total 150 → Food value=120 percent=80, Transport value=30 percent=20
  - Income transactions excluded → only expense rows contribute
  - Multi-currency: 100 EUR (rate_to_usd=1.08) in USD display → value=108 (using stored rate, not live)
  - Two categories same id → values summed

  **aggregateBar tests:**
  - 12 month slots always generated even if some have zero transactions
  - Income and expense in same month → appear in correct buckets
  - Month with no transactions → income=0, expense=0 (slot still present)
  - Amounts converted via stored rate_to_usd

- [x] 2.2 Run `npm run test:run` — confirm new tests FAIL with "Cannot find module"

## 3. Implementation

- [x] 3.1 Write `lib/charts/types.ts` — `DonutSlice`, `MonthBar` interfaces (from design KD-9)

- [x] 3.2 Write `lib/charts/aggregate.ts` — pure functions:
  - `aggregateDonut(transactions, categories, displayCurrency): DonutSlice[]`
  - `aggregateBar(transactions, months: string[], displayCurrency): MonthBar[]`
  - Import `convertAmount` from `@/lib/fx/convert`; no framework imports

- [x] 3.3 Add to `lib/i18n/en.ts`:
  - `CHART_DONUT_TITLE`, `CHART_BAR_TITLE`
  - `CHART_DONUT_EMPTY` — "No spending data for this month"
  - `CHART_INCOME_LABEL`, `CHART_EXPENSE_LABEL`
  - `CHART_TOOLTIP_INCOME`, `CHART_TOOLTIP_EXPENSE`
  - `CHART_MONTH_SELECTOR_LABEL`

- [x] 3.4 Write `app/api/charts/data/route.ts` (GET):
  - Query params: `month=YYYY-MM`, `currency=ISO4217`
  - Fetch all transactions for selected month (donut) + trailing 12 months (bar)
  - Call `aggregateDonut` and `aggregateBar` with categories
  - Return `{ donut: DonutSlice[], bar: MonthBar[] }`

- [x] 3.5 Write `components/charts/ChartSkeleton.tsx` — animated Tailwind placeholder

- [x] 3.6 Write `components/charts/SpendingDonutChart.tsx` (`'use client'`):
  - Recharts `PieChart > Pie` with innerRadius=60, outerRadius=90
  - `Legend` component
  - Custom `Tooltip` using i18n strings
  - Empty state when `slices.length === 0`
  - Props: `slices: DonutSlice[]`, `currency: string`

- [x] 3.7 Write `components/charts/MonthlyBarChart.tsx` (`'use client'`):
  - Recharts `BarChart` with two `Bar` (income green, expense red)
  - `XAxis` (month labels), `YAxis`, `Tooltip`
  - Custom tooltip with i18n strings
  - Props: `bars: MonthBar[]`, `currency: string`

- [x] 3.8 Write dashboard wrapper `components/charts/ChartsDashboard.tsx` (`'use client'`):
  - Uses `useDisplayCurrency()`, re-fetches on currency change
  - Month selector `<select>` for donut
  - Lazy loads both chart components via `next/dynamic({ ssr: false, loading: <ChartSkeleton /> })`
  - Fetches `/api/charts/data?month=...&currency=...`

- [x] 3.9 Update `app/page.tsx` — render `<ChartsDashboard />` below budget and transaction sections

## 4. Gate

- [x] 4.1 `npm run test:run` — all tests pass (target ≥ 190 total)
- [x] 4.2 `npm run lint` — 0 errors
- [x] 4.3 `npm run build` — must succeed; check for Recharts SSR warnings
- [x] 4.4 `node scripts/check-traceability.mjs` — 0 failures

## 5. Commit and archive

- [ ] 5.1 `git add -A && git commit` with `Slice: add-charts` and `Refs: FR-CHART-01, FR-CHART-02, FR-CHART-03, FR-CHART-04, FR-CHART-05`
- [ ] 5.2 `mv openspec/changes/add-charts openspec/archive/add-charts`
- [ ] 5.3 `git commit -m "chore: archive add-charts change folder"`
