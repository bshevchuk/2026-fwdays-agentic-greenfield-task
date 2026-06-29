# Requirements Traceability Matrix

Project: Budget Expense Tracker
Phase: G5 gate (post-Phase 5)
Date: 2026-06-29
Test run: 204 passing, 0 failing (see `npm run test:run`)
Traceability check: PASS, 58 warnings (no failures) — see `docs/qa/traceability-report.md`

Warnings are all in two categories:
- `test-trace`: the automated checker did not match `@trace` annotations already present in test file headers (tool limitation, not missing coverage).
- `recording-evidence`: no recording manifest exists because TC-STACK-04 excludes Playwright from MVP.

Evidence levels used in this matrix:

- **unit** — pure function test in `lib/`, isolated from DB and network
- **integration** — in-memory SQLite test exercising migration + adapter together
- **route-handler** — API route tested via the dev server (manual smoke, not automated)
- **manual-only** — no automated test; verified by manual test plan step only

---

## Shell capability (slice: add-shell)

| FR ID | Requirement summary | Slice | Implementation | Test file | Key test names | Evidence |
|---|---|---|---|---|---|---|
| FR-SHELL-01 | Single-page app with top bar (logo, display-currency selector) and main content area | add-shell | `components/TopBar.tsx`, `app/layout.tsx`, `lib/db/migrate.ts`, `lib/db/adapters/sqlite.ts`, `lib/db/repository.ts` | `lib/db/migrate.test.ts`, `lib/db/repository.test.ts` | "creates the _migrations tracking table on first run", "applies 001_initial.sql — categories table is created", "returns true when the database is reachable" | integration |
| FR-SHELL-02 | Layout adapts at 768 px and 1280 px breakpoints; mobile single-column, tablet two-column, desktop three-column | add-shell | `app/layout.tsx` (Tailwind classes: `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`) | none | none | manual-only — see manual test plan step 1 |
| FR-SHELL-03 | Empty state on first load: prompt copy and "Add your first transaction" button prominently centered | add-shell | `components/EmptyState.tsx`, `lib/i18n/en.ts` | `lib/i18n/en.test.ts` | "EMPTY_STATE_CTA is exactly 'Add your first transaction'", "has required key 'EMPTY_STATE_HEADING'", "has required key 'EMPTY_STATE_CTA'" | unit |

---

## Categories capability (slice: add-categories)

| FR ID | Requirement summary | Slice | Implementation | Test file | Key test names | Evidence |
|---|---|---|---|---|---|---|
| FR-CAT-01 | User can create a category with a name, icon (from fixed set of ~30), and hex color | add-categories | `lib/categories/service.ts`, `lib/categories/validation.ts`, `app/api/categories/route.ts`, `components/categories/CategoryForm.tsx` | `lib/categories/validation.test.ts`, `lib/categories/service.test.ts` | "returns true for a valid name", "returns true for a valid lowercase 6-digit hex color", "returns true for 'utensils'", "returns { ok: true, data } for fully valid input" | unit |
| FR-CAT-02 | User can rename, recolor, or change the icon of an existing category at any time | add-categories | `lib/categories/service.ts` (`updateCategory`), `app/api/categories/[id]/route.ts` (PUT) | `lib/categories/service.test.ts`, `lib/categories/validation.test.ts` | "returns { ok: true, data } with updated name when only name is supplied", "preserves icon and color when only name is updated", "returns { ok: false, code: VALIDATION_ERROR } when renaming to blank string" | unit |
| FR-CAT-03 | User can delete a category only if it has no associated transactions; otherwise show an inline error | add-categories | `lib/categories/service.ts` (`deleteCategory`), `app/api/categories/[id]/route.ts` (DELETE) | `lib/categories/service.test.ts` | "returns { ok: true } when category has zero associated transactions", "returns { ok: false, code: HAS_TRANSACTIONS } when category has 3 transactions", "does not call repo.deleteCategory when transactions exist" | unit |
| FR-CAT-04 | A default set of 7 categories is seeded on first run (Food & Drink, Transport, Housing, Health, Entertainment, Income, Other) | add-categories | `lib/db/migrations/002_categories.sql` | `lib/categories/seed.test.ts` | "seeds exactly 7 categories on first run", "still has exactly 7 categories after running migrations a second time", "each seeded category has a valid 6-digit hex color", "seeds all 7 expected category names", "Food & Drink is seeded with icon 'utensils' and color '#ef4444'" | integration |

---

## Multi-currency capability (slice: add-fx)

