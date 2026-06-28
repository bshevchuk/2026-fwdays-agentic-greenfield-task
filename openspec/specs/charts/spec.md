# Charts Specification

## Purpose

The charts capability renders two interactive data visualisations on the
dashboard: a donut chart that breaks down spending by category for the
currently selected month, and a bar chart that shows total income versus
total expense for each of the trailing twelve calendar months. Both charts
use Recharts, operate as client-only React components with an SSR skeleton
to avoid layout shift, and display all monetary values converted to the
active display currency via stored exchange rates.

---

## Requirements

### Requirement: Category Spending Donut Chart (FR-CHART-01, FR-CHART-03)

The dashboard renders a donut chart that summarises expense transactions for
the selected month, grouped by category. Each segment's arc length is
proportional to that category's share of total spending. A legend alongside
the chart lists each category by its assigned color swatch and name. All
amounts are converted to the active display currency using stored rates
before the chart component receives any data; no live API call is made at
render time (FR-CHART-03).

#### Scenario: Donut segments reflect category spending proportions

- GIVEN the selected month contains expense transactions spread across three
  categories (Food: 120 USD, Transport: 30 USD, Health: 50 USD) and the
  display currency is USD
- WHEN the donut chart renders
- THEN three segments appear whose combined arc equals a full circle, and
  the arc length of the Food segment is visually the largest (120/200 = 60 %)

#### Scenario: Legend shows category color swatch and name for each segment

- GIVEN the selected month contains expenses in two categories: "Food &
  Drink" (color #F97316) and "Transport" (color #3B82F6)
- WHEN the donut chart renders
- THEN the legend contains exactly two entries; each entry has the category
  color swatch followed by the category name text; no other decorations are
  present

#### Scenario: Amounts shown in the active display currency

- GIVEN a transaction of 100 EUR exists as an expense in category "Food" for
  the selected month, the display currency is USD, and the stored USD/EUR
  rate is 1.08
- WHEN the donut chart renders
- THEN the segment for "Food" represents 108.00 USD (100 × 1.08) and any
  visible label or tooltip shows the USD amount, not EUR

#### Scenario: Only one expense category in the selected month

- GIVEN the selected month contains expense transactions in exactly one
  category
- WHEN the donut chart renders
- THEN a single full-circle segment is shown; the legend contains one entry;
  the chart does not error or collapse

#### Scenario: No expense transactions for the selected month

- GIVEN the selected month contains no expense transactions (either the month
  has no transactions at all, or all transactions are income)
- WHEN the donut chart renders
- THEN an explicit empty-state message is displayed within the chart area
  (e.g. "No spending data for this month"); the chart area is not a blank
  white rectangle and the page layout is stable

---

### Requirement: Monthly Income vs Expense Bar Chart (FR-CHART-02, FR-CHART-03)

The dashboard renders a bar chart showing, for each of the twelve trailing
calendar months, two adjacent bars: one representing total income and one
representing total expenses. The rightmost bar group is the current calendar
month. All amounts are converted to the active display currency via stored
rates; no live FX API call is made during rendering (FR-CHART-03).

#### Scenario: Twelve month columns are always rendered

- GIVEN the current date is 2026-06-28 and the user has transactions going
  back to 2025-07
- WHEN the bar chart renders
- THEN the chart contains exactly twelve month columns spanning Jul 2025
  through Jun 2026, one income bar and one expense bar per column

#### Scenario: Income and expense bars reflect converted totals

- GIVEN June 2026 contains income of 500 EUR and expenses of 200 EUR, the
  display currency is USD, and the stored EUR→USD rate is 1.08
- WHEN the bar chart renders the June column
- THEN the income bar represents 540.00 USD and the expense bar represents
  216.00 USD

#### Scenario: Month with no transactions shows zero-height bars, not missing bars

- GIVEN one of the twelve trailing months contains no transactions whatsoever
- WHEN the bar chart renders
- THEN that month's column contains two bars of zero height (flat line at the
  baseline); the column label is still visible; no gap appears in the chart

#### Scenario: Month with income only shows zero-height expense bar

- GIVEN a month contains income transactions but no expense transactions
- WHEN the bar chart renders that month's column
- THEN the income bar has positive height and the expense bar has zero height;
  both bars are present in the DOM and no console error is emitted

#### Scenario: Month with expenses only shows zero-height income bar

- GIVEN a month contains expense transactions but no income transactions
- WHEN the bar chart renders that month's column
- THEN the expense bar has positive height and the income bar has zero height;
  both bars are present and no console error is emitted

---

### Requirement: Recharts as the Exclusive Chart Library (FR-CHART-03)

Both the donut chart and the bar chart are implemented using the Recharts
component library (TC-STACK-03). No other chart library is introduced.

#### Scenario: Donut chart is a Recharts PieChart with innerRadius > 0

- GIVEN the charts capability is implemented
- WHEN the source of the donut chart component is inspected
- THEN it imports and uses `PieChart` and `Pie` from `recharts`, and the
  `Pie` element has an `innerRadius` prop set to a value greater than zero

#### Scenario: Bar chart is a Recharts BarChart

- GIVEN the charts capability is implemented
- WHEN the source of the bar chart component is inspected
- THEN it imports and uses `BarChart` and `Bar` from `recharts`

---

### Requirement: Client-only Components with SSR Skeleton (FR-CHART-04)

Chart components are marked `"use client"` and are not server-rendered.
During SSR (before client-side JavaScript executes), the server emits a
skeleton placeholder that occupies the same dimensions as the fully rendered
chart so that no content layout shift (CLS) occurs on hydration.

