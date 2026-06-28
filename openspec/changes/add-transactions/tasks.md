# Tasks: add-transactions

## 1. Dependencies and database schema

- [x] 1.1 Create `lib/db/migrations/003_transactions.sql`:
  - `DROP TABLE IF EXISTS transactions`
  - `CREATE TABLE transactions (id, amount_cents, currency, rate_to_usd, date, category_id, type, note, created_at)` with all constraints per design KD-1
  - `CHECK(type IN ('expense', 'income'))` on the type column
  - `REFERENCES categories(id) ON DELETE RESTRICT` on category_id
  - `DEFAULT (datetime('now'))` on created_at
  - `CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)`
  - `CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id)`

## 2. Domain logic — write RED tests first, then implement

- [x] 2.1 RED: Create `lib/transactions/migration.test.ts` (`@trace FR-TX-01, FR-TX-06`):
  - Runs migration runner on a fresh in-memory SQLite DB (001 + 002 + 003)
  - Asserts `transactions` table exists after migration
  - Asserts columns present: `id`, `amount_cents`, `currency`, `rate_to_usd`, `date`, `category_id`, `type`, `note`, `created_at`
  - Asserts `PRAGMA foreign_keys = ON` is honoured (INSERT with non-existent category_id fails)
  - Asserts CHECK constraint: inserting `type = 'invalid'` throws; `'expense'` and `'income'` succeed
  - Asserts `note` and `category_id` are nullable (INSERT with both NULL succeeds)
  - Asserts migration is idempotent: running the migration runner twice leaves exactly 3 rows in `_migrations` and the table intact
  - Asserts `countTransactions()` returns 0 on the freshly migrated empty table

- [x] 2.2 RED: Create `lib/transactions/validation.test.ts` (`@trace FR-TX-01, FR-TX-05`):
  - `validateAmount('')` → `{ ok: false }`
  - `validateAmount('abc')` → `{ ok: false }`
  - `validateAmount('-10')` → `{ ok: false }`
  - `validateAmount('0')` → `{ ok: false }` (must be > 0)
  - `validateAmount('49.99')` → `{ ok: true, cents: 4999 }`
  - `validateAmount('49,99')` → `{ ok: true, cents: 4999 }` (decimal comma)
  - `validateAmount('100.00')` → `{ ok: true, cents: 10000 }` (trailing zeros)
  - `validateAmount('1500')` → `{ ok: true, cents: 150000 }` (JPY-style whole number)
  - `validateCurrency('USD')` → true
  - `validateCurrency('EUR')` → true
  - `validateCurrency('XYZ')` → false (not in SUPPORTED_CURRENCIES)
  - `validateCurrency('')` → false
  - `validateDate('2026-06-28')` → true
  - `validateDate('not-a-date')` → false
  - `validateDate('')` → false
  - `validateDate('2026-13-01')` → false (invalid month)
  - `validateType('expense')` → true
  - `validateType('income')` → true
  - `validateType('other')` → false
  - `validateType('')` → false
  - `validateNote(null)` → true (optional)
  - `validateNote('')` → true (empty string allowed)
  - `validateNote('a'.repeat(1000))` → true (at boundary)
  - `validateNote('a'.repeat(1001))` → false (over limit)

