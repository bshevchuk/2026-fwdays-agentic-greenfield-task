# Design: add-shell

## Goals

- Establish a typed `IRepository` interface that all subsequent slices implement
  against, ensuring no SQL leaks outside the adapter layer (TC-REPO-01).
- Provide a SQLite adapter that satisfies `IRepository` today and can be swapped
  for a Postgres adapter by dropping in a new file (TC-REPO-02).
- Ship an idempotent migration runner that is safe to call on every cold start,
  including Vercel's ephemeral containers (TC-REPO-03).
- Render the persistent app shell — top bar, responsive grid, empty state — so
  all later slices have a host layout to slot into.
- Centralise every shell UI string in `lib/i18n/en.ts` with zero inline literals
  in component files (NFR-I18N-01).

## Non-Goals

- Full domain schema (categories columns, transaction columns beyond id/amount):
  those land in add-categories and add-transactions respectively.
- Display-currency selector wiring: the top bar renders a static placeholder;
  interactive currency switching lands in add-fx.
- Theme toggle: dark mode is CSS-only via `prefers-color-scheme: dark` (ADR-0004);
  no toggle UI is built in MVP.
- Navigation sidebar, auth shell states, locale switching — all out of scope for
  MVP (see spec Exclusions).

---

## Repository Interface

### File: `lib/db/repository.ts`

`IRepository` is a plain TypeScript interface; no class, no abstract methods, no
decorators. It is the **only** import that application code (services, Route
Handlers) uses — never the adapter directly.

```ts
// Placeholder shape for this slice; later slices extend with domain methods.
export interface IRepository {
  /** Health-check: returns true if the DB connection is alive. */
  ping(): boolean;

  // --- Categories (add-categories slice will expand this) ---
  listCategories(): CategoryRow[];

  // --- Transactions (add-transactions slice will expand this) ---
  countTransactions(): number;

  // --- Budget limits (add-budget-limits slice will expand this) ---
  // (no methods yet)
}

export interface CategoryRow {
  id: number;
  name: string;
}

export interface TransactionRow {
  id: number;
  amount: number;
}
```

**Key decision — generics vs. domain methods**: Domain-specific methods (not a
generic `query<T>()`) are used because they make the interface self-documenting,
enable type-safe return shapes without casts, and keep the adapter focused.
A generic escape hatch (`rawQuery`) is intentionally omitted; raw SQL stays
inside the adapter. (ADR-worthy: prefer explicit over generic for domain repo.)

**Stability contract**: Later slices add methods to `IRepository` and implement
them in `sqlite.ts`. The existing adapter code is never removed or renamed during
MVP — only extended. This keeps all slices green on every build.

---

## SQLite Adapter

### File: `lib/db/adapters/sqlite.ts`

```ts
import Database from 'better-sqlite3';
import type { IRepository, CategoryRow } from '../repository';

const DB_PATH = process.env.DATABASE_PATH ?? './budget.db';

// Singleton: one connection per process (Next.js server process).
let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
  }
  return _db;
}

export class SqliteRepository implements IRepository {
  ping(): boolean {
    getDb().prepare('SELECT 1').get();
    return true;
  }

  listCategories(): CategoryRow[] {
    return getDb().prepare('SELECT id, name FROM categories').all() as CategoryRow[];
  }

  countTransactions(): number {
    const row = getDb().prepare('SELECT COUNT(*) as n FROM transactions').get() as { n: number };
    return row.n;
  }
}
```

- **Synchronous API**: `better-sqlite3` is deliberately synchronous; no
  `async/await` in the adapter. Next.js Route Handlers wrap it in a regular
  function.
- **WAL mode + foreign keys**: enabled on every connection for write concurrency
  and referential integrity.
- **Singleton**: `_db` is module-level; Node.js module cache ensures one instance
  per process. On Vercel, each serverless invocation is a fresh process, which
  is acceptable for SQLite.
- **Trade-off**: singleton breaks if two tests share the same module cache with
  different DB paths. Mitigation: tests use `DATABASE_PATH=':memory:'` env and
  re-import the module in isolation (or use a test factory that bypasses the
  singleton via dependency injection).

---

## Migration Runner

### File: `lib/db/migrate.ts`

```ts
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const MIGRATIONS_DIR = path.join(process.cwd(), 'lib/db/migrations');

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const applied = new Set(
    (db.prepare('SELECT filename FROM _migrations').all() as { filename: string }[])
      .map(r => r.filename)
  );

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort(); // lexicographic = numeric when prefixed 001_, 002_, ...

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    db.exec(sql);
    db.prepare('INSERT INTO _migrations (filename) VALUES (?)').run(file);
  }
}
```

- **Idempotent**: checks `_migrations` before applying; re-running on a
  warm database is a no-op.
- **Ordered**: filenames sort lexicographically; the `NNN_` prefix convention
  enforces ordering without a separate manifest.
