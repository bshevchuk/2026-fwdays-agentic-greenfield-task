# Proposal: add-budget-limits

## Why

Transactions are tracked but there is no spending ceiling. Users cannot tell at a glance whether they are on track for the month. This slice surfaces month-to-date expense spend against a per-category limit as a color-coded progress bar on the dashboard.

## What

- `lib/budget/status.ts` — `budgetStatus(transactions, limit, displayCurrency, rates)` pure function; no framework imports (TC-PURE-01); returns `{ spent, ratio, status: 'ok'|'warning'|'over' }`
- `PUT /api/categories/[id]/limit` Route Handler — sets or clears the limit; rejects negatives inline
- Budget limit input wired into `CategoryForm.tsx`
- `components/BudgetDashboard.tsx` — progress bars per category with limit; spend-only row for unlimitless categories; current-month filter; colors green/yellow/red
- i18n keys for all new strings

## Impact

- No new migration: `budget_limit REAL` already exists on `categories` from 002_categories.sql
- Extends `/api/categories/[id]` router with a new sub-resource `/limit`
- `IRepository` gains no new methods: category CRUD already exposes `budget_limit`, and transaction queries via `listTransactions` are reused
- `budgetStatus` is pure — exercisable in plain Vitest without any Next.js runtime

## Covered FRs

FR-BUDGET-01 (set/clear limit), FR-BUDGET-02 (dashboard progress bars), FR-BUDGET-03 (color thresholds), FR-BUDGET-04 (categories without limits), FR-BUDGET-05 (pure function + TC-PURE-01)