- [x] 2.3 RED: Create `lib/transactions/service.test.ts` (`@trace FR-TX-01, FR-TX-02, FR-TX-03, FR-TX-04, FR-TX-06`):
  - Use an in-memory stub implementing `IRepository` (no real SQLite)
  - `listTransactions(repo, { month: '2026-06' })` — stub returns 2 rows; function returns both
  - `listTransactions(repo, { type: 'expense' })` — stub returns only expense rows; function passes filter
  - `createTransaction(repo, validInput)` → `{ ok: true, data: TransactionRow }` (input includes pre-computed `amount_cents` and `rate_to_usd`)
  - `createTransaction(repo, { ...validInput, amount_cents: -1 })` → `{ ok: false, code: 'VALIDATION_ERROR' }`
  - `createTransaction(repo, { ...validInput, currency: 'XYZ' })` → `{ ok: false, code: 'VALIDATION_ERROR' }`
  - `createTransaction(repo, { ...validInput, date: 'bad-date' })` → `{ ok: false, code: 'VALIDATION_ERROR' }`
  - `createTransaction(repo, { ...validInput, type: 'other' as any })` → `{ ok: false, code: 'VALIDATION_ERROR' }`
  - `updateTransaction(repo, 1, { amount_cents: 7550 })` — stub returns updated row → `{ ok: true, data: TransactionRow }`
  - `updateTransaction(repo, 999, { amount_cents: 7550 })` — stub returns undefined → `{ ok: false, code: 'NOT_FOUND' }`
  - `updateTransaction(repo, 1, { amount_cents: -1 })` → `{ ok: false, code: 'VALIDATION_ERROR' }`
  - `updateTransaction(repo, 1, { note: 'a'.repeat(1001) })` → `{ ok: false, code: 'VALIDATION_ERROR' }`
  - `deleteTransaction(repo, 1)` — stub returns true → `{ ok: true }`
  - `deleteTransaction(repo, 999)` — stub returns false → `{ ok: false, code: 'NOT_FOUND' }`

- [x] 2.4 Create `lib/transactions/types.ts` — `TransactionRow`, `CreateTransactionInput`, `UpdateTransactionInput`, `TransactionFilters` as specified in design data model

- [x] 2.5 Create `lib/transactions/validation.ts` — `validateAmount(raw: string): { ok: boolean; cents?: number }`, `validateCurrency(c: string): boolean`, `validateDate(d: string): boolean`, `validateType(t: string): boolean`, `validateNote(n: string | null | undefined): boolean`; import `SUPPORTED_CURRENCIES` from `lib/fx/supported-currencies`; no `next/*` or `react` imports (TC-PURE-01)

- [x] 2.6 Create `lib/transactions/queries.ts` — parameterised SQL constants and builders:
  - `SQL_LIST_TRANSACTIONS` — dynamic WHERE builder accepting month, category_id, type, with LIMIT/OFFSET for pagination
  - `SQL_COUNT_TRANSACTIONS` — companion COUNT(*) for pagination total
  - `SQL_GET_TRANSACTION` — by id
  - `SQL_CREATE_TRANSACTION` — INSERT returning last insert rowid
  - `SQL_DELETE_TRANSACTION` — DELETE by id
  - `buildTransactionUpdateQuery` and `buildTransactionUpdateParams` — dynamic SET clause limited to the allowed mutable fields: `amount_cents`, `currency`, `date`, `category_id`, `type`, `note`; `rate_to_usd` and `created_at` are excluded from the allow-list

- [x] 2.7 Create `lib/transactions/service.ts` — service functions returning discriminated union results:
  - `listTransactions(repo: IRepository, filters: TransactionFilters): TransactionRow[]`
  - `createTransaction(repo: IRepository, input: CreateTransactionInput): { ok: true; data: TransactionRow } | { ok: false; code: string; error: string }`
  - `updateTransaction(repo: IRepository, id: number, input: UpdateTransactionInput): { ok: true; data: TransactionRow } | { ok: false; code: string; error: string }`
  - `deleteTransaction(repo: IRepository, id: number): { ok: true } | { ok: false; code: string; error: string }`

## 3. Services and Server Actions

- [x] 3.1 Extend `lib/db/repository.ts` — add to `IRepository`:
  - `listTransactions(filters: TransactionFilters): TransactionRow[]`
  - `countFilteredTransactions(filters: Omit<TransactionFilters, 'page'>): number`
  - `getTransaction(id: number): TransactionRow | undefined`
  - `createTransaction(input: CreateTransactionInput): TransactionRow`
  - `updateTransaction(id: number, fields: UpdateTransactionInput): TransactionRow | undefined`
  - `deleteTransaction(id: number): boolean`
  - Import `TransactionRow`, `CreateTransactionInput`, `UpdateTransactionInput`, `TransactionFilters` from `lib/transactions/types`

