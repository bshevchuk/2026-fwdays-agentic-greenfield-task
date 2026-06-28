# Change Design: add-transactions

## Goals

1. Replace the placeholder `transactions` table with a full production schema in an
   idempotent, safe migration that does not require a database reset.
2. Deliver complete CRUD for transactions behind typed Route Handlers (TC-API-01).
3. Keep the `lib/transactions/` service layer framework-free (TC-PURE-01); rate
   fetching belongs to the route handler, not the service.
4. Enforce FR-FX-01 rate immutability: the stored `rate_to_usd` is set at creation
   time and is never modified on subsequent edits.
5. Wire the empty-state CTA to open TransactionForm so the dashboard has a real entry
   path (FR-SHELL-03 + FR-TX-01).
6. All UI strings sourced from `lib/i18n/en.ts` (NFR-I18N-01).

## Non-Goals

- Soft-delete or undo — hard delete is used for MVP simplicity.
- Recurring or scheduled transactions.
- Free-text search; only month, category, and type filters are in scope.
- Budget-limit progress bars and chart aggregates — those are slices 4 and 5.
- Rate refresh on edit — the stored rate is immutable by spec.
- Client JS bundle size impact beyond what shadcn/ui modal adds (NFR-PERF-03
  is primarily owned by add-charts).

---

## Key Decisions

### KD-1: Safe recreation of the transactions table in migration 003

**Context:** `001_initial.sql` created `transactions(id INTEGER PK, amount_cents
INTEGER NOT NULL)` as a placeholder so `countTransactions()` would compile. The
full schema needs seven additional columns. Five of them — `currency`, `rate_to_usd`,
`date`, `type`, and `created_at` — are `NOT NULL`. SQLite's `ALTER TABLE ADD COLUMN`
requires any added `NOT NULL` column to have a DEFAULT value; a sentinel default for
`currency` or `rate_to_usd` would be semantically wrong and produce silent data
corruption on any future reads of those rows.

**Decision:** `003_transactions.sql` uses `DROP TABLE IF EXISTS transactions;` followed
by `CREATE TABLE transactions (...)` with the full schema. This is safe for three
reasons:

1. The placeholder table has never held application data. There is no
   transaction-creation UI, API, or Route Handler in slices 1, 2a, or 2b. The only
   write ever made to the placeholder was the schema itself — there are zero data rows
   to lose.
2. The migration runner wraps each migration file in a SQLite transaction. If
   `003_transactions.sql` fails for any reason, the entire file rolls back and is not
   recorded in `_migrations`. The table therefore cannot be left in a dropped state
   without the runner also not recording the migration.
3. Once recorded in `_migrations`, the file is skipped on every subsequent cold start.
   The `IF EXISTS` guard on the DROP additionally means the statement is a no-op if
   called on a fresh database where no prior migration created the table yet.

**Why not ALTER?** Even with synthetic DEFAULTs, adding `NOT NULL DEFAULT 'USD'` to
`currency` would mean any future schema inspection or tooling would show every row from
the pre-data era having `currency = 'USD'` — a data lie. A clean DROP + CREATE is the
correct choice when the table is known-empty.

**ADR note:** No new ADR is needed. This is a one-time act permitted by TC-REPO-03
(minimal migration runner; no external framework; idempotent migrations).

**The final schema for `003_transactions.sql`:**

```sql
DROP TABLE IF EXISTS transactions;

CREATE TABLE transactions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  amount_cents INTEGER NOT NULL,
  currency     TEXT    NOT NULL,
  rate_to_usd  REAL    NOT NULL,
  date         TEXT    NOT NULL,
  category_id  INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
  type         TEXT    NOT NULL CHECK(type IN ('expense', 'income')),
  note         TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_date        ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
```

`ON DELETE RESTRICT` on `category_id` lets SQLite enforce referential integrity when
`PRAGMA foreign_keys = ON` is set by the adapter (which the migration runner sets
at connection time). This reinforces the service-layer guard in `add-categories` at
the DB level as well, defense-in-depth.

### KD-2: Amount stored as integer cents; decimal comma parsing

**Context:** Floating-point arithmetic on monetary values produces rounding errors.
FR-TX-01 accepts a decimal amount from the user (e.g. `49.99`).

**Decision:** Store all amounts as `INTEGER NOT NULL` representing cent-equivalent
integer units (amount × 100, rounded to nearest integer). On read, divide by 100 for
display. This is the standard approach for financial integers in SQLite.

`validateAmount` accepts both `.` and `,` as decimal separators (e.g. `49,99` → 49.99)
before multiplying by 100. This satisfies the AGENTS.md correctness rule: "Numeric
parsers accept trailing zeros and decimal commas."

**Trade-off for minor currencies:** Currencies without subunits (JPY, KRW) will store
`1500 JPY` as `150000` (i.e. 1500.00 in the 2-decimal model). This is arithmetically
correct for display (150000 / 100 = 1500.00 → format as "1500 JPY") and does not
introduce rounding error. Storing subunit-precision for these currencies would require
a `currency_precision` lookup table — deferred to post-MVP.

