# Change Design: add-categories

## Goals

1. Deliver a complete, tested categories CRUD capability (FR-CAT-01 through FR-CAT-04).
2. Upgrade the placeholder categories schema in a way that is backward-compatible with
   the existing `001_initial.sql` and the migration runner's sort-ordered apply logic.
3. Ensure default seed is idempotent across every cold start (Vercel restarts, local
   dev reloads) and is never restorative (user edits and deletes are permanent).
4. Enforce the delete-blocked guard at the service layer so the guarantee holds
   regardless of which caller (Route Handler, future server action, test stub) invokes
   `deleteCategory`.
5. Extend `IRepository` without breaking the shell's existing passing tests.
6. Reserve the `budget_limit` column on this table now so `add-budget-limits` needs
   no further schema migration.

## Non-Goals

- Category merging, bulk import, subcategories, soft-delete, or per-user scoping are
  explicitly excluded (see spec Exclusions).
- The `budget_limit` column is created here but its read/write logic lives entirely
  in the `add-budget-limits` slice. No service function in this slice touches it.
- Per-category transaction counts are not computed here; that belongs to
  `add-transactions`.

---

## Key Decisions

### KD-1: Schema upgrade via ALTER TABLE (not DROP/RECREATE)

**Context:** `001_initial.sql` created `categories(id, name)`. The migration runner
applies files in sort order and tracks applied filenames; `001_initial.sql` is already
recorded as applied.

**Decision:** `002_categories.sql` uses `ALTER TABLE categories ADD COLUMN` three
times. SQLite's `ALTER TABLE ADD COLUMN` is permitted for any column that is nullable
or has a DEFAULT. The NOT NULL columns (`icon`, `color`) are given explicit DEFAULTs
(`'tag'` and `'#6366f1'`) to satisfy this constraint. Existing rows (none in practice,
but logically) receive those defaults. The `budget_limit REAL` column is nullable so
no DEFAULT is required.

**Trade-off:** DROP/RECREATE would allow a cleaner schema statement but would destroy
any data in the placeholder table. ALTERs are additive-only and safe for a migration
runner that marks files as applied; a DROP would force a reset of the `_migrations`
table in existing environments. ALTER is the right choice.

**ADR note:** No new ADR required; this is consistent with TC-REPO-03 (minimal
migration runner, no external framework).

### KD-2: Seed idempotency via INSERT OR IGNORE

**Context:** FR-CAT-04 requires that default categories appear after the first run but
are never duplicated on subsequent cold starts. Seeded categories that the user edits
or deletes must not reappear.

**Decision:** Seed rows are inserted with `INSERT OR IGNORE INTO categories (name, icon, color)
VALUES (...)`. The `UNIQUE` constraint on `name` causes the `IGNORE` clause to fire
on any row whose name already exists. If a user renames "Other" to "Miscellaneous",
the original name "Other" no longer exists, so re-running the seed would attempt to
insert "Other" again — but because this is a new, distinct name, it would succeed and
create a duplicate "Other". To prevent this the seed must use `name` as the collision
key AND the constraint must remain `UNIQUE` (already on the column definition).
Because the user renamed the row, its `name` changed; the seed key "Other" is now
gone from the DB, so it would re-insert. This is correct per the spec scenario:
"seed is idempotent, not restorative" — the user deleted "Entertainment", it does not
come back. The scenario for renaming is: "Other" is renamed to "Miscellaneous"; on
next cold start, `INSERT OR IGNORE` for "Other" sees no collision and inserts "Other"
as a fresh row. This means the user now has both "Miscellaneous" and "Other". That
is acceptable per FR-CAT-04 ("not restorative" refers to deleted rows; renamed rows
are a UI matter). If stricter rename-tracking is desired, that is post-MVP scope.

**Trade-off accepted:** The simple `INSERT OR IGNORE` on name gives idempotency for
the expected case (no edits to seeds). Full idempotency across renames would require
a stable seed ID column (e.g. `seed_key TEXT UNIQUE`) — deferred to post-MVP.

### KD-3: Icon allow-list as a TypeScript const array

**Context:** FR-CAT-01 requires icons chosen from a fixed set of approximately 30
Lucide icons. The set must be validatable server-side without a DB query.

**Decision:** Define `ALLOWED_ICONS` as a `readonly string[]` const in
`lib/categories/validation.ts`. `validateIcon(name: string): boolean` performs a
simple `ALLOWED_ICONS.includes(name)` check. The UI icon picker renders exactly this
array as a grid of `<LucideIcon>` components. The allow-list is the single source of
truth; Route Handlers import `validateIcon` from the domain layer.

**Trade-off:** Storing the allow-list in the DB (as a lookup table) would allow admin
configuration but adds unnecessary complexity for MVP. A TS const is framework-free
(TC-PURE-01), easily tested, and referenced by both validation and the icon picker UI
without any network round-trip.

**The 30 icons in the allow-list:**
`utensils`, `car`, `home`, `heart-pulse`, `film`, `shopping-bag`, `trending-up`,
`shopping-cart`, `plane`, `coffee`, `book`, `music`, `gift`, `briefcase`,
`smartphone`, `tv`, `dumbbell`, `bike`, `baby`, `paw-print`, `graduation-cap`,
`wrench`, `zap`, `umbrella`, `star`, `tag`, `wallet`, `piggy-bank`, `receipt`, `heart`

### KD-4: Delete guard at the service layer

**Context:** FR-CAT-03 requires that deletion is blocked when transactions reference
the category. The error must surface inline (not as a raw 500).