- [x] 3.2 Implement all 6 new methods in `lib/db/adapters/sqlite.ts`:
  - `listTransactions`: use `SQL_LIST_TRANSACTIONS` with dynamic WHERE + pagination
  - `countFilteredTransactions`: use `SQL_COUNT_TRANSACTIONS` with same filter logic
  - `getTransaction`: use `SQL_GET_TRANSACTION`
  - `createTransaction`: INSERT then SELECT by lastInsertRowid
  - `updateTransaction`: use `buildTransactionUpdateQuery` / `buildTransactionUpdateParams`; return undefined if `changes === 0`
  - `deleteTransaction`: return `result.changes > 0`

- [x] 3.3 Add all transaction i18n strings to `lib/i18n/en.ts`:
  - Form labels: `TX_ADD_TITLE`, `TX_EDIT_TITLE`, `TX_FORM_AMOUNT`, `TX_FORM_CURRENCY`, `TX_FORM_DATE`, `TX_FORM_CATEGORY`, `TX_FORM_TYPE`, `TX_FORM_NOTE`
  - Buttons: `TX_ADD_BUTTON`, `TX_SAVE`, `TX_CANCEL`, `TX_DELETE`
  - Type labels: `TX_TYPE_EXPENSE`, `TX_TYPE_INCOME`
  - Filter labels: `TX_FILTER_MONTH`, `TX_FILTER_CATEGORY`, `TX_FILTER_TYPE`, `TX_FILTER_ALL_CATEGORIES`, `TX_FILTER_ALL_TYPES`
  - Delete confirmation: `TX_DELETE_CONFIRM`, `TX_DELETE_CONFIRM_YES`, `TX_DELETE_CONFIRM_NO`
  - Empty states: `TX_EMPTY_FILTER`
  - Errors: `TX_AMOUNT_REQUIRED`, `TX_AMOUNT_NOT_NUMBER`, `TX_AMOUNT_NOT_POSITIVE`, `TX_CURRENCY_REQUIRED`, `TX_CURRENCY_INVALID`, `TX_DATE_REQUIRED`, `TX_DATE_INVALID`, `TX_CATEGORY_REQUIRED`, `TX_TYPE_INVALID`, `TX_NOTE_TOO_LONG`, `TX_NOT_FOUND`, `TX_SERVER_ERROR`, `TX_FX_FETCH_FAILED`

## 4. UI and route handlers

- [x] 4.1 Create `app/api/transactions/route.ts`:
  - `GET /api/transactions` — parses `month`, `category_id`, `type`, `page` query params; validates month format (falls back to current UTC year-month on invalid input); calls `listTransactions` + `countFilteredTransactions`; returns `{ transactions: TransactionRow[]; total: number; page: number; pageSize: number }`
  - `POST /api/transactions` — parses body; validates `amount` string, `currency`, `date`, `type`; calls `GET /api/fx/rates?currency=<currency>` using `new URL('/api/fx/rates', req.url)` to obtain `rate_to_usd`; converts amount string to cents; calls `createTransaction`; returns 201 on success, 422 on validation error, 502 on fx fetch failure

- [x] 4.2 Create `app/api/transactions/[id]/route.ts`:
  - `GET /api/transactions/[id]` — returns the transaction or 404
  - `PUT /api/transactions/[id]` — parses partial body; validates any supplied fields; calls `updateTransaction` (rate NOT re-fetched per KD-4); returns 200 on success, 422 on validation error, 404 if not found
  - `DELETE /api/transactions/[id]` — calls `deleteTransaction`; returns 200 on success, 404 if not found; no body on success

- [x] 4.3 Create `components/transactions/TransactionFilters.tsx` (`'use client'`):
  - Props: `filters: TransactionFilters`, `categories: CategoryFullRow[]`, `onFiltersChange: (f: TransactionFilters) => void`
  - Month picker: `<input type="month">` or select; default = current local YYYY-MM
  - Category select: "All categories" option + one per category
  - Type select: "All types" | "Expense" | "Income"
  - On any change: calls `onFiltersChange` with the updated filters; no full-page reload
  - All labels from `lib/i18n/en.ts`

