# Tasks: add-shell

Slice owners: FR-SHELL-01, FR-SHELL-02, FR-SHELL-03
Travelling NFRs: NFR-A11Y-01, NFR-A11Y-02, NFR-OBS-01, NFR-I18N-01

---

## 1. Dependencies and database foundation

- [x] 1.1 Install `better-sqlite3` and its TypeScript types:
      `npm install better-sqlite3 && npm install --save-dev @types/better-sqlite3`
- [x] 1.2 Verify `components/ui/button.tsx` exists (shadcn/ui already initialized);
      if absent, run `npx shadcn@latest add button` and commit the generated file.
- [x] 1.3 Create directory `lib/db/migrations/` (empty placeholder if needed so git
      tracks the folder).
- [x] 1.4 Create `lib/db/migrations/001_initial.sql` with placeholder `categories`
      (id, name) and `transactions` (id, amount) tables using `CREATE TABLE IF NOT EXISTS`.

---

## 2. Failing tests first (red)

Write all tests before any implementation. Confirm each test fails for the right
reason (missing module / missing export), not a syntax error.

- [x] 2.1 Create `lib/db/migrate.test.ts`:
      - Import `runMigrations` from `lib/db/migrate.ts` (will fail: module not found).
      - Test: `runMigrations` with an in-memory `better-sqlite3` database applies
        `001_initial.sql` and creates the `categories` and `transactions` tables.
      - Test: calling `runMigrations` a second time on the same database is a no-op
        (idempotent) — assert that the `_migrations` table still has exactly one row
        after two runs.
      - Annotate with `// @trace FR-SHELL-01` (DB layer is a prerequisite of the shell).
- [x] 2.2 Create `lib/i18n/en.test.ts`:
      - Import the default/named export from `lib/i18n/en.ts` (will fail: module not found).
      - Test: the exported object contains at least the keys
        `APP_NAME`, `CURRENCY_PLACEHOLDER`, `CURRENCY_SELECTOR_LABEL`,
        `EMPTY_STATE_HEADING`, `EMPTY_STATE_BODY`, `EMPTY_STATE_CTA`,
        `TOP_BAR_NAV_LABEL`.
      - Test: every value for those keys is a non-empty string.
      - Annotate with `// @trace NFR-I18N-01`.
- [ ] 2.3 Create `components/EmptyState.test.tsx`:
      - Import `EmptyState` from `components/EmptyState.tsx` (will fail: module not found).
      - Test: when rendered with `transactionCount={0}`, the output contains a
        button element with accessible text matching `en.EMPTY_STATE_CTA`
        (`"Add your first transaction"`).
      - Test: when rendered with `transactionCount={1}`, the button is NOT rendered
        (empty state is hidden when data exists).
      - Use `@testing-library/react` + Vitest (confirm both are in devDependencies;
        install `@testing-library/react @testing-library/jest-dom` if absent).
      - Annotate with `// @trace FR-SHELL-03`.
- [x] 2.4 Run `npm run test:run` and confirm all three test files fail red with
      module-not-found or similar expected errors, not parse/config errors.

---

## 3. DB layer implementation

- [x] 3.1 Create `lib/db/repository.ts` exporting:
      - `CategoryRow` interface: `{ id: number; name: string }`.
      - `TransactionRow` interface: `{ id: number; amount: number }`.
      - `IRepository` interface with methods:
        `ping(): boolean`,
        `listCategories(): CategoryRow[]`,
        `countTransactions(): number`.
- [x] 3.2 Create `lib/db/migrate.ts` exporting `runMigrations(db: Database): void`
      that reads SQL files from `lib/db/migrations/` in sort order, tracks applied
      filenames in a `_migrations` table, and is idempotent on re-run.
      Log applied filenames to stderr (not stdout) for observability (NFR-OBS-01).
- [x] 3.3 Create `lib/db/adapters/sqlite.ts` exporting:
      - `getDb(): Database` — singleton accessor; sets WAL mode and foreign keys on
        first call; path from `process.env.DATABASE_PATH ?? './budget.db'`.
      - `SqliteRepository` class implementing `IRepository`.
      - Call `runMigrations(getDb())` once during module initialisation
        (or export an `initDb()` function called from `instrumentation.ts`).