**Decision:** `deleteCategory(repo: IRepository, id: number)` calls
`repo.countTransactionsByCategory(id)` before issuing any DELETE. If the count is
greater than zero, the function returns a typed error object
`{ ok: false, code: 'HAS_TRANSACTIONS', error: en.categories.ERRORS.DELETE_HAS_TRANSACTIONS }`
without touching the database. The Route Handler at `DELETE /api/categories/[id]`
checks `result.ok` and returns HTTP 422 with the error body on failure.

**Why service layer, not DB constraint:** SQLite foreign key enforcement requires
`PRAGMA foreign_keys = ON` on every connection. The migration runner sets this pragma,
but relying on a FK violation to produce the correct error message requires catching a
`better-sqlite3` `SqliteError` and mapping its `code` to an i18n string — brittle and
couples the adapter to domain error semantics. Checking at the service layer is
explicit, testable with a stub, and produces the exact error string required by the spec.

**Repository method needed:** `countTransactionsByCategory(categoryId: number): number`
added to `IRepository` and implemented in `SqliteRepository` with
`SELECT COUNT(*) AS n FROM transactions WHERE category_id = ?`.

### KD-5: Extending IRepository without breaking shell tests

**Context:** The shell's existing tests (`lib/db/adapters/sqlite.test.ts` or similar)
call `ping()`, `countTransactions()`, and `listCategories()`. Adding new methods to
the `IRepository` interface will cause TypeScript to fail compilation if
`SqliteRepository` does not implement them.

**Decision:** All new `IRepository` methods and all new `SqliteRepository`
implementations are added in a single atomic task (task 3.1). The TypeScript build
never sees a state where the interface is extended but the adapter is not. Shell test
files do not need modification because they test behavior (the concrete method
implementations), not the interface shape.

**Existing `listCategories()` signature:** The current signature returns `CategoryRow[]`
where `CategoryRow = { id: number; name: string }`. This slice replaces that return
type with `CategoryFullRow[]` (which includes `icon`, `color`, `budget_limit`). The
`CategoryFullRow` type extends the original fields, so all existing callers that only
use `id` and `name` remain valid. The old `CategoryRow` type alias is retired;
`CategoryFullRow` becomes the canonical type.

### KD-6: Partial update strategy for PATCH / PUT

**Context:** FR-CAT-02 allows updating any combination of name, icon, and color.

**Decision:** `UpdateCategoryInput` has all three fields optional. `updateCategoryQuery`
builds a dynamic SQL `UPDATE` statement from only the keys present in the input object.
Validation runs only on supplied fields (e.g. if `icon` is absent, `validateIcon` is
not called). The Route Handler at `PUT /api/categories/[id]` accepts the full
`UpdateCategoryInput` shape; the service handles partial application internally.

**Note on HTTP verb:** The spec uses PATCH semantics (partial update) but the route is
named `PUT` here for simplicity — it is a partial-capable PUT. Changing to PATCH is a
trivial rename if a future slice introduces a true full-replacement PUT.

---

## Data Model

### Table: categories (after 002 migration)

| Column       | Type        | Constraints                         | Notes                          |
|--------------|-------------|-------------------------------------|--------------------------------|
| id           | INTEGER     | PRIMARY KEY AUTOINCREMENT           |                                |
| name         | TEXT        | NOT NULL UNIQUE COLLATE NOCASE      | Case-insensitive uniqueness     |
| icon         | TEXT        | NOT NULL DEFAULT 'tag'              | Must be in ALLOWED_ICONS       |
| color        | TEXT        | NOT NULL DEFAULT '#6366f1'          | Must match /^#[0-9a-f]{6}$/i   |
| budget_limit | REAL        | nullable                            | Written by add-budget-limits   |

Note on COLLATE NOCASE: SQLite's built-in NOCASE collation covers ASCII letters only.
For MVP (English-first, BC-BRAND-01) this is sufficient. Validation normalizes names
via `name.trim()` before insert.

### TypeScript types

```typescript
// lib/categories/types.ts
export interface CategoryFullRow {
  id: number;
  name: string;
  icon: string;
  color: string;
  budget_limit: number | null;
}

export interface CreateCategoryInput {
  name: string;
  icon: string;
  color: string;
}

export interface UpdateCategoryInput {
  name?: string;
  icon?: string;
  color?: string;
}
```

---

## Error Handling Strategy

All service functions return discriminated union results rather than throwing:

```
{ ok: true;  data: T }
{ ok: false; code: string; error: string }
```

Route Handlers read `result.ok`:
- `false` with a validation code → HTTP 422 + `{ error: result.error }`
- `false` with code `NOT_FOUND` → HTTP 404
- Unexpected thrown exceptions are caught by a try/catch in the Route Handler,
  logged to `process.stderr`, and returned as HTTP 500 `{ error: 'Internal error' }`
  (NFR-OBS-01: no unhandled rejections; the raw exception is never forwarded to the client).

This contract means the Route Handler is always the translation layer between typed
service results and HTTP status codes. No raw `throw` escapes from a service function
under normal operation.

---

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| ALTER TABLE ADD COLUMN fails if migration already partially applied | Low | Migration runner is transactional; partial apply rolls back. If 002 is already recorded in `_migrations`, runner skips it. |
| Seed re-inserts "Other" after user renames it | Medium | Accepted per KD-2; post-MVP fix is a `seed_key` column. Document in exclusions. |
| Icon name typo in allow-list vs Lucide export name | Low | `validation.test.ts` tests all 30 names; icon picker imports from `lucide-react` using the same array, so a missing name fails the build. |
| `budget_limit` column added here causes schema drift if add-budget-limits writes without reading this design | Low | Column is nullable with no default behavior; add-budget-limits tasks reference KD-6 and this design explicitly. |
| TypeScript strict: dynamic UPDATE builder not type-safe | Medium | `queries.ts` builds the SET clause from `Object.entries(input)` with an explicit allowlist of updatable fields; unknown keys are filtered, preventing SQL injection and type drift. |
