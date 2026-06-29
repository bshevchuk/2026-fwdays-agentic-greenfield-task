# Design: add-budget-limits

## KD-1: No new migration

`budget_limit REAL` was added in `002_categories.sql`. The column is nullable (NULL = no limit). Setting limit to 0 or clearing the field saves NULL. No `004_*.sql` migration is needed.

## KD-2: `budgetStatus` signature

Per spec FR-BUDGET-05:

```ts
budgetStatus(
  transactions: TransactionRow[],
  limit: number,
  displayCurrency: string,
  rates: Record<string, number>
): { spent: number; ratio: number; status: 'ok' | 'warning' | 'over' }
```

The function receives the pre-filtered transaction array (caller filters to category + month), converts each transaction's `amount_cents` to display currency via `convertAmount`, sums expense-only rows, then applies thresholds:
- `ratio < 0.8` → `'ok'`
- `0.8 ≤ ratio < 1.0` → `'warning'`
- `ratio ≥ 1.0` → `'over'`

The function imports only `convertAmount` and `TransactionRow`. No `next/*`, no `react`, no DOM (TC-PURE-01).

## KD-3: Threshold precision

The spec uses exact boundary values at 80% and 100%. Implementation uses `ratio < 0.8`, `ratio < 1.0` (strict). Edge cases confirmed by spec scenarios: ratio = 0.8 → warning; ratio = 1.0 → over.

## KD-4: API design — separate `/limit` sub-resource

`PUT /api/categories/[id]/limit` with body `{ limit: number | null }` instead of folding into `PUT /api/categories/[id]`. Reasons:
1. The limit update is a single-field concern; no other category fields need to change simultaneously.
2. Keeps the existing PUT route logic unchanged.
3. Maps cleanly to a dedicated Route Handler file `app/api/categories/[id]/limit/route.ts`.

Validation: body.limit must be `null` or `> 0` (number); reject negative with 422 + `{ error: en.BUDGET_LIMIT_INVALID }`.

## KD-5: Dashboard rendering strategy

`components/BudgetDashboard.tsx` is a Client Component (`'use client'`). It fetches from `GET /api/transactions?month=YYYY-MM&type=expense` and `GET /api/categories` on mount, then computes `budgetStatus` locally using the already-fetched FX rate (passed via `useDisplayCurrency` context + a rates fetch to `/api/fx/rates`). This avoids a new `/api/charts/data`-style endpoint — that aggregation endpoint belongs to the add-charts slice.

The dashboard renders inside `app/page.tsx` alongside `TransactionList`.

## KD-6: Limit field in CategoryForm

`CategoryForm.tsx` gets a `budgetLimit` field: optional number input. Empty string = clear limit (sent as `null`). Positive decimal accepted. Display: type=number, min=0, step=any. Inline error if value ≤ 0 (not null).

## KD-7: FX rate in budgetStatus

`budgetStatus` uses `rate_to_usd` stored on each `TransactionRow` at entry time (the same rate used for display elsewhere). The `rates` map passed in is `{ [currency]: rate_to_usd }`. `convertAmount(amount, fromCurrency, toCurrency, rates)` does the USD-pivot conversion. This matches the exact FX scenario in FR-BUDGET-05.

## KD-8: Amount unit in budgetStatus

Transactions store `amount_cents` (integer). `budgetStatus` works in display-currency units (not cents) for the `spent` return value. Conversion: `convertAmount(row.amount_cents / 100, row.currency, displayCurrency, rates)`. The limit is stored as a raw decimal (e.g. 250.00) in the same display currency.

## Module layout

```
lib/budget/
  status.ts          — pure budgetStatus function
  status.test.ts     — RED tests first
```