### KD-3: Rate fetch happens in the route handler, not the service

**Context:** `lib/transactions/service.ts` must be framework-free (TC-PURE-01) —
no `next/*`, no `fetch`, no DOM globals. But FR-FX-02 requires fetching the current
USD rate on transaction creation.

**Decision:** The POST route handler at `app/api/transactions/route.ts` is responsible
for fetching the rate. It calls `GET /api/fx/rates?currency=XXX` using the base URL
derived from the incoming request (`new URL('/api/fx/rates', req.url)`). This reuses
the existing session cache (FR-FX-03) and the frankfurter.app error handling already
implemented in that route. Once the rate is obtained, the handler passes it to
`createTransaction(repo, { ...parsedInput, rate_to_usd })` — the service only validates
and persists.

If the fx rates call returns a non-2xx response, the POST handler returns HTTP 502 to
the client with `en.TX_FX_FETCH_FAILED` as the error body. The form surfaces this
message inline (not a raw 500).

**Why not import fetcher.ts directly?** `lib/fx/fetcher.ts` performs a Node.js
`fetch()` call to an external service. Importing it into the service layer would couple
the service to the external I/O, making it impossible to unit-test without network
mocking. Keeping rate fetch in the route handler means the service test can inject a
pre-built `CreateTransactionInput` with a hard-coded `rate_to_usd: 1.08` and never
touch the network.

### KD-4: Edit does not re-fetch or overwrite the stored rate (FR-FX-01 immutability)

**Context:** FR-FX-01 states each transaction stores "the exchange rate to USD at time
of entry." An edit that re-fetches the rate would change the stored rate silently,
distorting historical totals calculated by downstream slices (add-budget-limits reads
`rate_to_usd` to convert amounts to display currency for the current month).

**Decision:** `UpdateTransactionInput` does not include a `rate_to_usd` field.
The PUT route handler for `app/api/transactions/[id]/route.ts` does not call the fx
rates endpoint. The `updateTransaction` service function issues an `UPDATE` statement
that explicitly excludes `rate_to_usd` and `created_at` from the set of updatable
columns. Any attempt to pass `rate_to_usd` in the PUT body is silently ignored after
TypeScript strips unknown fields at the Zod parse boundary.

### KD-5: Month filter defaults to client's local calendar month

**Context:** FR-TX-06 says the list defaults to the current calendar month with no
category or type restriction. Dates are stored as `TEXT` in `YYYY-MM-DD` ISO 8601
format (local date, as entered by the user).

**Decision:** The `TransactionFilters.tsx` client component determines the default
month by reading `new Date()` on the client and formatting it as `YYYY-MM`. This is
passed as a query parameter to `GET /api/transactions?month=YYYY-MM`. The route
handler validates that the `month` parameter matches `/^\d{4}-\d{2}$/`; if it does not
(e.g. `?month=not-a-date`), it falls back to the server's current UTC year-month. The
list SQL uses `date LIKE 'YYYY-MM-%'` for month filtering, which is fast on the
`idx_transactions_date` index.

**Trade-off:** Because dates are entered as local dates and filtered by the local month
on the client, a user who travels across midnight on the last day of a month may see
their transaction appear in a different month's view than they expect. This is
acceptable for MVP (no multi-timezone requirement).

### KD-6: Hard delete with a confirmation step

**Context:** FR-TX-04 requires a confirmation dialog before deletion. The spec
exclusions explicitly state "deletion is immediate and permanent; there is no recovery
flow."

**Decision:** `deleteTransaction(repo, id)` issues `DELETE FROM transactions WHERE id =
?` and returns `{ ok: true }` or `{ ok: false, code: 'NOT_FOUND' }`. No `deleted_at`
column or archive table. The confirmation is a browser-native `window.confirm` or a
modal dialog with "Delete" / "Cancel" buttons using strings from `lib/i18n/en.ts`.
A native `window.confirm` is simpler but not accessible (NFR-A11Y-01); a modal button
pair is preferred.

### KD-7: Pagination with a fixed page size

**Context:** FR-TX-07 requires the list to be "paginated or virtualized." Virtualization
requires measuring row heights and managing scroll offset — complex for an MVP. Simple
page-based pagination is sufficient.

**Decision:** Fixed page size of 25 records per page. The route handler accepts an
optional `page` query parameter (default `1`). The SQL uses `LIMIT 25 OFFSET (page-1)*25`
with a separate `SELECT COUNT(*)` for the total count so the UI can render a "Next /
Previous" control. The `TransactionList` component holds `page` as local state and
re-fetches on change.

### KD-8: EmptyState CTA wiring in app/page.tsx

**Context:** `app/page.tsx` (Server Component) currently conditionally renders
`EmptyState` when `countTransactions() === 0`. FR-SHELL-03 requires the CTA button,
and FR-TX-02 requires the list to update without a full-page reload.

