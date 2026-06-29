# Spec: add-charts

## ADDED Requirements

Sourced from `openspec/specs/charts/spec.md`. All scenarios apply.

### FR-CHART-01: Category Spending Donut Chart

Dashboard renders a donut chart (Recharts PieChart) summarising expense transactions for the selected month grouped by category. Segment arc proportional to category share. Legend shows color swatch + name. All amounts in display currency via stored rates.

**Scenario: Donut segments reflect proportions** — Food 120, Transport 30, Health 50 (total 200) in USD → 3 segments, Food arc = 60%

**Scenario: Legend shows category color and name** — "Food & Drink" (#F97316) and "Transport" (#3B82F6) → 2 legend entries, each with color swatch + name

**Scenario: Amounts in display currency** — 100 EUR at stored rate 1.08→USD = 108 USD shown; not raw EUR

**Scenario: Single category** — one full-circle segment; one legend entry; no error

**Scenario: No expense transactions** — explicit empty-state message within chart area (from lib/i18n/en.ts); no blank white rectangle; stable layout

### FR-CHART-02: Monthly Income vs Expense Bar Chart

Dashboard renders a bar chart with 12 trailing calendar months. Two adjacent bars per column: income (green) and expense (red). Rightmost = current month. All amounts in display currency via stored rates.

**Scenario: 12 month columns always rendered** — current date 2026-06-28 → columns Jul 2025–Jun 2026

**Scenario: Income and expense bars reflect converted totals** — Jun 2026 income 500 EUR + expenses 200 EUR, rate 1.08→USD → income bar 540 USD, expense bar 216 USD

**Scenario: Month with no transactions shows zero-height bars** — missing months still get columns, not gaps

**Scenario: Display currency change re-renders without DB refetch** — currency context change triggers re-fetch of /api/charts/data only; no full DB query from client

### FR-CHART-03: No Live FX Calls at Render Time

Exchange rates are pre-stored at transaction creation time (rate_to_usd). Chart rendering uses only those stored rates. No call to frankfurter.app is made by chart components or their route handler.

**Scenario: Chart renders without live FX call** — inspect network tab; no requests to api.frankfurter.app during chart render

**Scenario: Route handler uses stored rates only** — /api/charts/data source uses t.rate_to_usd; no fetch to external FX endpoint

### FR-CHART-04: Display Currency Change Re-Renders Charts

When user changes display currency, both charts re-compute with the new currency without reloading the page or re-querying the database beyond the /api/charts/data call.

**Scenario: Changing display currency updates chart amounts** — switch USD→EUR, chart amounts change accordingly; no page reload

### FR-CHART-05: Hover Tooltips

Hovering over donut segment → tooltip with category name, amount in display currency, percentage share. Hovering over bar chart bar → tooltip with month label, income total, expense total.

**Scenario: Donut tooltip** — hover "Food" segment (120 USD out of 200, 60%) → tooltip shows "Food", "120.00 USD", "60 %"

**Scenario: Donut tooltip in display currency** — EUR display, 108 EUR segment → tooltip shows "108.00 EUR"

**Scenario: Bar chart tooltip** — hover Jun 2026 bar → tooltip shows "Jun 2026", income 540.00 USD, expenses 216.00 USD

**Scenario: Tooltip disappears on pointer leave** — pointer leaves chart area → tooltip no longer visible

### NFR-PERF-03: Initial JS Bundle ≤ 200 KB Gzipped

Both chart components must be lazy-loaded (`next/dynamic({ ssr: false })`). SSR delivers skeleton. Chart JS not in initial payload.

### NFR-OBS-01: Silent Console

No Recharts prop warnings, React hydration mismatches, or key warnings during normal chart render or empty-state render.

### NFR-I18N-01: Centralised Strings

All chart UI strings (empty state, tooltip labels, axis labels, legend headings) sourced from `lib/i18n/en.ts`. No hardcoded string literals in chart component JSX.

## Exclusions

- Historical data beyond 12 trailing months
- CSV/data export from charts
- Custom date ranges
- Real-time FX fetching during chart rendering
- Chart animations when display currency changes (Recharts default mount animations are acceptable)
