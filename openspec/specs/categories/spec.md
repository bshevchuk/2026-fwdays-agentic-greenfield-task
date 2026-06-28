# Categories Specification

## Purpose

The categories capability lets users organise their transactions into named, visually
distinct buckets. Each category carries a display name, a hex color, and an icon drawn
from a fixed palette. A curated default set is seeded on first run so the app is
immediately usable without manual setup.

---

## Requirements

### Requirement: Create Category (FR-CAT-01)

A user can create a new category by supplying a non-blank, unique name, an icon chosen
from the fixed icon set (~30 options), and a valid six-digit hex color code. The Route
Handler at `POST /api/categories` performs all validation and persists the record via
the repository interface; raw SQL or ORM calls must not appear outside the adapter
layer (TC-REPO-01).

#### Scenario: Successful creation with all valid fields

- GIVEN the categories list contains no category named "Groceries"
- WHEN a POST request is submitted with `{ name: "Groceries", icon: "shopping-cart", color: "#4ade80" }`
- THEN the server returns HTTP 201 with the newly created category record (including a generated `id`)
- AND the category appears in the next GET /api/categories response

#### Scenario: Reject blank name

- GIVEN a user submits a POST request with `{ name: "  ", icon: "shopping-cart", color: "#4ade80" }`
- WHEN the Route Handler validates the payload
- THEN the server returns HTTP 422 with `{ error: "Name is required" }` (exact text sourced from `lib/i18n/en.ts`)
- AND no category record is written to the database

#### Scenario: Reject invalid hex color

- GIVEN a user submits a POST request with `{ name: "Groceries", icon: "shopping-cart", color: "red" }`
- WHEN the Route Handler validates the payload
- THEN the server returns HTTP 422 with `{ error: "Color must be a valid hex code" }` (text from `lib/i18n/en.ts`)
- AND no category record is written to the database

#### Scenario: Reject hex color missing leading hash

- GIVEN a user submits a POST request with `{ name: "Groceries", icon: "shopping-cart", color: "4ade80" }`
- WHEN the Route Handler validates the payload
- THEN the server returns HTTP 422 indicating an invalid hex color
- AND no category record is written to the database

#### Scenario: Reject icon not in the fixed icon set

- GIVEN a user submits a POST request with `{ name: "Groceries", icon: "nonexistent-icon-xyz", color: "#4ade80" }`
- WHEN the Route Handler validates the payload
- THEN the server returns HTTP 422 with an error naming the icon field (text from `lib/i18n/en.ts`)
- AND no category record is written to the database

#### Scenario: Reject duplicate name (case-insensitive)

- GIVEN a category named "Food & Drink" already exists
- WHEN a POST request is submitted with `{ name: "food & drink", icon: "utensils", color: "#ff0000" }`
- THEN the server returns HTTP 422 with `{ error: "A category with this name already exists" }` (text from `lib/i18n/en.ts`)
- AND no new category record is written to the database

---

### Requirement: Edit Category (FR-CAT-02)

A user can update the name, icon, color, or any combination of those fields on an
existing category at any time. The Route Handler at `PATCH /api/categories/[id]` applies
partial updates and re-validates only the supplied fields against the same rules as
creation.

#### Scenario: Rename an existing category

- GIVEN a category with id "cat-1" named "Eating Out" exists
- WHEN a PATCH request is submitted with `{ name: "Restaurants" }`
- THEN the server returns HTTP 200 with the updated category record showing `name: "Restaurants"`
- AND subsequent GET /api/categories reflects the new name

#### Scenario: Recolor an existing category

- GIVEN a category with id "cat-1" and color "#ff0000" exists
- WHEN a PATCH request is submitted with `{ color: "#3b82f6" }`
- THEN the server returns HTTP 200 with `color: "#3b82f6"`
- AND the old color is no longer stored for that category

#### Scenario: Change icon of an existing category

- GIVEN a category with id "cat-1" and icon "shopping-cart" exists
- WHEN a PATCH request is submitted with `{ icon: "utensils" }`
- THEN the server returns HTTP 200 with `icon: "utensils"`

#### Scenario: Update all three fields in a single request

- GIVEN a category with id "cat-1" exists with name "Old", icon "star", color "#000000"
- WHEN a PATCH request is submitted with `{ name: "New", icon: "heart", color: "#ffffff" }`
- THEN the server returns HTTP 200 with all three fields updated atomically

#### Scenario: Reject rename to blank string

- GIVEN a category with id "cat-1" exists
- WHEN a PATCH request is submitted with `{ name: "" }`
- THEN the server returns HTTP 422 with a non-blank name error (text from `lib/i18n/en.ts`)
- AND the stored name is unchanged

#### Scenario: Reject rename to a name belonging to another category

- GIVEN categories named "Food & Drink" (id "cat-1") and "Transport" (id "cat-2") exist
- WHEN a PATCH request for "cat-2" is submitted with `{ name: "Food & Drink" }`
- THEN the server returns HTTP 422 with a duplicate-name error (text from `lib/i18n/en.ts`)
- AND "cat-2" retains its original name "Transport"

