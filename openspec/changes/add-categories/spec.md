# Spec: add-categories (change copy)

> This is a change-copy of `openspec/specs/categories/spec.md` captured at the time
> this change folder was created. The canonical baseline spec is the source of truth.

## ADDED Requirements

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
- THEN the server returns HTTP 422 with `{ error: "Name is required" }` (text from `lib/i18n/en.ts`)

#### Scenario: Reject invalid hex color
- GIVEN a POST request with `color: "red"` (not a 6-char hex)
- THEN the server returns HTTP 422 with a color validation error

#### Scenario: Reject icon not in the fixed icon set
- GIVEN a POST request with `icon: "nonexistent-icon-xyz"`
- THEN the server returns HTTP 422 with an icon validation error

#### Scenario: Reject duplicate name (case-insensitive)
- GIVEN a category named "Food & Drink" already exists
- WHEN a POST request is submitted with `{ name: "food & drink", ... }`
- THEN the server returns HTTP 422 with a duplicate-name error

---

### Requirement: Edit Category (FR-CAT-02)

A user can update name, icon, color, or any combination via `PUT /api/categories/[id]`.
Only supplied fields are validated and updated.

#### Scenario: Rename an existing category
- WHEN a PUT request is submitted with `{ name: "Restaurants" }` for existing category
- THEN the server returns HTTP 200 with updated record

#### Scenario: Reject rename to blank string
- WHEN a PUT request is submitted with `{ name: "" }`
- THEN the server returns HTTP 422

#### Scenario: Reject rename to a duplicate name
- THEN the server returns HTTP 422 with a duplicate-name error

#### Scenario: Edit a non-existent category
- THEN the server returns HTTP 404

---

### Requirement: Delete Category (FR-CAT-03)

A user can delete a category only when no transaction references it.

#### Scenario: Successful deletion of an unused category
- WHEN DELETE /api/categories/[id] for a category with zero transactions
- THEN the server returns HTTP 200 and the category is removed

#### Scenario: Refuse deletion when transactions exist
- WHEN DELETE /api/categories/[id] for a category with transactions
- THEN the server returns HTTP 422 with `{ error: "Cannot delete a category that has associated transactions" }`

---

### Requirement: Default Category Seed (FR-CAT-04)

On first run, 7 default categories are seeded. Subsequent starts must not duplicate them.

#### Scenario: Default categories present after first-run seed
- THEN the DB contains: Food & Drink, Transport, Housing, Health, Entertainment, Income, Other
- AND each has a non-null icon and valid hex color

#### Scenario: Seed is idempotent on subsequent runs
- THEN no duplicate rows are inserted; user edits are preserved

---

### Requirement: Silent Console (NFR-OBS-01)
No console warnings or errors during normal category operations.

### Requirement: Centralised UI Strings (NFR-I18N-01)
All user-visible strings sourced from `lib/i18n/en.ts`.