- [x] 4.4 Create `components/transactions/TransactionForm.tsx` (`'use client'`):
  - Props: `mode: 'add' | 'edit'`, `initial?: TransactionRow`, `categories: CategoryFullRow[]`, `onSuccess: (tx: TransactionRow) => void`, `onCancel: () => void`
  - Currency field: searchable select populated with `SUPPORTED_CURRENCIES`; defaults to `useDisplayCurrency()` context value on add
  - Amount field: accepts decimal and decimal comma
  - Date field: `<input type="date">`; defaults to today's local date on add
  - Type field: segmented control or select with "Expense" / "Income"
  - Category field: required select; shows inline error if submitted without selection
  - Note field: optional textarea; max 1000 chars
  - Client-side validation before submit; inline errors per field using strings from `lib/i18n/en.ts`
  - On submit: calls `POST /api/transactions` (add mode) or `PUT /api/transactions/:id` (edit mode); shows spinner during request; on error response shows inline error below the submit button
  - Edit mode: `rate_to_usd` is not sent in the PUT body

- [x] 4.5 Create `components/transactions/TransactionList.tsx` (`'use client'`):
  - Fetches `GET /api/transactions` on mount and after each successful mutation; manages `filters`, `page`, and `transactions` in local state; shows loading state during fetch
  - Renders `TransactionFilters` with the current filters, passing categories fetched from `GET /api/categories`
  - Renders a table/list of rows; each row shows: date (human-readable e.g. "Jun 15, 2026"), amount + currency (formatted to 2 decimal places), category icon (Lucide icon by name) + category name, type badge ("Expense" / "Income"), note excerpt (truncated at 80 chars with "…" using CSS `text-overflow: ellipsis` or JS slice)
  - "Add transaction" button above the list opens `TransactionForm` in add mode (sets `showForm: true` and `formMode: 'add'`)
  - Edit icon/button per row opens `TransactionForm` in edit mode with that row as `initial`
  - Delete button per row shows a confirmation modal (two-button: "Delete" / "Cancel") using `TX_DELETE_CONFIRM` string; on confirm calls `DELETE /api/transactions/:id`; on success removes row from local state without refetch
  - On empty filtered result: shows `TX_EMPTY_FILTER` message (not the shell empty state)
  - On zero total transactions: shows `EMPTY_STATE_HEADING` + `EMPTY_STATE_BODY` copy and a "Add your first transaction" CTA button (`EMPTY_STATE_CTA`)
  - Pagination: "Previous" / "Next" buttons; disabled when at first/last page; shows "Page N of M"
  - Browser console must emit no errors or warnings (NFR-OBS-01)

- [x] 4.6 Update `app/page.tsx` (Server Component):
  - Remove conditional `countTransactions()` check and static `EmptyState` component
  - Import and render `<TransactionList />` unconditionally; TransactionList fetches categories itself (simpler implementation per design KD-8)

## 5. Tests

- [x] 5.1 Verify `lib/transactions/migration.test.ts` turns GREEN after 1.1 and 2.4–2.7 are complete
- [x] 5.2 Verify `lib/transactions/validation.test.ts` turns GREEN after 2.5 is complete
- [x] 5.3 Verify `lib/transactions/service.test.ts` turns GREEN after 2.7 and 3.1 are complete
- [x] 5.4 Run `npm run test:run` — all pre-existing tests (shell, categories, fx) still pass; zero regressions

## 6. Validation, docs, and archive prep

- [x] 6.1 `npm run lint` — zero warnings or errors; `@trace` annotations present on all new test files referencing their FR IDs
- [x] 6.2 `npm run test:run` — full suite green
- [x] 6.3 `npm run build` — no TypeScript errors; no unused imports; check that `frankfurter.app` does not appear in `.next/static/` (TC-FX-01 still holds)
- [x] 6.4 `npx openspec validate add-transactions --strict` — skipped (openspec CLI not installed in this environment)
- [x] 6.5 `npx openspec validate --all --strict` — skipped (openspec CLI not installed)
- [x] 6.6 Update `docs/current-state.md` — record completion timestamp (Europe/Kyiv), phase, and list all new files; update next task to `add-budget-limits`
- [ ] 6.7 Manual real-DB smoke test — run `npm run dev` and verify happy-path flows
- [ ] 6.8 `npx openspec archive add-transactions --yes` — run only after all smoke test steps in 6.7 pass
