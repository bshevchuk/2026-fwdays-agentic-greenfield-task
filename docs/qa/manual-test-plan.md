# Manual Test Plan — Budget Expense Tracker

Version: 1.0
Date: 2026-06-29
Executor profile: non-developer, Chrome browser, macOS or Windows
Prerequisite: running dev server at `http://localhost:3000` (`npm run dev`)
Database state: fresh (no prior data, or reset by deleting `./budget.db`)

---

## Setup

1. From the repo root, run `npm run dev`.
2. Wait for the "Ready" message.
3. Open Chrome and navigate to `http://localhost:3000`.
4. Open DevTools Console (Cmd/Ctrl + Opt + J) and leave it visible throughout testing. Any red error logged during a step is a failure of NFR-OBS-01.

---

## TC-M-01 — App loads with empty state

**FR covered:** FR-SHELL-01, FR-SHELL-03

**Steps:**

1. Navigate to `http://localhost:3000` on a fresh database.
2. Observe the top bar at the top of the page.
3. Observe the main content area below the top bar.

**Expected results:**

- The top bar is visible and sticky (stays at the top when scrolling).
- The top bar contains the app name ("Budget Expense Tracker" or equivalent) and a currency selector control (a `<select>` element with at least 10 currency options including USD and EUR).
- The main content area shows an empty state heading and body copy.
- A button labelled "Add your first transaction" is prominently displayed in the center of the viewport.
- DevTools Console shows no errors.

---

## TC-M-02 — Responsive layout breakpoints

**FR covered:** FR-SHELL-02

**Steps:**

1. With the app loaded, open Chrome DevTools (Cmd/Ctrl + Shift + M) and set viewport width to 767 px.
2. Observe the layout.
3. Set viewport width to 768 px.
4. Observe the layout.
5. Set viewport width to 1280 px.
6. Observe the layout.

**Expected results:**

- At 767 px: single-column layout. All content sections stack vertically.
- At 768 px: two-column grid visible. Dashboard widgets appear side by side.
- At 1280 px: three-column grid visible. Three sections appear across the page.
- No content is clipped or overflows horizontally at any breakpoint.

---

## TC-M-03 — Settings page shows 7 default categories

**FR covered:** FR-CAT-04

**Steps:**

1. In the top bar, click the "Settings" link.
2. Verify the URL changes to `/settings`.
3. Count the categories listed on the page.

**Expected results:**

- The URL is `http://localhost:3000/settings`.
- Exactly 7 category rows are visible: Food & Drink, Transport, Housing, Health, Entertainment, Income, Other.
- Each row shows a colored icon and a hex color.

---

## TC-M-04 — Add a category with a budget limit

**FR covered:** FR-CAT-01, FR-BUDGET-01

**Steps:**

1. On the `/settings` page, click "Add category" (or equivalent create button).
2. Fill in the form:
   - Name: `Test Category`
   - Icon: select any icon from the grid (e.g. the star or tag icon)
   - Color: enter `#22c55e`
   - Budget limit: enter `500`
3. Submit the form.

**Expected results:**

- The form submits without an error.
- A new row for "Test Category" appears in the category list with the green color swatch.
- The budget limit value 500 is shown or reflected in the form when re-opening.
- Total categories shown is now 8.
- DevTools Console shows no errors.

---

## TC-M-05 — Add a transaction (expense, USD)

**FR covered:** FR-TX-01, FR-TX-02, FR-FX-02

**Steps:**

1. Navigate back to `http://localhost:3000` (click the app logo or the home link).
2. Click "Add your first transaction" (or the "Add transaction" button if data exists).
3. The transaction modal opens. Fill in:
   - Amount: `49.99`
   - Currency: `USD`
   - Date: today's date (should default to today)
   - Category: select "Test Category"
   - Type: `Expense`
   - Note: `Lunch`
4. Submit the form.

**Expected results:**

- The modal closes without an error.
- The transaction list on the dashboard immediately shows the new transaction without a page reload.
- The row shows: today's date, "49.99 USD", "Test Category" (with its icon), "Expense" badge, and "Lunch".
- The empty-state CTA is no longer visible.
- DevTools Console shows no errors.

---

## TC-M-06 — Add a second transaction in EUR

**FR covered:** FR-TX-01, FR-FX-01, FR-FX-02

**Steps:**

1. Click "Add transaction".
2. Fill in:
   - Amount: `100`
   - Currency: `EUR`
   - Date: today's date
   - Category: select "Test Category"
   - Type: `Expense`
   - Note: (leave blank)
3. Submit the form.

**Expected results:**

- The modal closes without an error.
- The transaction list now shows two rows for today.
- The second row shows "100.00 EUR".
- `rate_to_usd` was fetched and stored silently (user does not see it; it is stored in the DB).
- DevTools Console shows no errors.

---

## TC-M-07 — BudgetDashboard shows progress bar for category with limit

**FR covered:** FR-BUDGET-01, FR-BUDGET-02, FR-BUDGET-03

