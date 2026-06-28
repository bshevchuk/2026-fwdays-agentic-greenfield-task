# Current State

> Persistent handoff file for future agent windows. Verify with OpenSpec, tests,
> and the repo — this is a map, not the source of truth.

## Last Updated

- **Date and time:** 2026-06-28 23:00 (Europe/Kyiv)
- **Current phase:** Phase 4 — slice delivery
- **Active change:** add-transactions (COMPLETE)
- **Progress:** G0 complete (scaffold + loop). G1 complete (requirements signed off).
  Next.js 16 / React 19 / Tailwind 4 / shadcn/ui / better-sqlite3 / Vitest scaffolded.
  ADRs 0001–0004 written. Lint + build green.
  add-categories slice implemented; `002_categories.sql` migration applied.
  add-fx slice implemented; FX rate route, cache, and currency context in place.
  add-transactions slice implemented: full CRUD for transactions, migration 003, domain layer,
  Route Handlers, TransactionList/Form/Filters UI components. All 169 tests passing.
- **Next task:** add-budget-limits (slice 4).

## Known Issues

None. All pre-existing test conflicts from prior slices have been resolved.

## Source Of Truth

1. `AGENTS.md` — project agent rules.
2. `docs/current-state.md` — this handoff.
3. `docs/requirements.md` — canonical FR/NFR/TC/BC requirements.
4. `docs/product-brief.md` — product narrative.
5. `docs/mvp-capability-plan.md` — change sequence and scope.
6. `openspec/project.md` + `openspec/specs/` — accepted behavior.
7. `docs/adr/` — architecture decisions (ADR-0001 through ADR-0004 accepted).
8. `docs/qa/` — QA proof pack and recordings (Phase 6).

## OpenSpec Status

- `openspec/changes/add-transactions/` — implementation complete (tasks.md ticked).

## Completed Changes

- **add-transactions** — 2026-06-28 23:00 UTC+3 (Europe/Kyiv)
  - `lib/db/migrations/003_transactions.sql` — full schema DROP + CREATE
  - `lib/transactions/types.ts` — TransactionRow, CreateTransactionInput, UpdateTransactionInput, TransactionFilters
  - `lib/transactions/validation.ts` — validateAmount, validateCurrency, validateDate, validateType, validateNote
  - `lib/transactions/queries.ts` — SQL constants and dynamic builders
  - `lib/transactions/service.ts` — listTransactions, createTransaction, updateTransaction, deleteTransaction
  - `lib/db/repository.ts` — IRepository extended with all transaction CRUD methods
  - `lib/db/adapters/sqlite.ts` — SqliteRepository implements all transaction methods
  - `lib/i18n/en.ts` — all TX_* i18n strings added
  - `app/api/transactions/route.ts` — GET (filtered list) + POST (create with FX rate fetch)
  - `app/api/transactions/[id]/route.ts` — GET, PUT, DELETE
  - `components/transactions/TransactionFilters.tsx`
  - `components/transactions/TransactionForm.tsx`
  - `components/transactions/TransactionList.tsx`
  - `app/page.tsx` — unconditionally renders TransactionList (Client Component)
  - `eslint.config.mjs` — added argsIgnorePattern: "^_" for unused stub params in tests

- **add-categories** — 2026-06-28 21:40 UTC+3 (Europe/Kyiv)
  - `lib/db/migrations/002_categories.sql`
  - `lib/categories/types.ts`, `validation.ts`, `queries.ts`, `service.ts`
  - `lib/db/repository.ts` extended; `lib/db/adapters/sqlite.ts` extended
  - `lib/i18n/en.ts` — all category strings added
  - `app/api/categories/route.ts`, `app/api/categories/[id]/route.ts`
  - `components/categories/CategoryList.tsx`, `CategoryForm.tsx`, `DeleteCategoryButton.tsx`
  - `app/settings/page.tsx`
  - `components/TopBar.tsx` — Settings link added