#### Scenario: SSR HTML contains skeleton, not chart SVG

- GIVEN JavaScript is disabled or the response is captured before hydration
- WHEN the dashboard page HTML is inspected
- THEN the chart mount areas contain skeleton elements (e.g. animated
  placeholder divs) of the same height and width as the final charts; no
  `<svg>` chart elements are present in the server-rendered HTML

#### Scenario: No layout shift on hydration

- GIVEN the dashboard page loads in a browser with JavaScript enabled
- WHEN Recharts hydrates and replaces the skeleton with the live chart
- THEN the surrounding page content does not shift position; Cumulative Layout
  Shift (CLS) for the chart area is 0

#### Scenario: Skeleton matches chart footprint

- GIVEN the donut chart renders at 300 px × 300 px and the bar chart at
  600 px × 240 px (or whatever the design specifies)
- WHEN the skeleton is inspected in the SSR HTML
- THEN the skeleton divs have identical width and height attributes so that
  the page height before and after hydration is the same

---

### Requirement: Hover Tooltips on Chart Segments (FR-CHART-05)

Hovering over any segment of the donut chart or any bar of the bar chart
shows a tooltip. For the donut chart the tooltip contains the category name,
the spending amount in the active display currency, and the percentage share
of total spending. For the bar chart the tooltip contains the month label
and the income and expense totals in the active display currency.

#### Scenario: Donut segment tooltip shows category name, amount, and percentage

- GIVEN the donut chart is rendered with a "Food" segment representing 120 USD
  out of a 200 USD total (60 %)
- WHEN the user hovers the pointer over the "Food" segment
- THEN a tooltip appears containing: the text "Food", the amount "120.00 USD"
  (formatted in the display currency), and the percentage "60 %"; no raw
  numeric IDs or internal keys are visible

#### Scenario: Donut tooltip amount is in the display currency

- GIVEN the display currency is EUR and a category segment represents 108 EUR
  converted from 100 USD
- WHEN the user hovers that segment
- THEN the tooltip shows "108.00 EUR" not the original USD amount

#### Scenario: Bar chart tooltip shows income and expense totals for the month

- GIVEN the bar chart is rendered and June 2026 has income 540 USD and
  expenses 216 USD
- WHEN the user hovers over either bar in the June 2026 column
- THEN a tooltip appears containing the month label "Jun 2026", the income
  value "540.00 USD", and the expense value "216.00 USD"

#### Scenario: Tooltip disappears when pointer leaves the segment

- GIVEN a tooltip is visible because the user hovered a chart segment
- WHEN the pointer moves outside the chart area
- THEN the tooltip is no longer visible in the DOM or is hidden

---

### Requirement: Client JS Bundle Size (NFR-PERF-03)

The addition of Recharts and chart-related code must not push the initial
client-side JavaScript payload above 200 KB gzipped. Chart components should
be lazy-loaded where feasible to defer their weight beyond the initial bundle.

#### Scenario: Initial JS payload stays within budget

- GIVEN the application is built with `npm run build` and deployed
- WHEN the network tab of a fresh dashboard page load is inspected
- THEN the total gzipped JavaScript transferred on the initial load is at
  most 200 KB

---

### Requirement: Silent Console on Healthy Session (NFR-OBS-01)

During normal chart rendering with valid data, no warnings or errors appear
in the browser console. This includes Recharts prop-type warnings, React
hydration mismatches, and key-prop warnings.

#### Scenario: No console output during chart render with data

- GIVEN the dashboard has transactions for the current month and trailing
  twelve months
- WHEN the page fully loads and both charts render
- THEN the browser console contains no warnings, errors, or unhandled promise
  rejections

#### Scenario: No console output during empty-state render

- GIVEN the selected month has no transactions
- WHEN the donut chart renders its empty state
- THEN the browser console contains no warnings or errors

---

### Requirement: UI Strings Centralised in i18n Module (NFR-I18N-01)

All user-visible text strings emitted by chart components — including empty
state messages, tooltip labels, axis labels, and legend headings — are sourced
from `lib/i18n/en.ts`. No string literals are hardcoded directly in chart
component JSX.

#### Scenario: Empty-state message comes from i18n module

- GIVEN the donut chart renders its empty state
- WHEN the rendered text is compared against `lib/i18n/en.ts`
- THEN every visible string in the empty state can be found as a value in
  `lib/i18n/en.ts`; the component JSX contains no standalone string literals

#### Scenario: Tooltip label keys reference i18n values

- GIVEN a bar chart tooltip is visible
- WHEN the tooltip text is compared against `lib/i18n/en.ts`
- THEN labels such as "Income", "Expenses", and month names (if overridden)
  are drawn from `lib/i18n/en.ts`

---

## Explicit Exclusions

The following are intentionally outside the scope of this capability and
must not be reported as bugs or missing features:

- **Historical data beyond twelve trailing months** — the bar chart covers
  exactly twelve months; older data is not surfaced in any chart.
- **CSV or data export from charts** — charts are display-only; no download
  button or export mechanism is provided.
- **Custom date ranges** — users cannot select arbitrary start/end dates for
  either chart; the donut chart uses the month selected globally on the
  dashboard and the bar chart always shows the trailing twelve months.
- **Pie chart alternative** — the donut chart is the only circular chart
  variant; a flat pie (innerRadius = 0) is not supported.
- **Real-time FX rate fetching during chart rendering** — exchange rates are
  pre-stored at transaction creation time; chart rendering uses only those
  stored rates with no network calls.
- **Chart animations or transitions between display currencies** — Recharts
  default mount animations are acceptable but no custom transition is required
  when the display currency changes.