- **Transactional per file**: `db.exec()` wraps each SQL file in an implicit
  transaction for SQLite; on failure it throws, letting the startup crash fast.
- **Error handling**: DB connection failure or migration failure → throw (fatal).
  The Next.js server process will crash and Vercel will surface a build/startup
  error rather than silently serving broken pages.
- **Integration point**: `runMigrations(getDb())` is called once at the top of
  `lib/db/adapters/sqlite.ts` module initialisation (or from a Next.js
  `instrumentation.ts` file — preferred for App Router).

---

## Initial Migration

### File: `lib/db/migrations/001_initial.sql`

```sql
CREATE TABLE IF NOT EXISTS categories (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  amount REAL    NOT NULL
);
```

Placeholder columns only. Full schema (icon, color, currency, date, type, note,
category_id, rate_to_usd) lands in add-categories and add-transactions.
The `IF NOT EXISTS` guard makes the statement safe to re-run.

---

## Top Bar Component

### File: `components/TopBar.tsx`

- Server Component (no `"use client"` directive).
- Renders the app name from `en.APP_NAME`.
- Renders a static `<span>` labelled from `en.CURRENCY_PLACEHOLDER` — the real
  `<CurrencySelector>` client component is wired in add-fx.
- Styled with Tailwind: `sticky top-0 z-50 w-full border-b bg-background`.
- All accessible names (`aria-label` on the currency placeholder) pulled from
  `lib/i18n/en.ts`.

---

## Responsive Grid

### File: `app/layout.tsx` (root layout) + `components/MainGrid.tsx`

Tailwind classes only — no JavaScript breakpoint detection (NFR enforced by
TC-REPO constraint and NFR-A11Y-01 audit):

```
<main className="mx-auto max-w-screen-xl px-4 py-6
                 grid grid-cols-1
                 md:grid-cols-2
                 xl:grid-cols-3
                 gap-6">
```

Breakpoints: `md:` = 768 px, `xl:` = 1280 px. Single-column below 768 px,
two-column 768–1279 px, three-column 1280 px+.

---

## Empty State Component

### File: `components/EmptyState.tsx`

- Server Component.
- Shown by the dashboard page (`app/page.tsx`) when `repository.countTransactions() === 0`.
- Renders prompt copy from `en.EMPTY_STATE_HEADING` and `en.EMPTY_STATE_BODY`.
- Renders a `<Button>` from `components/ui/button.tsx` with label from
  `en.EMPTY_STATE_CTA`.
- The button will open the transaction modal — wired in add-transactions. For
  this slice it renders as a non-functional placeholder with `data-testid="add-first-transaction"`.
- Centred via: `flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center`.

---

## i18n String Map

### File: `lib/i18n/en.ts`

Flat `Record<string, string>` exported as `const en`. Shell keys defined in this
slice (later slices append their own sections):

| Key | Value |
|---|---|
| `APP_NAME` | `"Budget"` |
| `CURRENCY_PLACEHOLDER` | `"USD"` |
| `CURRENCY_SELECTOR_LABEL` | `"Display currency"` |
| `EMPTY_STATE_HEADING` | `"No transactions yet"` |
| `EMPTY_STATE_BODY` | `"Track your income and expenses by adding your first transaction."` |
| `EMPTY_STATE_CTA` | `"Add your first transaction"` |
| `TOP_BAR_NAV_LABEL` | `"Main navigation"` |

No runtime i18n library. No interpolation in this slice.

---

## Error Handling Strategy

| Failure | Behaviour |
|---|---|
| DB file unreadable / path invalid | `better-sqlite3` throws on `new Database(path)`; caught by startup, logged to stderr, process exits — Vercel surfaces a cold-start failure. |
| Migration SQL syntax error | `db.exec()` throws; same fatal path — prevents corrupted partial migration. |
| Migration file directory missing | `fs.readdirSync` throws `ENOENT`; same fatal path. |
| `countTransactions()` on empty table | Returns `0` (SQL `COUNT(*)` never throws on an empty table). |

Route Handlers are not part of this slice (no mutations yet). Error handling for
user-input mutations is specified in add-transactions.

---

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| IRepository interface changes break the adapter | Methods are additive-only in MVP. A TypeScript compile error will surface any mismatch immediately. CI (`tsc --noEmit`) enforces this on every PR. |
| SQLite singleton holds a stale connection after WAL checkpoint | WAL mode is self-managing; `better-sqlite3` handles checkpointing. Stale connections are not possible with a single process. |
| Migration runner runs twice concurrently on multi-worker start | Next.js dev server is single-process. On Vercel, each invocation is isolated. Risk is deferred; a file-lock or DB-level advisory lock can be added post-MVP if needed. |
| `process.cwd()` differs between Next.js server and Vitest | Vitest sets `cwd` to the project root by default. Migration tests pass an explicit `db` object rather than relying on the module-level singleton, avoiding path issues. |