- [x] 3.4 Create `app/instrumentation.ts` (Next.js instrumentation hook) that calls
      `initDb()` / `runMigrations` on server startup so migrations run before the
      first request.
- [x] 3.5 Run `npm run test:run` — confirm `lib/db/migrate.test.ts` passes green.

---

## 4. App shell implementation (layout, top bar, empty state, i18n)

- [x] 4.1 Create `lib/i18n/en.ts` exporting `export const en = { ... }` with at
      minimum the seven shell keys listed in the design (APP_NAME,
      CURRENCY_PLACEHOLDER, CURRENCY_SELECTOR_LABEL, EMPTY_STATE_HEADING,
      EMPTY_STATE_BODY, EMPTY_STATE_CTA, TOP_BAR_NAV_LABEL).
      No inline string literals anywhere else in this slice.
- [x] 4.2 Run `npm run test:run` — confirm `lib/i18n/en.test.ts` passes green.
- [x] 4.3 Create `components/TopBar.tsx` as a Server Component (no `"use client"`):
      - Render `<nav aria-label={en.TOP_BAR_NAV_LABEL}>` wrapping the app name and
        currency placeholder.
      - App name: `<span>{en.APP_NAME}</span>` (or appropriate heading level).
      - Currency placeholder: `<span aria-label={en.CURRENCY_SELECTOR_LABEL}>{en.CURRENCY_PLACEHOLDER}</span>`.
      - Sticky positioning: Tailwind classes `sticky top-0 z-50 w-full border-b bg-background`.
      - No theme toggle. No JS.
- [x] 4.4 Create `components/EmptyState.tsx` as a Server Component accepting
      `{ transactionCount: number }`:
      - When `transactionCount === 0`: render heading from `en.EMPTY_STATE_HEADING`,
        body copy from `en.EMPTY_STATE_BODY`, and a `<Button>` from
        `components/ui/button.tsx` with label `en.EMPTY_STATE_CTA` and
        `data-testid="add-first-transaction"`.
      - When `transactionCount > 0`: render nothing (`return null`).
      - Container classes: `flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center`.
- [ ] 4.5 Run `npm run test:run` — confirm `components/EmptyState.test.tsx` passes green.
- [x] 4.6 Update `app/layout.tsx` to:
      - Import and render `<TopBar />` above the main content area.
      - Wrap children in a `<main>` with responsive grid classes:
        `mx-auto max-w-screen-xl px-4 py-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6`.
      - Ensure `<html lang="en">` is set (accessibility, NFR-A11Y-01).
      - Dark mode: no class toggling; Tailwind `dark:` variant responds to
        `prefers-color-scheme` automatically (verify `tailwind.config` or CSS layer
        does NOT set `darkMode: 'class'`).
- [x] 4.7 Update `app/page.tsx` (dashboard) to:
      - Import `SqliteRepository` and call `countTransactions()` server-side.
      - Pass the count to `<EmptyState transactionCount={count} />`.
      - When count > 0, render placeholder widget slots (will be filled by later slices).
      - Page is a Server Component — no `"use client"`.
- [x] 4.8 Verify no `window.innerWidth`, `matchMedia`, or `resize` event listener
      appears in any `.ts` / `.tsx` file for layout-switching purposes
      (`grep -r "matchMedia\|innerWidth\|resize" app/ components/ lib/` should return
      no layout-related hits).

---

## 5. Validation, docs, and archive prep

- [x] 5.1 Run `npm run lint`
- [x] 5.2 Run `npm run test:run` (confirm tests pass)
- [x] 5.3 Run `npm run build`
- [x] 5.4 Run `node scripts/check-traceability.mjs` (0 failures)
- [ ] 5.5 Manual smoke test: start `npm run dev`, open http://localhost:3000, verify
      top bar renders with app name, empty state shows with "Add your first
      transaction" button, responsive breakpoints work at 767 px / 768 px / 1280 px
      (resize browser window or use DevTools device toolbar)
- [ ] 5.6 `npx openspec archive add-shell --yes` (skip if openspec CLI unavailable;
      gate is the smoke test)
- [ ] 5.7 Update `docs/current-state.md`
- [ ] 5.8 Commit with `Slice: add-shell` and `Refs: FR-SHELL-01, FR-SHELL-02, FR-SHELL-03`