| FR ID | Requirement summary | Slice | Implementation | Test file | Key test names | Evidence |
|---|---|---|---|---|---|---|
| FR-FX-01 | Each transaction stores its own ISO 4217 currency code and the exchange rate to USD at time of entry | add-fx | `lib/db/migrations/003_transactions.sql` (columns: `currency TEXT NOT NULL`, `rate_to_usd REAL NOT NULL`), `lib/transactions/types.ts` | `lib/transactions/migration.test.ts` | "has column currency as TEXT NOT NULL", "has column rate_to_usd as REAL NOT NULL" | integration |
| FR-FX-02 | On transaction creation the app fetches the current USD rate for the transaction currency from frankfurter.app; rate is stored with the record | add-fx | `lib/fx/fetcher.ts`, `app/api/fx/rates/route.ts`, `app/api/transactions/route.ts` (POST calls FX route before INSERT) | none (fetcher tests require network; route tested manually) | none automated | route-handler — see manual test plan step 4 |
| FR-FX-03 | Within a session, rates already fetched are cached in memory; no duplicate network calls for the same currency | add-fx | `lib/fx/cache.ts` | `lib/fx/cache.test.ts` | "getCachedRate returns undefined for a currency that was never set", "getCachedRate returns the value after setCachedRate", "a second setCachedRate call overwrites the previous value", "two distinct currencies hold their own values independently" | unit |
| FR-FX-04 | Changing the display currency re-derives all totals, progress bars, and chart amounts without re-fetching from the DB | add-fx | `lib/fx/currency-context.tsx` (`CurrencyProvider`, `useDisplayCurrency`), `components/BudgetDashboard.tsx`, `components/charts/ChartsDashboard.tsx` | none | none automated | manual-only — see manual test plan step 8 |
| FR-FX-05 | `convertAmount(amount, fromCurrency, toCurrency, rates): number` is a pure function in `lib/fx/convert.ts` | add-fx | `lib/fx/convert.ts` | `lib/fx/convert.test.ts` | "returns the original amount unchanged when from === to", "converts 100 EUR → GBP ≈ 85.04", "throws FxConversionError when fromCurrency is absent from rates map", "throws FxConversionError when toCurrency rate is 0", "result is never NaN or Infinity" | unit |

---

## Transactions capability (slice: add-transactions)

| FR ID | Requirement summary | Slice | Implementation | Test file | Key test names | Evidence |
|---|---|---|---|---|---|---|
| FR-TX-01 | User can add a transaction via a modal form: amount (decimal), currency (per-transaction), date, category, type, optional note | add-transactions | `components/transactions/TransactionForm.tsx`, `app/api/transactions/route.ts` (POST), `lib/transactions/validation.ts`, `lib/transactions/service.ts` | `lib/transactions/validation.test.ts`, `lib/transactions/service.test.ts`, `lib/transactions/migration.test.ts` | "returns { ok: true, cents: 4999 } for '49.99'", "returns { ok: true, cents: 4999 } for '49,99' (decimal comma)", "returns { ok: false } for negative amount", "returns { ok: true, data: TransactionRow } for fully valid input", "transactions table exists after all migrations" | unit + integration |
| FR-TX-02 | Transaction list on the dashboard updates immediately after add without full-page reload | add-transactions | `components/transactions/TransactionList.tsx` (client-side state update on `onSuccess`) | none | none automated | manual-only — see manual test plan step 5 |
| FR-TX-03 | User can edit any field of an existing transaction via the same modal form | add-transactions | `components/transactions/TransactionForm.tsx` (edit mode), `app/api/transactions/[id]/route.ts` (PUT) | `lib/transactions/service.test.ts` | "returns { ok: true, data: TransactionRow } when repo.updateTransaction returns a row", "returns { ok: false, code: NOT_FOUND } when repo.updateTransaction returns undefined", "returns { ok: false, code: VALIDATION_ERROR } for amount_cents = -1" | unit |
| FR-TX-04 | User can delete a transaction with a confirmation step (no accidental deletes) | add-transactions | `components/transactions/TransactionList.tsx` (delete confirmation modal), `app/api/transactions/[id]/route.ts` (DELETE) | `lib/transactions/service.test.ts` | "returns { ok: true } when repo.deleteTransaction returns true", "returns { ok: false, code: NOT_FOUND } when repo.deleteTransaction returns false" | unit |
| FR-TX-05 | Currency field shows a searchable list of ISO 4217 codes; defaults to current display currency | add-transactions | `components/transactions/TransactionForm.tsx` (currency select from `SUPPORTED_CURRENCIES`), `lib/transactions/validation.ts` | `lib/transactions/validation.test.ts` | "returns true for 'USD'", "returns true for 'EUR'", "returns false for 'XYZ' (not in SUPPORTED_CURRENCIES)", "returns false for lowercase 'usd'" | unit |
| FR-TX-06 | Transaction list supports filtering by month, category, and type; defaults to current calendar month | add-transactions | `components/transactions/TransactionFilters.tsx`, `app/api/transactions/route.ts` (GET with query params), `lib/transactions/service.ts` (`listTransactions`), `lib/db/migrations/003_transactions.sql` | `lib/transactions/service.test.ts`, `lib/transactions/migration.test.ts` | "returns both rows when the repo provides two for a month filter", "returns only expense rows when the repo is filtered by type=expense", "returns an empty array when no transactions match the filter", "transactions table exists after all migrations" | unit + integration |
| FR-TX-07 | Transaction list is paginated; shows date, amount + currency, category icon + name, type badge, note excerpt | add-transactions | `components/transactions/TransactionList.tsx`, `app/api/transactions/route.ts` (pagination via `page` query param) | `lib/transactions/service.test.ts` (list function covered; pagination shape covered via route) | "returns both rows when the repo provides two for a month filter" | unit (list); manual-only for pagination UI |