#### Scenario: Edit a non-existent category

- GIVEN no category with id "cat-999" exists
- WHEN a PATCH request is submitted for id "cat-999"
- THEN the server returns HTTP 404
- AND the console emits no unhandled exceptions (NFR-OBS-01)

---

### Requirement: Delete Category (FR-CAT-03)

A user can delete a category only when no transaction references it. If transactions
exist for the category the deletion is refused and an inline error is returned; no
record is modified. The Route Handler at `DELETE /api/categories/[id]` enforces this
guard before any write.

#### Scenario: Successful deletion of an unused category

- GIVEN a category with id "cat-1" exists and zero transactions reference it
- WHEN a DELETE request is submitted for id "cat-1"
- THEN the server returns HTTP 200 (or 204)
- AND subsequent GET /api/categories does not include "cat-1"

#### Scenario: Refuse deletion when transactions exist — inline error

- GIVEN a category with id "cat-1" exists and at least one transaction references it
- WHEN a DELETE request is submitted for id "cat-1"
- THEN the server returns HTTP 422 with `{ error: "Cannot delete a category that has associated transactions" }` (text from `lib/i18n/en.ts`)
- AND the category record remains in the database
- AND no transaction record is modified or removed
- AND the UI surfaces this message inline (not as a raw 500 or unhandled exception)

#### Scenario: Delete a non-existent category

- GIVEN no category with id "cat-999" exists
- WHEN a DELETE request is submitted for id "cat-999"
- THEN the server returns HTTP 404
- AND the console emits no unhandled exceptions (NFR-OBS-01)

---

### Requirement: Default Category Seed (FR-CAT-04)

On the very first application run (empty database), the migration/seed runner inserts
a predefined set of categories so that the app is immediately usable. Subsequent
starts must not re-insert or duplicate the defaults (idempotent seed, per TC-REPO-03).

#### Scenario: Default categories present after first-run seed

- GIVEN the database has just been initialised from an empty state (no categories table rows)
- WHEN the migration/seed runner completes
- THEN the database contains exactly the following categories (names case-preserved):
  Food & Drink, Transport, Housing, Health, Entertainment, Income, Other
- AND each default category has a non-null icon and a valid hex color

#### Scenario: Seed is idempotent on subsequent runs

- GIVEN the database already contains the default categories from a previous run
- WHEN the migration/seed runner is executed again (e.g. on a Vercel cold start)
- THEN no duplicate category rows are inserted
- AND existing categories that have been user-edited (e.g. renamed) are not overwritten

#### Scenario: Default categories are editable and deletable by the user

- GIVEN the seven default categories have been seeded
- WHEN the user renames "Other" to "Miscellaneous" via PATCH /api/categories/[id]
- THEN the change persists and the category is no longer named "Other"
- GIVEN the user has no transactions in the "Entertainment" category
- WHEN the user deletes "Entertainment" via DELETE /api/categories/[id]
- THEN the category is removed and does not reappear on the next cold start (seed is idempotent, not restorative)

---

### Requirement: Silent Console at Runtime (NFR-OBS-01)

During all normal category operations — listing, creating, editing, and deleting
categories — the browser console and server log must remain free of warnings and
errors.

#### Scenario: No console output on successful category list load

- GIVEN the application is running with categories seeded
- WHEN the client loads the categories list
- THEN the browser console contains zero errors and zero warnings

#### Scenario: No unhandled errors on validation failure

- GIVEN a user submits a category creation request with a blank name
- WHEN the Route Handler returns HTTP 422
- THEN no uncaught exception is logged to the server console
- AND the browser console contains no React hydration errors or unhandled promise rejections

---

### Requirement: Centralised UI Strings (NFR-I18N-01)

Every user-visible string produced by the categories capability — labels, placeholder
text, button copy, and error messages — must be sourced from `lib/i18n/en.ts`. No
string literal that will appear in the UI may be hard-coded inside a component,
Route Handler response, or validation schema.

#### Scenario: Error messages reference the i18n module

- GIVEN the Route Handler returns a 422 error for a blank category name
- WHEN a developer searches the categories Route Handler source for the exact error string
- THEN the string is not found inline; it is imported from `lib/i18n/en.ts`

#### Scenario: UI labels sourced from i18n module

- GIVEN the category creation form is rendered
- WHEN a developer inspects the form component source
- THEN all visible label strings (e.g. "Name", "Icon", "Color", "Save", "Cancel") are imported from `lib/i18n/en.ts`
- AND no raw string literals for these labels exist in the component file

---

## Exclusions

The following items are intentionally out of scope for MVP and must not be
implemented or reported as missing:

- **Category merging** — reassigning all transactions from one category to another in a
  single operation is not supported.
- **Bulk import** — creating multiple categories from CSV or JSON upload is not supported.
- **Category hierarchy / subcategories** — a flat, single-level list is the only
  supported structure.
- **Archiving categories** — categories can only be deleted (subject to the no-transactions
  guard); soft-delete or archive status is not supported.
- **Per-user or per-account categories** — there is no authentication layer; all
  categories are global to the single local database instance.
