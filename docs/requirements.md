# PRD — Budget Expense Tracker

Last updated: 2026-06-28

This document is the **single source of truth** for what the product does and
what constraints govern it. Every requirement has a stable ID. Specs, tests,
PRs, and recordings reference these IDs to keep traceability intact.

Refer to [docs/product-brief.md](product-brief.md) for narrative context.

## ID conventions

| Prefix   | Meaning                    | Example                                      |
| -------- | -------------------------- | -------------------------------------------- |
| `FR-*`   | Functional Requirement     | `FR-TX-01` — user adds a transaction         |
| `NFR-*`  | Non-Functional Requirement | `NFR-PERF-01` — TTFB < 300 ms               |
| `TC-*`   | Technical Constraint       | `TC-STACK-01` — Next.js App Router           |
| `BC-*`   | Business / UX Constraint   | `BC-PRIVACY-01` — no analytics               |

Status values: `proposed` · `accepted` · `shipped` · `dropped`.

---

## Functional requirements

### Shell & navigation (capability `shell`)

| ID          | Description                                                                                                                          | Status   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-SHELL-01 | Single-page app with a top bar (logo, display-currency selector, optional theme toggle) and a main content area                      | proposed |
| FR-SHELL-02 | Layout adapts at 768 px and 1280 px breakpoints; mobile single-column, tablet two-column, desktop three-column                       | proposed |
| FR-SHELL-03 | Empty state on first load: prompt copy + "Add your first transaction" button prominently centered                                    | proposed |

### Transactions (capability `transactions`)

| ID       | Description                                                                                                                                    | Status   |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-TX-01 | User can add a transaction via a modal form: amount (decimal), currency (per-transaction), date, category, type (income / expense), optional note | proposed |
| FR-TX-02 | Transaction list on the dashboard updates immediately after add without full-page reload                                                        | proposed |
| FR-TX-03 | User can edit any field of an existing transaction via the same modal form                                                                     | proposed |
| FR-TX-04 | User can delete a transaction with a confirmation step (no accidental deletes)                                                                 | proposed |
| FR-TX-05 | Currency field on the transaction form shows a searchable list of ISO 4217 codes; defaults to the current display currency                     | proposed |
| FR-TX-06 | Transaction list supports filtering by month, category, and type (income / expense); defaults to the current calendar month                    | proposed |
| FR-TX-07 | Transaction list is paginated or virtualized; shows date, amount + currency, category icon + name, type badge, note excerpt                    | proposed |

### Categories (capability `categories`)

| ID        | Description                                                                                                                           | Status   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-CAT-01 | User can create a category with a name, icon (chosen from a fixed set of ~30 icons), and hex color                                    | proposed |
| FR-CAT-02 | User can rename, recolor, or change the icon of an existing category at any time                                                      | proposed |
| FR-CAT-03 | User can delete a category only if it has no associated transactions; otherwise show an inline error                                  | proposed |
| FR-CAT-04 | A default set of categories is seeded on first run (e.g. Food & Drink, Transport, Housing, Health, Entertainment, Income, Other)      | proposed |

### Budget limits (capability `budget-limits`)

| ID           | Description                                                                                                                                       | Status   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-BUDGET-01 | User can set a monthly spending limit (in display currency) per category; limit is stored per category, not per month                             | proposed |
| FR-BUDGET-02 | Dashboard shows each category's month-to-date spend vs. limit as a labeled progress bar                                                           | proposed |
| FR-BUDGET-03 | Progress bar color: green when spend < 80 % of limit, yellow when 80–99 %, red when ≥ 100 %                                                       | proposed |
| FR-BUDGET-04 | Categories without a limit show only their month-to-date spend total, no progress bar                                                            | proposed |
| FR-BUDGET-05 | `budgetStatus(transactions, limit, displayCurrency, rates): { spent: number; ratio: number; status: 'ok'|'warning'|'over' }` is a pure function in `lib/budget/status.ts` | proposed |

### Charts (capability `charts`)

| ID          | Description                                                                                                                         | Status   |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-CHART-01 | Donut chart: spending by category for the selected month, amounts in display currency, legend with category color and name          | proposed |
| FR-CHART-02 | Bar chart: total income and total expense per calendar month for the trailing 12 months, in display currency                       | proposed |
| FR-CHART-03 | Both charts use Recharts; all amounts converted to display currency via stored rates before rendering                               | proposed |
| FR-CHART-04 | Charts are client-only components; SSR placeholder is a same-footprint skeleton                                                    | proposed |
| FR-CHART-05 | Hovering a chart segment shows a tooltip with category name, raw amount in display currency, and percentage of total                | proposed |

### Multi-currency (capability `fx`)

