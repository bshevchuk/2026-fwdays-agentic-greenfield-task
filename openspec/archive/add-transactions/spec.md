# Transactions Specification

## Purpose

The transactions capability is the core data-entry and data-review surface of the
Budget Expense Tracker. It lets a user record income and expense events (each with
an amount, currency, date, category, type, and optional note), browse and filter
those records in a paginated list, and correct or remove any record at any time. All
mutations travel through Next.js Route Handlers; the dashboard list refreshes
client-side immediately after every change with no full-page reload.

---

## ADDED Requirements

### Requirement: Add transaction via modal form (FR-TX-01)

A user can open a modal form and submit a new transaction. The form collects:
amount (decimal), currency (ISO 4217, per-transaction), date, category (required),
type (`income` or `expense`), and an optional note. The modal is the only entry
point for creating transactions in MVP. All mutations go through a Route Handler
(`POST /api/transactions`) per TC-API-01. All UI strings are sourced from
`lib/i18n/en.ts` (NFR-I18N-01).

#### Scenario: Happy path — add a valid expense

- GIVEN the dashboard is open and at least one category exists
- WHEN the user clicks the "Add transaction" button, fills in amount `49.99`,
  currency `USD`, date `2026-06-15`, selects category "Food & Drink", type
  `expense`, leaves note blank, and clicks "Save"
- THEN the Route Handler `POST /api/transactions` receives the payload with those
  exact field values
- AND the handler responds with HTTP 201 and the persisted transaction record
  (including a server-generated `id` and `createdAt`)
- AND the browser console emits no errors or warnings (NFR-OBS-01)
- AND the modal closes

#### Scenario: Happy path — add a valid income with a note

- GIVEN the dashboard is open and a category "Salary" exists
- WHEN the user fills in amount `3200.00`, currency `EUR`, date `2026-06-01`,
  category "Salary", type `income`, note "June paycheck", and clicks "Save"
- THEN the route handler persists the record with `type = 'income'` and
  `note = 'June paycheck'`
- AND responds with HTTP 201

#### Scenario: Error — blank amount

- GIVEN the modal form is open
- WHEN the user leaves the amount field empty and clicks "Save"
- THEN the form does NOT submit to the server
- AND an inline validation error appears adjacent to the amount field using the
  string from `lib/i18n/en.ts` (e.g. "Amount is required")
- AND the modal remains open

#### Scenario: Error — non-numeric amount

- GIVEN the modal form is open
- WHEN the user types `abc` in the amount field and clicks "Save"
- THEN the form does NOT submit to the server
- AND an inline validation error "Amount must be a number" appears adjacent to the
  amount field
- AND the modal remains open

#### Scenario: Error — negative amount

- GIVEN the modal form is open
- WHEN the user types `-10` in the amount field and clicks "Save"
- THEN the form does NOT submit to the server
- AND an inline validation error "Amount must be greater than zero" appears adjacent
  to the amount field
- AND the modal remains open

#### Scenario: Error — missing category

- GIVEN the modal form is open
- WHEN the user fills in a valid amount, currency, date, and type but leaves
  category unselected, and clicks "Save"
- THEN the form does NOT submit to the server
- AND an inline validation error "Category is required" appears adjacent to the
  category field
- AND the modal remains open

#### Scenario: Error — missing date

- GIVEN the modal form is open
- WHEN the user clears the date field and clicks "Save"
- THEN the form does NOT submit to the server
- AND an inline validation error "Date is required" appears adjacent to the date
  field
- AND the modal remains open

---

### Requirement: Dashboard list updates immediately after add (FR-TX-02)

After a transaction is successfully saved, the transaction list on the dashboard
reflects the new record without a full-page navigation or browser reload.

#### Scenario: Happy path — new record appears in list without reload

- GIVEN the dashboard transaction list is visible and shows N records
- WHEN the user adds a valid transaction via the modal and the Route Handler
  responds with HTTP 201