**Steps:**

1. On the dashboard, locate the BudgetDashboard section (shows category spend vs. limits).
2. Find the row for "Test Category".
3. Observe the progress bar and its color.

**Expected results:**

- "Test Category" shows a progress bar (it has `budget_limit = 500`).
- The bar shows month-to-date spending. With 49.99 USD + 100 EUR (converted), total spend in USD is the sum of both in USD. The bar is partially filled.
- Bar color is green (below 80% of 500 at these amounts).
- The label shows the spent amount and "/ 500" (or equivalent display currency limit).
- DevTools Console shows no errors.

---

## TC-M-08 — Switch display currency

**FR covered:** FR-FX-04

**Steps:**

1. In the top bar, locate the currency selector.
2. Change the display currency from `USD` to `EUR`.
3. Observe all monetary values on the dashboard.

**Expected results:**

- All transaction amounts, progress bar figures, and chart totals re-derive in EUR without a page reload.
- The 49.99 USD transaction now shows an EUR-equivalent amount (not 49.99).
- The progress bar limit and spend figures update to reflect EUR-denominated values.
- No page reload occurs (React state update only).
- DevTools Console shows no errors.

---

## TC-M-09 — ChartsDashboard: donut and bar chart

**FR covered:** FR-CHART-01, FR-CHART-02, FR-CHART-03, FR-CHART-04, FR-CHART-05

**Steps:**

1. Scroll down on the dashboard to the ChartsDashboard section.
2. Wait for charts to finish loading (skeleton replaces itself with actual charts).
3. Observe the donut chart.
4. Hover over the donut slice for "Test Category".
5. Observe the bar chart for trailing 12 months.
6. Hover over the bar for the current month.

**Expected results:**

- A skeleton placeholder is visible briefly before hydration (FR-CHART-04).
- The donut chart shows exactly one colored slice (Test Category) and a legend entry with the category name and color.
- Hovering the donut slice shows a tooltip containing the category name, the amount in the current display currency, and a percentage (100% since it is the only category).
- The bar chart shows 12 month columns. The current month has non-zero bars (income: 0, expense: amount of both transactions).
- Other months show flat (zero) bars.
- Hovering a bar shows a tooltip with income and expense figures.
- DevTools Console shows no errors.

---

## TC-M-10 — Edit a transaction (rate_to_usd must not change)

**FR covered:** FR-TX-03

**Steps:**

1. In the transaction list, click the edit button on the 49.99 USD transaction.
2. The edit modal opens with pre-populated fields.
3. Change Amount to `75.00` and Note to `Lunch updated`.
4. Do not change the currency.
5. Submit.

**Expected results:**

- The modal closes without an error.
- The transaction row updates to show "75.00 USD" and "Lunch updated".
- The `rate_to_usd` stored in the database is unchanged (the edit form does not re-fetch the rate; this is enforced server-side by excluding `rate_to_usd` from the PUT allow-list).
- DevTools Console shows no errors.

---

## TC-M-11 — Delete a transaction

**FR covered:** FR-TX-04

**Steps:**

1. In the transaction list, click the delete button on the 75.00 USD transaction.
2. A confirmation dialog appears.
3. Click "Cancel".
4. Verify the transaction is still in the list.
5. Click the delete button again.
6. Click "Delete" (confirm).

**Expected results:**

- After "Cancel": the transaction remains in the list unchanged.
- After "Delete": the transaction row disappears from the list immediately without a page reload.
- The BudgetDashboard spend total decreases.
- DevTools Console shows no errors.

---

## TC-M-12 — Delete a category that has a transaction (must be rejected)

**FR covered:** FR-CAT-03

**Steps:**

1. Navigate to `/settings`.
2. Find the "Test Category" row (it still has the 100 EUR transaction).
3. Click the delete button for "Test Category".

**Expected results:**

- The delete does not succeed.
- An inline error message appears on the category row indicating the category cannot be deleted because it has associated transactions (exact wording matches `CATEGORIES_DELETE_HAS_TRANSACTIONS` from `lib/i18n/en.ts`).
- The category remains in the list.
- DevTools Console shows no errors.

---

## TC-M-13 — Set limit to 0 clears the progress bar

**FR covered:** FR-BUDGET-04

**Steps:**

1. On `/settings`, click edit on "Test Category".
2. Set the budget limit field to `0` (or clear it entirely).
3. Submit.
4. Navigate back to `http://localhost:3000`.
5. Observe the BudgetDashboard for "Test Category".

**Expected results:**

- After clearing the limit, the BudgetDashboard row for "Test Category" shows only the month-to-date spend total.
- No progress bar is rendered for this category.
- DevTools Console shows no errors.

---

## Pass criteria

All 13 steps pass and the DevTools Console is clear of errors throughout (NFR-OBS-01). Record the date, browser version, and executor name in the sign-off row of `docs/qa/mvp-acceptance-report.md`.
