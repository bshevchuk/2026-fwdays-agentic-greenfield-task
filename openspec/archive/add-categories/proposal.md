# Change Proposal: add-categories

## Why

Categories are the foundational classification layer that every downstream slice
depends on. `add-transactions` (slice 3) requires a category foreign key on every
transaction record. `add-budget-limits` (slice 4) writes a `budget_limit` column
that lives on the categories table. `add-charts` (slice 5) groups spending
aggregates by category color and name. None of those slices can be implemented
until the categories schema, service layer, and UI are in place.

The shell (slice 1) created a placeholder `categories(id, name)` table and a stub
`listCategories()` method on `IRepository`. This change replaces that placeholder
with the full production schema and a complete CRUD capability.

## What Changes

### Database

- `lib/db/migrations/002_categories.sql` upgrades the placeholder `categories`
  table via `ALTER TABLE ... ADD COLUMN` (compatible with the existing 001 migration),
  adds `icon TEXT NOT NULL DEFAULT 'tag'`, `color TEXT NOT NULL DEFAULT '#6366f1'`,
  and `budget_limit REAL` (nullable, reserved for slice 4), then seeds 7 default
  categories with `INSERT OR IGNORE` for idempotency.

### Domain layer (`lib/categories/`)

- `types.ts` — `Category`, `CreateCategoryInput`, `UpdateCategoryInput`
- `validation.ts` — pure functions `validateName`, `validateColor`, `validateIcon`
  (icon checked against a 30-entry fixed allow-list constant)
- `queries.ts` — SQL query strings for all CRUD operations
- `service.ts` — `listCategories`, `getCategory`, `createCategory`, `updateCategory`,
  `deleteCategory`; delete guard enforced here before any write

### Repository

- `lib/db/repository.ts` — `CategoryFullRow` type added; five new methods added to
  `IRepository` (list, get, create, update, delete)
- `lib/db/adapters/sqlite.ts` — `SqliteRepository` implements all five new methods

### API

- `app/api/categories/route.ts` — GET (list) and POST (create)
- `app/api/categories/[id]/route.ts` — GET (single), PUT (full update), DELETE

### UI

- `app/settings/page.tsx` — Server Component; fetches categories for initial render
- `components/categories/CategoryList.tsx`
- `components/categories/CategoryForm.tsx` — icon picker grid + hex color input
- `components/categories/DeleteCategoryButton.tsx` — inline error when blocked
- Settings entry point added to the top bar (link or icon button)

### i18n

- All new user-visible strings added to `lib/i18n/en.ts`; no inline literals

### Tests

- `lib/categories/validation.test.ts` — unit tests for all three validators
- `lib/categories/service.test.ts` — unit tests with in-memory repository stub
- `lib/categories/integration.smoke.test.ts` — real SQLite round-trip: seed
  idempotency, CRUD, delete-blocked guard

## Impact

- **Unlocks:** add-transactions (slice 3), which depends on both add-categories and
  add-fx being merged first.
- **Parallel-safe with:** add-fx (slice 2b) — disjoint modules, no shared migration.
- **Shell tests:** unaffected; `ping()`, `countTransactions()`, and the original
  `listCategories()` signature are preserved.
- **Budget-limits slice:** the `budget_limit` column is added here but not used
  until slice 4; no further `ALTER TABLE` will be needed on this table.
- **No breaking changes** to existing public API surface.