- THEN the transaction list shows N + 1 records
- AND the new record is visible (subject to the active month filter matching the
  new transaction's date)
- AND no full-page reload occurs (navigation history length is unchanged)
- AND the browser console emits no errors or warnings (NFR-OBS-01)

#### Scenario: Error — server error on add does not corrupt list

- GIVEN the dashboard transaction list shows N records
- WHEN the Route Handler responds with HTTP 500 for a save attempt
- THEN the transaction list still shows N records (unchanged)
- AND an error message is displayed to the user (inline or toast) using a string
  from `lib/i18n/en.ts`
- AND no full-page reload occurs

---

### Requirement: Edit an existing transaction (FR-TX-03)

A user can open the same modal form pre-populated with any existing transaction's
fields and submit changes. All fields are editable. The mutation goes through a
Route Handler (`PATCH /api/transactions/[id]`) per TC-API-01.

#### Scenario: Happy path — edit amount and note

- GIVEN a transaction with id `T1`, amount `50.00`, note `""` exists
- WHEN the user opens the edit modal for `T1`, changes amount to `75.50`, types
  note "corrected", and clicks "Save"
- THEN the Route Handler `PATCH /api/transactions/T1` is called with
  `{ amount: 75.50, note: 'corrected' }`
- AND the handler responds with HTTP 200 and the updated record
- AND the dashboard list reflects the updated amount and note without a full-page
  reload

#### Scenario: Happy path — change type from expense to income

- GIVEN a transaction with type `expense` exists
- WHEN the user opens the edit modal, switches type to `income`, and clicks "Save"
- THEN the handler persists `type = 'income'` for that record
- AND the dashboard list updates to show the corrected type badge

#### Scenario: Error — edit produces invalid amount

- GIVEN the edit modal is open for an existing transaction
- WHEN the user clears the amount field and clicks "Save"
- THEN the form does NOT submit to the server
- AND the same inline validation rules as for add apply (blank, non-numeric,
  negative are each rejected with their respective messages)
- AND the modal remains open with the last valid field values preserved

#### Scenario: Error — editing a non-existent transaction

- GIVEN a transaction `T_DELETED` was deleted between page load and edit attempt
- WHEN the Route Handler `PATCH /api/transactions/T_DELETED` is called
- THEN the handler responds with HTTP 404
- AND the UI surfaces an inline error message from `lib/i18n/en.ts`

---

### Requirement: Delete a transaction with confirmation (FR-TX-04)

A user can delete a transaction only after confirming a second action. There is no
undo. The mutation goes through a Route Handler (`DELETE /api/transactions/[id]`)
per TC-API-01.

#### Scenario: Happy path — confirm delete removes record

- GIVEN a transaction with id `T2` is visible in the list
- WHEN the user clicks the delete action on `T2`
- THEN a confirmation dialog or prompt appears, containing the text from
  `lib/i18n/en.ts` (e.g. "Delete this transaction? This cannot be undone.")
- WHEN the user confirms the deletion
- THEN the Route Handler `DELETE /api/transactions/T2` responds with HTTP 200
- AND the record is removed from the dashboard list without a full-page reload
- AND the browser console emits no errors or warnings (NFR-OBS-01)

#### Scenario: Error — user cancels the confirmation

- GIVEN the delete confirmation dialog is visible for transaction `T2`
- WHEN the user clicks "Cancel" (or closes the dialog)
- THEN no request is sent to the server
- AND the transaction `T2` remains in the list unchanged

#### Scenario: Error — delete a non-existent transaction

- GIVEN a transaction `T_GONE` was already deleted externally
- WHEN the Route Handler `DELETE /api/transactions/T_GONE` is called
- THEN the handler responds with HTTP 404
- AND the UI surfaces an inline error using a string from `lib/i18n/en.ts`

---

### Requirement: Searchable ISO 4217 currency picker (FR-TX-05)

The currency field in the add/edit modal shows a searchable list of ISO 4217
currency codes. The field defaults to the current display currency set in the shell.

#### Scenario: Happy path — default currency is pre-selected

- GIVEN the display currency in the shell top bar is `EUR`
- WHEN the user opens the "Add transaction" modal
- THEN the currency field is pre-populated with `EUR`

#### Scenario: Happy path — user searches and selects a different currency

- GIVEN the add modal is open with currency defaulting to `USD`
- WHEN the user types `JPY` in the currency search input
- THEN the list filters to show `JPY` (and any other matching codes)
- WHEN the user selects `JPY`
- THEN the currency field value is `JPY`
- AND the transaction is saved with `currency = 'JPY'`

#### Scenario: Error — unrecognized currency code not accepted

- GIVEN the currency picker is open
- WHEN the user types an arbitrary string `XYZ` that is not a valid ISO 4217 code
- THEN no selectable option appears in the list (or a "No results" message is shown)
- AND the form cannot be submitted with `XYZ` as the currency value

---

### Requirement: Filter list by month, category, and type (FR-TX-06)

The transaction list supports filtering by calendar month, category, and
transaction type. The default filter on page load is the current calendar month
with no category or type restriction.

#### Scenario: Happy path — default filter shows current month only

- GIVEN today is 2026-06-28 and transactions exist for both June and May 2026
- WHEN the dashboard loads without any URL filter parameters
- THEN only transactions dated in June 2026 are shown in the list
- AND the month filter control displays "June 2026"

#### Scenario: Happy path — change month filter

- GIVEN the list is showing June 2026 transactions
- WHEN the user selects "May 2026" in the month filter
- THEN the list updates to show only transactions dated in May 2026
- AND no full-page reload occurs

#### Scenario: Happy path — filter by category

- GIVEN transactions exist across multiple categories for the selected month
- WHEN the user selects category "Transport" in the category filter
- THEN only transactions belonging to "Transport" are shown
- AND the list updates without a full-page reload

#### Scenario: Happy path — filter by type (expense)

- GIVEN both income and expense transactions exist for the selected month
- WHEN the user selects type "expense" in the type filter
- THEN only expense transactions are shown in the list

#### Scenario: Happy path — combined filters

- GIVEN transactions of mixed categories and types exist in June 2026
- WHEN the user sets month = June 2026, category = "Food & Drink", type = expense
- THEN only expense transactions in "Food & Drink" for June 2026 appear

#### Scenario: Happy path — no results message

- GIVEN no transactions exist for the selected filter combination
- WHEN the filter is applied
- THEN the list shows an empty-state message using a string from `lib/i18n/en.ts`
  (e.g. "No transactions for this period.")
- AND no error is raised in the browser console (NFR-OBS-01)

#### Scenario: Error — invalid month parameter in URL

- GIVEN a user navigates directly to the dashboard with `?month=not-a-date`
- THEN the app falls back to the current calendar month filter
- AND no error is raised in the browser console (NFR-OBS-01)

---

### Requirement: Paginated / virtualized transaction list (FR-TX-07)

The transaction list is paginated or virtualized so that large data sets do not
degrade page responsiveness. Each row displays: date, amount + currency,
category icon + name, type badge, and note excerpt (truncated if long). The page
response time must stay within NFR-PERF-01 (TTFB ≤ 300 ms p95 on the dashboard
route).

#### Scenario: Happy path — list row displays all required columns

- GIVEN a transaction exists with date `2026-06-15`, amount `49.99`, currency
  `USD`, category "Food & Drink" (icon and name), type `expense`, note
  "Lunch with team"
- WHEN the user views the transaction list with the June 2026 filter active
- THEN the row for that transaction shows:
  - date formatted as a human-readable value (e.g. "Jun 15, 2026")
  - amount and currency "49.99 USD"
  - category icon for "Food & Drink" plus the label "Food & Drink"
  - a type badge labelled "Expense" (string from `lib/i18n/en.ts`)
  - a note excerpt showing at minimum the first characters of "Lunch with team"

#### Scenario: Happy path — note excerpt is truncated for long notes

- GIVEN a transaction has a note of 300 characters
- WHEN the list renders that row
- THEN the note excerpt shown is visually truncated (e.g. ending with "...")
  and does NOT cause the row to overflow its container

#### Scenario: Happy path — pagination advances to next page

- GIVEN more transactions exist for the selected month than fit on one page
- WHEN the user navigates to the next page (clicks "Next" or equivalent control)
- THEN the list shows the next batch of transactions
- AND previously visible records are no longer shown
- AND the browser console emits no errors or warnings (NFR-OBS-01)

#### Scenario: Happy path — TTFB budget

- GIVEN the dashboard page is deployed to Vercel Preview
- WHEN the dashboard route is requested cold (no in-process cache)
- THEN the server response Time to First Byte is ≤ 300 ms at p95 (NFR-PERF-01)

#### Scenario: Error — list with zero transactions shows empty state

- GIVEN no transactions have been recorded at all
- WHEN the dashboard loads
- THEN the list area shows the empty-state copy defined in `lib/i18n/en.ts`
  (not an error screen or a blank page)

---

## Explicit exclusions (MVP)

The following items are intentionally out of scope for the MVP transactions
capability. Testers must not file these as bugs.

- **Bulk / CSV import or export** — transactions are created one at a time via the
  modal form only.
- **Recurring or scheduled transactions** — every transaction is an independent,
  manually created record.
- **Undo / redo or soft-delete** — deletion is immediate and permanent; there is
  no recovery flow.
- **Item-level images or file attachments** — the note field is plain text only.
- **Transaction search by free-text note or amount** — only month, category, and
  type filters are supported.
- **Inline / inline-row editing** — editing always opens the same modal form.
- **Batch (multi-select) delete** — deletion is per-record only.
- **Historical reporting beyond twelve trailing months** — chart and filter ranges
  are bounded elsewhere; the transaction list filter has no such bound in MVP but
  data beyond twelve months is not highlighted or summarised in any aggregated view.
- **User authentication or per-user data isolation** — there is no auth layer;
  anyone with the URL has full access (no-account app, per requirements).
- **Server-Sent Events or WebSocket live sync** — list refresh is triggered by
  client-initiated mutations only.
- **Rate refresh on edit** — the `rate_to_usd` stored at creation time is
  intentionally immutable; editing a transaction does not re-fetch or overwrite it
  (FR-FX-01).
- **Note length enforcement at the database layer** — SQLite TEXT has no length
  limit; the 1000-character maximum is enforced only by the validator and the form.
