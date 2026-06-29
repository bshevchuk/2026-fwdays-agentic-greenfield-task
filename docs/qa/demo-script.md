# Demo Script — Budget Expense Tracker

Acceptance walkthrough: 10 minutes
Audience: customer / product stakeholder
Presenter prerequisite: `npm run dev` running at `http://localhost:3000`, fresh database (no prior data), Chrome DevTools closed

---

## Before you begin

Seed state: delete `./budget.db` and restart `npm run dev` so the app opens on a clean slate with only the 7 default categories. Have a second terminal ready to show the test run output if the customer asks for it.

Acceptance criteria this demo exercises: FR-SHELL-01 through FR-SHELL-03, FR-CAT-01 through FR-CAT-04, FR-TX-01 through FR-TX-07, FR-BUDGET-01 through FR-BUDGET-05, FR-FX-01 through FR-FX-05, FR-CHART-01 through FR-CHART-05.

---

## Scene 1 — App overview (30 seconds)

**Goal:** show that the app loads and the shell is complete.

1. Open Chrome at `http://localhost:3000`.
2. Point out the top bar: app name on the left, currency selector on the right. Say: "The currency selector drives every monetary figure on the page — we will demonstrate that live in Scene 4."
3. Point out the empty state: the heading, the short body copy, and the "Add your first transaction" button centered on the page.
4. Click the "Settings" link in the top bar to show navigation works.

**Talking points:** no login required, no cookies beyond Next.js runtime, all data is local to this deployment.

---

## Scene 2 — Category management (2 minutes)

**Goal:** demonstrate FR-CAT-01, FR-CAT-04, FR-BUDGET-01.

1. On the `/settings` page, point out the 7 default categories (Food & Drink, Transport, Housing, Health, Entertainment, Income, Other). Say: "These are seeded on first run — the migration is idempotent and safe to re-run."
2. Click "Add category".
3. In the form:
   - Name: type `Groceries`
   - Icon: click the shopping cart icon
   - Color: enter `#10b981`
   - Budget limit: enter `300`
4. Submit. The new category appears in the list with a green swatch.
5. Click edit on the new category. Change the name to `Grocery`. Submit. The row updates in place.
6. Say: "Deleting a category is blocked if it has transactions — we will demonstrate that after we add data."

---

## Scene 3 — Add transactions (3 minutes)

**Goal:** demonstrate FR-TX-01, FR-FX-01, FR-FX-02, FR-FX-05.

1. Click the app logo (or home link) to return to `http://localhost:3000`.
2. Click "Add your first transaction".
3. Add transaction 1:
   - Amount: `120`
   - Currency: `USD`
   - Date: today (auto-populated)
   - Category: `Grocery`
   - Type: `Expense`
   - Note: `Weekly shop`
   - Submit. Say: "The app calls frankfurter.app from a server-side Route Handler — the client bundle never touches the FX API directly."
4. Add transaction 2:
   - Amount: `85`
   - Currency: `EUR`
   - Date: first day of this month
   - Category: `Grocery`
   - Type: `Expense`
   - Note: (leave blank)
   - Submit.
5. Add transaction 3:
   - Amount: `2500`
   - Currency: `USD`
   - Date: 15th of last month
   - Category: `Income`
   - Type: `Income`
   - Note: `Salary`
   - Submit.
6. Show the transaction list. Point out: date (human-readable), amount + currency, category icon + name, type badge, note excerpt. Say: "Filtering by month, category, or type is done here without a page reload."
7. Change the month filter to last month. Show that only the salary transaction appears. Change it back to the current month.

---

## Scene 4 — Dashboard overview (2 minutes)

**Goal:** demonstrate FR-BUDGET-01 through FR-BUDGET-05, FR-FX-04.

1. On the dashboard, scroll to the BudgetDashboard section.
2. Point out "Grocery" showing a progress bar. Say: "The bar is green because spending is below 80 percent of the 300 limit."
3. In the top bar, change the display currency from `USD` to `EUR`.
4. Observe: all amounts on the page re-derive in EUR immediately without a reload. The progress bar limit and spend figures update. Say: "No additional DB call is made — the rates stored at transaction time are used for the conversion."
5. Change back to `USD`.
6. Add another expense to push Grocery over the limit if desired: Amount `250 USD`, Category `Grocery`, Type `Expense`. The bar turns yellow (if 80–99%) or red (if >= 100%).

---

## Scene 5 — Charts (2 minutes)

**Goal:** demonstrate FR-CHART-01 through FR-CHART-05.

1. Scroll to the ChartsDashboard section. Point out the skeleton that appears briefly before the charts hydrate (FR-CHART-04).
2. Donut chart: the chart shows the Grocery category as a colored slice with a legend. Say: "Amounts are in the selected display currency."
3. Hover over the donut slice. Show the tooltip with: category name, amount, percentage (100% or similar based on data).
4. Bar chart: 12-month trailing view. The current month has an expense bar. Last month has an income bar (salary).
5. Hover a bar to show the tooltip with income and expense values.
6. Change the month selector in the donut to last month. The donut updates to show no spending (only income was recorded last month — the donut stays empty for expenses).

---

## Scene 6 — Edit and delete flows (30 seconds)

**Goal:** demonstrate FR-TX-03, FR-TX-04, FR-CAT-03.

1. In the transaction list, click edit on the 120 USD transaction.
2. Change the amount to `130`. Submit. The row updates immediately.
3. Say: "The exchange rate stored at creation is not re-fetched on edit — it is locked to the original rate."
4. Click delete on the same transaction. The confirmation dialog appears. Click "Delete". The row disappears.
5. Navigate to `/settings`. Try to delete the "Grocery" category (it still has transactions). Point out the inline error: "Cannot delete a category with associated transactions."

---

## Closing (30 seconds)

- Recap: "204 automated unit and integration tests, all passing, zero failures. The areas without automated tests — responsive layout, FX fetch, chart rendering, progress bar colors — are covered by this walkthrough and the manual test plan in `docs/qa/manual-test-plan.md`."
- Offer to run `npm run test:run` live if the customer wants to see the test output.
- Hand the `docs/qa/mvp-acceptance-report.md` to the customer for sign-off.
