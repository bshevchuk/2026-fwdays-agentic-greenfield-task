# Product Brief — Budget Expense Tracker

> Companion to `docs/requirements.md`. The requirements document is the numbered,
> traceable source of truth; this brief is the business narrative behind it.
> Tone throughout the product is practical and data-forward, no exclamation marks
> (BC-BRAND-01).

## What this is

Budget Expense Tracker is a privacy-first, no-account personal finance web app
that helps a person understand where their money goes and whether they are staying
within self-set limits. It pairs a clean transaction log with per-category budget
limits, multi-currency support, and two charts — spending by category and a
monthly trend — all backed by a SQLite database behind a repository interface
designed to swap to Postgres without touching business logic. There are no
accounts, no third-party analytics, and no paid services.

## Who it is for

The single actor is an **anonymous local user managing personal finances**. There
is no sign-in and no cloud sync in the MVP. The user opens the app, enters
transactions, reviews their budget status, and closes the tab; all data lives in
the server-side SQLite file on the same machine. Anyone with access to the
running URL is a full user — the repo and the live Vercel URL are the primary
demonstrable artifacts (BC-DEMO-01).

## The pain it addresses

Most people tracking personal spending juggle bank exports, spreadsheets, and
mental arithmetic across currencies. Category-level budget limits are rarely
visible at a glance, and when they are they come wrapped in accounts, subscriptions,
and ads. This product reduces that to a single calm screen: add a transaction,
see the category fill up, know at a glance whether the month is on track.

## End-to-end usage

1. **Land.** On first load the user sees a dashboard with an empty transaction
   list and a prompt to add their first entry (FR-SHELL-03). The header shows
   the app name and a currency selector for the display currency (FR-SHELL-01).
   Layout adapts across mobile, tablet, and desktop (FR-SHELL-02).

2. **Add a transaction.** The user opens a modal or inline form and fills in:
   amount, currency (per-transaction, FR-TX-05), date, category, type
   (income / expense), and an optional note (FR-TX-01). Submitting creates a
   record via a Route Handler that writes to the repository layer (TC-REPO-01).
   The transaction list updates immediately (FR-TX-02).

3. **Edit or delete.** The user can open any existing transaction and change any
   field, or delete it with a confirmation step (FR-TX-03/04).

4. **Manage categories.** A dedicated settings panel lets the user create, rename,
   recolor, and re-icon categories, and delete ones that have no transactions
   (FR-CAT-01/02/03/04). Each category carries a display icon chosen from a
   fixed set and a hex color (FR-CAT-02).

5. **Set budget limits.** Per category, the user sets a monthly spending limit in
   their chosen display currency (FR-BUDGET-01). The dashboard shows each
   category's spent-vs-limit as a progress bar — green, yellow, or red by
   threshold (FR-BUDGET-02/03). A category with no limit set shows only its total
   spend (FR-BUDGET-04).

6. **Read the charts.** A donut chart shows spending by category for the current
   (or selected) month (FR-CHART-01). A bar chart below it shows total income
   and total expense per month for the trailing twelve months (FR-CHART-02). Both
   use Recharts and operate on amounts converted to the display currency
   (FR-CHART-03).

7. **Handle currencies.** Each transaction records its own currency and the
   exchange rate against USD at the time of entry (FR-FX-01). Display-currency
   conversion uses stored rates — no live API calls after the rate is fetched once
   per currency per session (FR-FX-02/03). The user can change the display
   currency at any time; all totals and charts re-render (FR-FX-04).

## Key workflows in prose

- **Log a coffee.** Open the add form, type 4.50, pick EUR, choose "Food &
  Drink", tap Save. The category row on the dashboard updates its spend and its
  progress bar. This is the core loop.
- **Review the month.** Glance at the budget-limit bars to see which categories
  are over or close. Scroll to the donut chart for a proportion view. Check the
  monthly bar chart to compare this month to the last few.
- **Fix a mistake.** Click a transaction in the list, change the amount or
  category, save. The dashboard and charts update.
- **Set up a new month.** Budget limits carry over month to month unless the user
  changes them. No manual reset needed.
- **Switch display currency.** Pick a different currency from the header selector;
  all amounts, limits, and charts re-express in that currency using stored rates.

## MVP vs Future boundary

**In the MVP:** the shell and responsive layout, transaction CRUD with
per-transaction currency, a fixed set of categories with icons and colors,
per-category monthly budget limits with colored progress bars, a spending-by-category
donut chart and a monthly income/expense bar chart, multi-currency display
conversion using rates fetched once per session, SQLite via a repository interface,
and Vercel deployment with a preview URL per PR.

**Future (deferred):**

- CSV import and export
- Recurring / scheduled transactions
- User accounts and cloud sync
- Push notifications or budget-limit alerts
- Native mobile app
- Historical reports beyond twelve months
- Bank / open-banking integrations
- Shared budgets or multi-user households

## Operating principles

- **Privacy-first.** No analytics, no trackers, no fingerprinting, no
  application-set cookies beyond what Next.js requires (BC-PRIVACY-01).
- **Repository pattern for persistence.** All database access goes through a
  typed repository interface; SQLite is the default adapter; swapping to Postgres
  requires only a new adapter file (TC-REPO-01/02).
- **Pure business logic.** Budget-limit evaluation, currency conversion, and chart
  data shaping are pure functions in `lib/`; they have no framework or DB
  dependencies and are fully unit-testable (TC-PURE-01).
- **Honest under failure.** No database call or form submission produces a silent
  blank; failures surface as inline messages; the runtime console is clean on a
  healthy session (NFR-OBS-01).
- **English-first and calm.** UI strings are centralised in `lib/i18n/en.ts`;
  tone is practical and data-forward; no exclamation marks (BC-BRAND-01).
