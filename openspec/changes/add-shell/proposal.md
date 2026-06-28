# Proposal: add-shell

## Why

The repository is a clean Next.js scaffold with no application code. Before any
domain capability (transactions, categories, budget limits) can be built and
tested end-to-end, the project needs two things:

1. A **database layer** — a typed repository interface, a SQLite adapter, and an
   idempotent migration runner — so every subsequent slice can write DB code
   against a stable contract without reaching for raw SQL outside the adapter.

2. An **application shell** — the persistent top bar, a responsive content grid,
   a first-load empty state, and a centralised string map — so every subsequent
   slice has a host layout and a place to import UI strings from.

Without this slice, no other slice can start; the scaffold would reject imports
and the DB would not exist.

## What Changes

- `lib/db/repository.ts` — `IRepository` typed interface (categories, transactions,
  budget limits); all later slices add methods here without touching the adapter.
- `lib/db/adapters/sqlite.ts` — `better-sqlite3` synchronous adapter; single
  `Database` singleton per process; file path from
  `process.env.DATABASE_PATH ?? './budget.db'`.
- `lib/db/migrate.ts` — migration runner that reads SQL files from
  `lib/db/migrations/` in numeric order, tracks applied files in a `_migrations`
  table, is safe to re-run on every cold start.
- `lib/db/migrations/001_initial.sql` — creates `categories` and `transactions`
  placeholder tables (id + name, id + amount); full columns come in later slices.
- `lib/i18n/en.ts` — flat string map covering all shell UI strings.
- `app/layout.tsx` — root layout with top bar and responsive grid wrapper.
- `components/TopBar.tsx` — Server Component; app name + static currency
  placeholder (wired properly in add-fx).
- `components/EmptyState.tsx` — Server Component; shown when transaction count
  is zero; reuses `components/ui/button.tsx`.
- Vitest unit tests for the migration runner and the i18n module.

## Impact

- **Downstream slices unblocked**: add-transactions, add-categories,
  add-budget-limits, add-charts, add-fx all depend on the IRepository interface
  and the shell layout established here.
- **No breaking surface today**: IRepository starts with placeholder stubs; each
  data slice extends it. Adapter changes are additive, never destructive.
- **Deployment**: `DATABASE_PATH` env var must be set on Vercel to a writable
  volume path (`/tmp/budget.db` or a mounted volume); this slice documents that
  requirement but does not configure Vercel itself.
- **NFRs in force from this slice**: NFR-A11Y-01, NFR-A11Y-02, NFR-OBS-01,
  NFR-I18N-01 all apply to every page load once the shell lands.