**Decision:** Update `app/page.tsx` to always render `<TransactionList />` (a Client
Component). `TransactionList` fetches its own data from `/api/transactions` on mount
and manages state client-side. When the fetched list is empty, `TransactionList`
renders the empty-state copy and CTA button internally using strings from
`lib/i18n/en.ts`. This removes the server-side `countTransactions()` check from the
page and eliminates the static `EmptyState` import from the page. The CTA button
inside `TransactionList` sets a `showForm` boolean state to `true`, opening the
`TransactionForm` modal in add mode.

**Trade-off:** The initial dashboard page load now fetches transaction data client-side
after hydration rather than server-side rendering the list. For the MVP dataset (no
pre-existing transactions), this is a blank-list fetch and the latency is negligible.
Server-rendering the list would require passing DB data through a Server Component tree
alongside a Client Component shell — a pattern that adds complexity; deferred to
post-MVP.

---

## Data Model

### Table: transactions (after 003 migration)

| Column        | Type        | Constraints                                      | Notes                                  |
|---------------|-------------|--------------------------------------------------|----------------------------------------|
| id            | INTEGER     | PRIMARY KEY AUTOINCREMENT                        |                                        |
| amount_cents  | INTEGER     | NOT NULL                                         | amount × 100; divide by 100 to display |
| currency      | TEXT        | NOT NULL                                         | ISO 4217; validated against SUPPORTED_CURRENCIES |
| rate_to_usd   | REAL        | NOT NULL                                         | rate at entry time; never updated      |
| date          | TEXT        | NOT NULL                                         | YYYY-MM-DD local date                  |
| category_id   | INTEGER     | REFERENCES categories(id) ON DELETE RESTRICT     | nullable allowed (category optional)   |
| type          | TEXT        | NOT NULL CHECK(type IN ('expense', 'income'))    |                                        |
| note          | TEXT        | nullable                                         | plain text; max 1000 chars             |
| created_at    | TEXT        | NOT NULL DEFAULT (datetime('now'))               | UTC; server-generated                  |

### TypeScript types

```typescript
// lib/transactions/types.ts

export interface TransactionRow {
  id: number;
  amount_cents: number;
  currency: string;
  rate_to_usd: number;
  date: string;
  category_id: number | null;
  type: 'expense' | 'income';
  note: string | null;
  created_at: string;
}

export interface CreateTransactionInput {
  amount_cents: number;    // pre-computed by route handler
  currency: string;
  rate_to_usd: number;    // fetched by route handler from /api/fx/rates
  date: string;
  category_id: number | null;
  type: 'expense' | 'income';
  note?: string | null;
}

export interface UpdateTransactionInput {
  amount_cents?: number;  // route handler re-validates and converts from raw amount
  currency?: string;      // changing currency on edit does NOT re-fetch rate
  date?: string;
  category_id?: number | null;
  type?: 'expense' | 'income';
  note?: string | null;
  // rate_to_usd is intentionally absent — immutable after creation
}

export interface TransactionFilters {
  month?: string;         // YYYY-MM; defaults to current local calendar month
  category_id?: number;
  type?: 'expense' | 'income';
  page?: number;          // 1-indexed; default 1
}
```

---

## Error Handling Strategy

Service functions return a discriminated union:

```
{ ok: true;  data: T }
{ ok: false; code: 'VALIDATION_ERROR' | 'NOT_FOUND'; error: string }
```

Route handlers translate these to HTTP:
- `VALIDATION_ERROR` → 422 `{ error: string }` (inline UI display)
- `NOT_FOUND` → 404 `{ error: string }`
- fx rates call returns non-2xx → 502 `{ error: en.TX_FX_FETCH_FAILED }`
- Unexpected thrown exception → caught, logged to `process.stderr`, returned as
  500 `{ error: 'Internal error' }` (NFR-OBS-01: never a raw unhandled rejection)

The `TransactionForm` component treats any `error` field in the response body as an
inline error below the form's submit button. Validation errors for individual fields
(blank amount, missing category) are caught client-side before the request is sent.

---

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| DROP TABLE in 003 runs on a DB that somehow already has transaction data | Very low | `_migrations` tracking prevents re-run; proposal notes the table is guaranteed empty before slice 3 lands. Add an assertion in `migration.test.ts` that the table count is 0 before the DROP path. |
| Self-referential route call (`/api/fx/rates` from POST handler) fails in some deploy configurations | Low | Use `new URL('/api/fx/rates', req.url)` to derive the absolute URL from the incoming request; works on Vercel and localhost. Add smoke test step. |
| `PRAGMA foreign_keys` not set before INSERT, allowing orphaned category_id | Low | The migration runner sets `PRAGMA foreign_keys = ON` immediately after opening the connection; verify in migration.test.ts. |
| Decimal comma amounts (`49,99`) silently become `NaN` if not parsed before validation | Medium | `validateAmount` normalises commas to dots before `parseFloat`; a dedicated test case ensures this branch is covered. |
| Note field with >1000 characters accepted at the DB level but rejected by the validator | Low | Validator enforces 1000-char max; `migration.test.ts` does not test this DB-level (SQLite TEXT has no length limit). The discrepancy is documented in service exclusions. |
