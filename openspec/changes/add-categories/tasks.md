# Tasks: add-categories

## 1. Schema + migration

- [ ] 1.1 Create `lib/db/migrations/002_categories.sql`:
  - `ALTER TABLE categories ADD COLUMN icon TEXT NOT NULL DEFAULT 'tag'`
  - `ALTER TABLE categories ADD COLUMN color TEXT NOT NULL DEFAULT '#6366f1'`
  - `ALTER TABLE categories ADD COLUMN budget_limit REAL`
  - Add `UNIQUE` constraint on `name` via `CREATE UNIQUE INDEX IF NOT EXISTS`
  - Seed 7 default categories with `INSERT OR IGNORE INTO categories (name, icon, color) VALUES (...)`
    - Food & Drink (#ef4444, utensils), Transport (#3b82f6, car), Housing (#8b5cf6, home)
    - Health (#10b981, heart-pulse), Entertainment (#f59e0b, film), Income (#22c55e, trending-up), Other (#6366f1, tag)

## 2. Tests — write RED first, before any implementation

- [ ] 2.1 Create `lib/categories/validation.test.ts` (`@trace FR-CAT-01, FR-CAT-02`):
  - `validateName('')` → false
  - `validateName('  ')` → false
  - `validateName('Food')` → true
  - `validateName('x'.repeat(51))` → false (over 50 chars)
  - `validateColor('#4ade80')` → true
  - `validateColor('red')` → false
  - `validateColor('4ade80')` → false (missing #)
  - `validateColor('#gggggg')` → false (invalid hex chars)
  - `validateIcon('utensils')` → true
  - `validateIcon('nonexistent-icon-xyz')` → false

- [ ] 2.2 Create `lib/categories/service.test.ts` (`@trace FR-CAT-01, FR-CAT-02, FR-CAT-03, FR-CAT-04`):
  - `createCategory` with valid input → returns `{ ok: true, data: CategoryFullRow }`
  - `createCategory` with blank name → returns `{ ok: false, code: 'VALIDATION_ERROR' }`
  - `createCategory` with invalid color → returns `{ ok: false, code: 'VALIDATION_ERROR' }`
  - `createCategory` with invalid icon → returns `{ ok: false, code: 'VALIDATION_ERROR' }`
  - `updateCategory` with partial fields → only those fields change
  - `deleteCategory` when no transactions → returns `{ ok: true }`
  - `deleteCategory` when category has transactions → returns `{ ok: false, code: 'HAS_TRANSACTIONS' }`
  - `getCategory` for non-existent id → returns `{ ok: false, code: 'NOT_FOUND' }`

- [ ] 2.3 Create `lib/categories/seed.test.ts` (`@trace FR-CAT-04`):
  - After migration on fresh DB: exactly 7 categories present
  - Running migration twice: still exactly 7 rows (idempotent)
  - Each seed category has non-null icon and valid hex color

## 3. Implementation

- [ ] 3.1 Create `lib/categories/types.ts` — `CategoryFullRow`, `CreateCategoryInput`, `UpdateCategoryInput`
- [ ] 3.2 Create `lib/categories/validation.ts` — `ALLOWED_ICONS` const (30 icons), `validateName`, `validateColor`, `validateIcon`
- [ ] 3.3 Create `lib/categories/queries.ts` — SQL strings for list/get/create/update/delete
- [ ] 3.4 Create `lib/categories/service.ts` — service functions returning `{ ok, data | code, error }` discriminated union
- [ ] 3.5 Extend `lib/db/repository.ts`:
  - Replace `CategoryRow` usage with `CategoryFullRow` (import from `lib/categories/types.ts`)
  - Add to `IRepository`: `listCategories(): CategoryFullRow[]`, `getCategory(id): CategoryFullRow | undefined`, `createCategory(input): CategoryFullRow`, `updateCategory(id, fields): CategoryFullRow | undefined`, `deleteCategory(id): boolean`, `countTransactionsByCategory(categoryId): number`
- [ ] 3.6 Implement all new methods in `lib/db/adapters/sqlite.ts`
- [ ] 3.7 Add category i18n keys to `lib/i18n/en.ts`:
  - `CATEGORIES_NAME_REQUIRED`, `CATEGORIES_COLOR_INVALID`, `CATEGORIES_ICON_INVALID`
  - `CATEGORIES_NAME_DUPLICATE`, `CATEGORIES_DELETE_HAS_TRANSACTIONS`
  - `CATEGORIES_NOT_FOUND`, form labels, button copy
- [ ] 3.8 Create `app/api/categories/route.ts` — GET (list) + POST (create)
- [ ] 3.9 Create `app/api/categories/[id]/route.ts` — GET (single), PUT (partial update), DELETE
- [ ] 3.10 Create `lib/categories/` UI components:
  - `components/categories/CategoryList.tsx` (Client Component)
  - `components/categories/CategoryForm.tsx` (icon grid picker + hex color input)
  - `components/categories/DeleteCategoryButton.tsx` (inline error on 422)
- [ ] 3.11 Create `app/settings/page.tsx` — Server Component; fetches categories list; mounts `CategoryList`
- [ ] 3.12 Add Settings link to `components/TopBar.tsx` (link to `/settings`)

## 4. Quality checks

- [ ] 4.1 `npm run test:run` — all tests green (including existing shell tests)
- [ ] 4.2 `npm run lint` — clean
- [ ] 4.3 `npm run build` — clean
- [ ] 4.4 `node scripts/check-traceability.mjs` — 0 failures
- [ ] 4.5 Smoke: GET /api/categories returns 7 default categories on fresh DB
- [ ] 4.6 Smoke: POST → PUT → DELETE round-trip with real SQLite (using `npm run test:run`)
- [ ] 4.7 Smoke: DELETE a category with transactions → 422 with correct error string

## 5. Archive

- [ ] 5.1 Update `docs/current-state.md` with slice completion timestamp
- [ ] 5.2 Move `openspec/changes/add-categories/` → `openspec/archive/add-categories/`
- [ ] 5.3 Commit: `feat(categories): add-categories slice` with `Slice: add-categories` and `Refs: FR-CAT-01, FR-CAT-02, FR-CAT-03, FR-CAT-04` trailers