| ID       | Description                                                                                                                                          | Status   |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-FX-01 | Each transaction stores its own ISO 4217 currency code and the exchange rate to USD at time of entry                                                 | proposed |
| FR-FX-02 | On transaction creation the app fetches the current USD rate for the transaction currency from a free keyless API (e.g. frankfurter.app); rate is stored with the record | proposed |
| FR-FX-03 | Within a session, rates already fetched are cached in memory; no duplicate network calls for the same currency in the same session                  | proposed |
| FR-FX-04 | Changing the display currency re-derives all totals, progress bars, and chart amounts without re-fetching from the DB                               | proposed |
| FR-FX-05 | `convertAmount(amount, fromCurrency, toCurrency, rates): number` is a pure function in `lib/fx/convert.ts`                                           | proposed |

---

## Non-functional requirements

| ID          | Description                                                                                                         | Status   |
| ----------- | ------------------------------------------------------------------------------------------------------------------- | -------- |
| NFR-PERF-01 | Vercel Preview TTFB ≤ 300 ms on p95 for the dashboard page                                                         | proposed |
| NFR-PERF-02 | Lighthouse Performance ≥ 90 on production URL (mobile + desktop)                                                   | proposed |
| NFR-PERF-03 | Initial client JS payload ≤ 200 KB gzipped                                                                         | proposed |
| NFR-A11Y-01 | Lighthouse Accessibility ≥ 95; all interactive elements have visible focus styles and accessible names              | proposed |
| NFR-A11Y-02 | Color palette meets WCAG AA contrast ratio in both light and dark themes                                            | proposed |
| NFR-OBS-01  | Console is silent at runtime (no warnings, no errors) on a healthy session                                          | proposed |
| NFR-DX-01   | `npm run lint && tsc --noEmit && npm test && npm run build` finish in < 60 s on a clean checkout                    | proposed |
| NFR-I18N-01 | All product UI strings centralised in `lib/i18n/en.ts`; no runtime i18n library in MVP                             | proposed |

---

## Technical constraints

| ID           | Description                                                                                                                                              | Status   |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| TC-STACK-01  | Next.js 15 App Router; TypeScript strict; React 19                                                                                                       | accepted |
| TC-STACK-02  | Tailwind CSS 4 (PostCSS plugin); shadcn/ui; class-variance-authority                                                                                     | accepted |
| TC-STACK-03  | Recharts for all data visualisations                                                                                                                     | accepted |
| TC-STACK-04  | Vitest for unit tests on `lib/`; no Playwright in MVP                                                                                                   | proposed |
| TC-REPO-01   | All DB access goes through a typed repository interface (`lib/db/repository.ts`); no SQL or ORM calls outside the adapter layer                          | accepted |
| TC-REPO-02   | SQLite is the default adapter (`lib/db/adapters/sqlite.ts`) using `better-sqlite3`; switching to Postgres requires only a new adapter that satisfies the same interface | accepted |
| TC-REPO-03   | DB schema migrations are managed by a minimal migration runner in `lib/db/migrate.ts`; no external migration framework in MVP                            | proposed |
| TC-PURE-01   | `lib/` is framework-free: no `next/*`, no `react`, no DOM globals — enables 100 % Vitest unit-testability                                                | accepted |
| TC-API-01    | All DB mutations are performed via Next.js Route Handlers (`app/api/`); no direct DB calls from Client Components                                        | proposed |
| TC-DEPLOY-01 | Vercel for hosting; SQLite file persisted via Vercel's file-system volume or a mounted path; preview URL per PR via Git integration                       | proposed |
| TC-FX-01     | Exchange rates fetched from `frankfurter.app` (free, keyless); fetched in a Route Handler, never from the client bundle                                  | proposed |

---

## Business / UX constraints

| ID            | Description                                                                                                          | Status   |
| ------------- | -------------------------------------------------------------------------------------------------------------------- | -------- |
| BC-PRIVACY-01 | No analytics, no third-party trackers, no fingerprinting                                                             | accepted |
| BC-PRIVACY-02 | No application-set cookies beyond what Next.js runtime requires                                                      | accepted |
| BC-BRAND-01   | UI is English-first; tone is calm and practical; no exclamation marks                                                | proposed |
| BC-BRAND-02   | Footer credits frankfurter.app for exchange rates with a hyperlink                                                   | proposed |
| BC-DEMO-01    | The repo and live Vercel URL are the workshop's primary artifacts; every requirement is publicly demonstrable         | accepted |

---

## Out of scope (MVP)

- CSV import and export
- Recurring / scheduled transactions
- User accounts, authentication, or cloud sync
- Push notifications or over-budget alerts
- Native mobile app
- Historical reports beyond twelve trailing months
- Bank / open-banking integrations
- Shared budgets or multi-user households
- Dark / light theme toggle (deferred to post-MVP)
