# Change Proposal: add-transactions

## Why

Transactions are the core data of the Budget Expense Tracker — without them,
the product has nothing to display, filter, or aggregate. This is slice 3 in the
serial delivery path, and it depends on both `add-categories` (category foreign key)
and `add-fx` (rate fetch infrastructure) being merged first.

The shell (slice 1) established a placeholder `transactions(id, amount_cents)` table
in `001_initial.sql` so that `countTransactions()` could compile without a real schema.
That table must be replaced with the full production schema. Migration 003 performs a
safe DROP + CREATE to achieve this — the placeholder table has never held application
data, so the DROP is non-destructive. All subsequent slices (budget-limits, charts)
read from the full schema written here.

This change also wires the empty-state CTA button that `add-shell` placed on the
dashboard. After this slice lands, clicking "Add your first transaction" opens the
TransactionForm modal, and the list on `app/page.tsx` updates without a full-page
reload after every successful mutation.

## What Changes

### Database
- `lib/db/migrations/003_transactions.sql` — drops the placeholder table and
  creates `transactions` with nine columns: `id`, `amount_cents`, `currency`,
  `rate_to_usd`, `date`, `category_id`, `type` (CHECK constraint), `note`, and
  `created_at`. Adds indexes on `date` and `category_id` for filter performance.

### Domain layer (`lib/transactions/`)
- `types.ts` — `TransactionRow`, `CreateTransactionInput`, `UpdateTransactionInput`,
  `TransactionFilters`
- `validation.ts` — validators for amount (positive decimal or decimal comma),
  currency (against `SUPPORTED_CURRENCIES`), date (YYYY-MM-DD), type, and note
- `queries.ts` — parameterised SQL for list (with dynamic WHERE clauses), get, insert,
  update, delete
- `service.ts` — `listTransactions`, `createTransaction`, `updateTransaction`,
  `deleteTransaction`; all return discriminated union results; rate is passed in by
  the caller (route handler) so the service remains framework-free (TC-PURE-01)

### Repository
- `IRepository` extended with transaction CRUD methods
- `SqliteRepository` implements all new methods

### API
- `app/api/transactions/route.ts` — GET (filtered list), POST (create; route handler
  fetches rate from `/api/fx/rates` before calling service)
- `app/api/transactions/[id]/route.ts` — GET, PUT (update, no rate re-fetch), DELETE

### UI
- `components/transactions/TransactionFilters.tsx` — month picker, category select,
  type select; all filters applied client-side without full-page reload
- `components/transactions/TransactionForm.tsx` — modal for add and edit; currency
  picker defaults to display currency; inline validation errors; fetches rate on submit
- `components/transactions/TransactionList.tsx` — paginated list with date, amount +
  currency, category icon + name, type badge, note excerpt per FR-TX-07
- `app/page.tsx` — updated to always render `TransactionList`; the list component
  handles both the empty state (with CTA) and the populated state internally

### i18n
- All new transaction strings added to `lib/i18n/en.ts`; no inline literals

## Impact

- **Unlocks:** `add-budget-limits` (slice 4) and `add-charts` (slice 5) — both depend
  on the full transactions schema and CRUD API established here.
- **Modifies:** `lib/db/repository.ts`, `lib/db/adapters/sqlite.ts`, `lib/i18n/en.ts`,
  `app/page.tsx`. All changes are additive or gated to the transactions table.
- **Breaking change on placeholder table:** The 003 migration DROPs `transactions`.
  The `countTransactions()` method on `SqliteRepository` continues to work after
  recreation — the SELECT COUNT(*) target table name is unchanged.
- **No categories or fx changes:** those modules are read-only consumers here.