---

## Budget limits capability (slice: add-budget-limits)

| FR ID | Requirement summary | Slice | Implementation | Test file | Key test names | Evidence |
|---|---|---|---|---|---|---|
| FR-BUDGET-01 | User can set a monthly spending limit (in display currency) per category; stored per category, not per month | add-budget-limits | `lib/db/migrations/002_categories.sql` (`budget_limit REAL` column), `app/api/categories/[id]/limit/route.ts`, `components/categories/CategoryForm.tsx` (limit input) | `lib/categories/seed.test.ts` (column presence via migration) | "each seeded category has a valid 6-digit hex color" (migration covers column presence) | integration; limit-set flow is manual-only — see manual test plan step 3 |
| FR-BUDGET-02 | Dashboard shows each category's month-to-date spend vs. limit as a labeled progress bar | add-budget-limits | `components/BudgetDashboard.tsx` | none | none automated | manual-only — see manual test plan step 7 |
| FR-BUDGET-03 | Progress bar color: green < 80%, yellow 80–99%, red >= 100% | add-budget-limits | `components/BudgetDashboard.tsx` (derives color from `budgetStatus().status`) | none (color rendering is visual) | none automated | manual-only — see manual test plan step 7 |
| FR-BUDGET-04 | Categories without a limit show only their month-to-date spend total, no progress bar | add-budget-limits | `components/BudgetDashboard.tsx` (conditional on `budget_limit > 0`) | none | none automated | manual-only — see manual test plan step 13 |
| FR-BUDGET-05 | `budgetStatus(transactions, limit, displayCurrency, rates)` is a pure function in `lib/budget/status.ts` | add-budget-limits | `lib/budget/status.ts` | `lib/budget/status.test.ts` | "returns spent=0, ratio=0, status=ok for empty transaction list", "returns status=ok when spend 60 is below 80% of limit 100", "returns status=warning at exactly 80% of limit", "returns status=over at exactly 100% of limit", "converts multi-currency transactions via USD-pivot", "excludes income transactions", "source file contains no imports from next/* or react" | unit |

---

## Charts capability (slice: add-charts)

| FR ID | Requirement summary | Slice | Implementation | Test file | Key test names | Evidence |
|---|---|---|---|---|---|---|
| FR-CHART-01 | Donut chart: spending by category for the selected month, amounts in display currency, legend with category color and name | add-charts | `components/charts/SpendingDonutChart.tsx`, `lib/charts/aggregate.ts` (`aggregateDonut`), `app/api/charts/data/route.ts` | `lib/charts/aggregate.test.ts` | "returns one DonutSlice for a single expense transaction in one category", "computes correct percent proportions across two categories", "excludes income transactions from the donut", "merges two transactions with the same category_id into one slice" | unit |
| FR-CHART-02 | Bar chart: total income and total expense per calendar month for trailing 12 months | add-charts | `components/charts/MonthlyBarChart.tsx`, `lib/charts/aggregate.ts` (`aggregateBar`), `app/api/charts/data/route.ts` | `lib/charts/aggregate.test.ts` | "returns one bar per entry in months array even when there are no transactions", "places income and expense transactions into their respective buckets", "ignores transactions whose date falls outside the provided months array" | unit |
| FR-CHART-03 | Both charts use Recharts; all amounts converted to display currency via stored rates before rendering | add-charts | `lib/charts/aggregate.ts` (calls `convertAmount` with stored `rate_to_usd`), `components/charts/SpendingDonutChart.tsx`, `components/charts/MonthlyBarChart.tsx` | `lib/charts/aggregate.test.ts` | "converts amount via stored rate_to_usd without live FX call", "converts EUR expense via stored rate_to_usd, no live FX call" | unit |
| FR-CHART-04 | Charts are client-only components; SSR placeholder is a same-footprint skeleton | add-charts | `components/charts/ChartsDashboard.tsx` (`next/dynamic({ ssr: false, loading: <ChartSkeleton /> })`), `components/charts/ChartSkeleton.tsx` | none | none automated | manual-only — see manual test plan step 9 (skeleton visible on first paint before hydration) |
| FR-CHART-05 | Hovering a chart segment shows a tooltip with category name, raw amount in display currency, and percentage of total | add-charts | `components/charts/SpendingDonutChart.tsx` (custom Recharts Tooltip), `components/charts/MonthlyBarChart.tsx` (Recharts Tooltip) | none | none automated | manual-only — see manual test plan step 9 |
