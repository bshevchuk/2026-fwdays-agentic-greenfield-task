# Budget Limits Specification

## Purpose

Budget limits allow users to set a monthly spending ceiling per category, expressed as a numeric value in the current session display currency. The dashboard surfaces each category's month-to-date expense spend against its limit as a labeled, color-coded progress bar so users can see at a glance whether they are on track, approaching, or over budget. Categories without a limit show a plain spend total and no progress bar. The core computation is encapsulated in a pure, framework-free function so that it is fully unit-testable in isolation.

## Requirements

### Requirement: Set Category Budget Limit (FR-BUDGET-01)

A user can assign a positive monthly spending limit to any category. The limit is stored as a raw positive number against the category record — not against a specific month, and not tagged with a currency code. The numeric value is entered in the active display currency at the time of setting. Once persisted, the limit applies to every subsequent month until the user explicitly changes or removes it. A value of zero is treated as equivalent to removing the limit.

#### Scenario: User sets a valid positive limit on a category with no existing limit

- GIVEN a category "Food" with no budget limit
- WHEN the user enters `250` as the monthly limit and confirms
- THEN the category record stores the value `250`
- AND the dashboard begins showing a progress bar for "Food"

#### Scenario: User updates an existing limit to a new positive value

- GIVEN a category "Transport" with a stored limit of `150`
- WHEN the user changes the limit to `200` and confirms
- THEN the category record reflects the updated value `200`
- AND the progress bar on the dashboard redraws against the new limit without a full page reload

#### Scenario: User removes a limit by clearing the field

- GIVEN a category "Entertainment" with a stored limit of `100`
- WHEN the user clears the limit field (leaves it empty) and confirms
- THEN the category record has no limit value
- AND the dashboard shows only the month-to-date spend total for "Entertainment" with no progress bar

#### Scenario: User enters a negative value — rejected with inline validation error

- GIVEN the budget limit input for any category
- WHEN the user types `-50` and attempts to save
- THEN the save is rejected before any write to the database
- AND an inline validation error message is displayed (sourced from `lib/i18n/en.ts`, NFR-I18N-01)
- AND no change is made to the category record
- AND no uncaught exception appears in the browser console (NFR-OBS-01)

#### Scenario: User enters zero — treated as no limit

- GIVEN the budget limit input for any category
- WHEN the user enters `0` and confirms
- THEN the system treats this as removing the limit (equivalent to clearing the field)
- AND the category record stores no positive limit value
- AND the dashboard shows only the month-to-date spend total with no progress bar

### Requirement: Dashboard Budget Progress Display (FR-BUDGET-02)

For every category that has a positive stored limit, the dashboard renders a labeled progress bar showing the month-to-date expense spend (in display currency) against that limit. Only expense-type transactions contribute to spend; income transactions are excluded.

#### Scenario: Category with a limit shows a labeled progress bar

- GIVEN a category "Housing" with a limit of `800`
- AND month-to-date expense transactions for "Housing" totaling `500` in display currency after FX conversion
- WHEN the user views the dashboard
- THEN a progress bar for "Housing" is visible
- AND the bar is labeled with both the spent amount (e.g. "500") and the limit (e.g. "800")
- AND the bar fill reflects the ratio 500 / 800

#### Scenario: Each budgeted category has its own independent progress bar

- GIVEN category "Food" with limit `300` and month-to-date spend `120`
- AND category "Health" with limit `200` and month-to-date spend `180`
- WHEN the dashboard renders
- THEN "Food" shows a progress bar with fill ratio 120 / 300
- AND "Health" shows a separate progress bar with fill ratio 180 / 200
- AND the two bars are visually independent

#### Scenario: Income transactions are excluded from budget spend

- GIVEN a category "Income" (or any category) with a limit of `500`
- AND a month-to-date income transaction of `1000` in that category
- AND no expense transactions in that category this month
- WHEN the dashboard renders the progress bar
- THEN the spend total displayed is `0` and the bar fill is empty

### Requirement: Progress Bar Color Coding (FR-BUDGET-03)

The fill color of a progress bar communicates spend severity using three states determined by the ratio of spend to limit. Thresholds are: green when ratio < 0.80, yellow when 0.80 ≤ ratio < 1.00, red when ratio ≥ 1.00.

#### Scenario: Spend below 80% — bar is green

- GIVEN a category with limit `100` and month-to-date spend `79`
- WHEN the dashboard renders the progress bar
- THEN the bar fill color is green (ratio = 0.79, below the 0.80 warning threshold)

#### Scenario: Spend exactly at 80% — bar is yellow

- GIVEN a category with limit `100` and month-to-date spend `80`
- WHEN the dashboard renders the progress bar
- THEN the bar fill color is yellow (ratio = 0.80, at the lower warning boundary)

#### Scenario: Spend between 80% and 99% — bar is yellow

- GIVEN a category with limit `100` and month-to-date spend `95`
- WHEN the dashboard renders the progress bar
- THEN the bar fill color is yellow (ratio = 0.95, within the 0.80–0.99 warning band)

#### Scenario: Spend exactly at 100% — bar is red

- GIVEN a category with limit `100` and month-to-date spend `100`
- WHEN the dashboard renders the progress bar
- THEN the bar fill color is red (ratio = 1.00, at the over-budget threshold)

#### Scenario: Spend exceeds the limit — bar is red and capped at full width

- GIVEN a category with limit `100` and month-to-date spend `140`
- WHEN the dashboard renders the progress bar
- THEN the bar fill color is red
- AND the visual fill width is capped at 100% of the bar container (no overflow)
- AND the labeled spend amount still reflects the actual value (140)

### Requirement: Limitless Category Spend Display (FR-BUDGET-04)

Categories with no positive budget limit still appear on the dashboard but render only a plain month-to-date spend total. No progress bar, no ratio, and no color coding are present.

#### Scenario: Category without a limit shows spend total and no progress bar

- GIVEN a category "Dining" with no budget limit
- AND month-to-date expense transactions for "Dining" totaling `63.50` in display currency
- WHEN the user views the dashboard
- THEN the "Dining" entry displays the spend amount `63.50` in display currency
- AND no progress bar element is rendered for "Dining"

#### Scenario: Category without a limit and no transactions shows zero spend

- GIVEN a category "Books" with no budget limit and no transactions this month
- WHEN the user views the dashboard
- THEN the "Books" entry displays a spend total of `0` (formatted in display currency)
- AND no progress bar is rendered

### Requirement: budgetStatus Pure Function (FR-BUDGET-05, TC-PURE-01)

`budgetStatus(transactions, limit, displayCurrency, rates)` is a pure function in `lib/budget/status.ts`. It accepts an array of transactions (each carrying its own currency code and the USD exchange rate stored at entry time), a positive numeric limit, an ISO 4217 display-currency code, and a rates map, and returns `{ spent: number; ratio: number; status: 'ok' | 'warning' | 'over' }`. The caller is responsible for pre-filtering transactions to the relevant category and calendar month before passing them. The function has no side effects and imports nothing from `next/*`, `react`, or DOM globals (TC-PURE-01).

#### Scenario: Returns 'ok' when spend is below 80% of limit

- GIVEN transactions that sum to `60` in display currency and a limit of `100`
- WHEN `budgetStatus` is called
- THEN it returns `{ spent: 60, ratio: 0.6, status: 'ok' }`

#### Scenario: Returns 'warning' when spend is exactly at 80% of limit

- GIVEN transactions summing to `80` in display currency and a limit of `100`
- WHEN `budgetStatus` is called
- THEN it returns `{ spent: 80, ratio: 0.8, status: 'warning' }`

#### Scenario: Returns 'warning' when spend is between 80% and 99% of limit

- GIVEN transactions summing to `95` in display currency and a limit of `100`
- WHEN `budgetStatus` is called
- THEN it returns `{ spent: 95, ratio: 0.95, status: 'warning' }`

#### Scenario: Returns 'over' when spend equals the limit exactly

- GIVEN transactions summing to `100` in display currency and a limit of `100`
- WHEN `budgetStatus` is called
- THEN it returns `{ spent: 100, ratio: 1.0, status: 'over' }`

#### Scenario: Returns 'over' when spend exceeds the limit

- GIVEN transactions summing to `130` in display currency and a limit of `100`
- WHEN `budgetStatus` is called
- THEN it returns `{ spent: 130, ratio: 1.3, status: 'over' }`

#### Scenario: Converts multi-currency transactions to display currency before summing

- GIVEN two transactions: 50 USD (USD rate 1.0 to USD) and 40 EUR (EUR rate 1.1 to USD)
- AND displayCurrency = 'USD' with a rates map that resolves EUR → USD at 1.1
- AND a limit of `200`
- WHEN `budgetStatus` is called
- THEN `spent` equals `50 + (40 × 1.1)` = `94`
- AND `ratio` equals `94 / 200` = `0.47`
- AND `status` is `'ok'`

#### Scenario: Returns zero spent and 'ok' when transaction list is empty

- GIVEN an empty transaction array and a limit of `100`
- WHEN `budgetStatus` is called
- THEN it returns `{ spent: 0, ratio: 0, status: 'ok' }`

#### Scenario: Function has no framework dependencies

- GIVEN the source file `lib/budget/status.ts`
- WHEN its imports are inspected
- THEN there are no imports from `next/*`, `react`, `react-dom`, or any browser / DOM API
- AND the function can be exercised in a plain Vitest environment with no Next.js runtime

### Requirement: Display Currency Change Leaves Limits Intact

When the user changes the session display currency, stored budget limit values remain unchanged (FR-FX-04 governs re-derivation of spend). The numeric limit is now interpreted in the new display currency, which may be economically inconsistent with the value entered under the previous currency. This is an acknowledged MVP limitation — limits are not automatically re-converted.

#### Scenario: Switching display currency does not alter the stored limit value

- GIVEN a category "Transport" with a stored limit of `150` set while display currency was USD
- WHEN the user switches the session display currency to EUR
- THEN the stored limit for "Transport" remains `150` (not re-converted to EUR)
- AND the dashboard progress bar renders against `150` (now treated as a EUR-denominated limit)
- AND the spend is re-derived by converting all "Transport" expense transactions to EUR

#### Scenario: Progress bar color thresholds apply to post-conversion spend versus unchanged limit

- GIVEN a category "Food" with a stored limit of `100` (originally set in USD)
- AND after switching display currency to EUR, month-to-date spend converts to `85 EUR`
- WHEN the dashboard renders
- THEN the ratio is computed as `85 / 100` = `0.85`
- AND the bar is shown in yellow

### Requirement: Silent Console During Budget Operations (NFR-OBS-01)

No JavaScript console warnings or errors are emitted during normal budget limit interactions on a healthy session.

#### Scenario: Setting a valid budget limit emits no console output

- GIVEN the browser console contains no pre-existing messages
- WHEN the user sets a valid positive budget limit on a category and saves
- THEN no warnings, errors, or unhandled promise rejections appear in the console

#### Scenario: Dashboard rendering of progress bars emits no console output

- GIVEN categories with active limits and month-to-date expense data
- WHEN the dashboard page loads and renders all progress bars
- THEN the console is free of React prop warnings, key warnings, and hydration errors

### Requirement: Centralised UI Strings (NFR-I18N-01)

All user-visible strings for budget limit UI — field labels, placeholders, validation error messages, accessible names (aria-label, aria-describedby) — must be defined in `lib/i18n/en.ts`. No budget-related UI string literals may appear inline in component or page files.

#### Scenario: All budget UI strings are sourced from lib/i18n/en.ts

- GIVEN the source files for budget limit components and the limit-setting form
- WHEN the files are inspected for string literals rendered to the user
- THEN every such string is imported from or referenced through `lib/i18n/en.ts`
- AND no budget-related user-visible string literal is hardcoded directly in a component file

## Exclusions

The following are intentionally out of scope for this capability in MVP and must not be reported as bugs:

- **Per-month budget history**: limits apply to the current calendar month only; there is no historical record of prior limits or utilization rates.
- **Multiple budget periods**: only a single persistent limit per category is supported; weekly, quarterly, or annual periods are not modelled.
- **Rollover**: unspent budget from one month does not carry forward to the next.
- **Budget templates**: there is no mechanism to apply a predefined set of limits to multiple categories simultaneously.
- **Per-category currency denomination**: the limit is stored as a raw number with no currency tag; its currency context comes solely from the active session display currency.
- **Automatic limit re-conversion on currency change**: when the display currency changes, stored limit values are not recalculated; the raw number is reinterpreted in the new currency.
- **Over-budget notifications or alerts**: the progress bar color change is the only affordance for over-budget status; no push notifications, banners, or email alerts are issued.
- **Item (transaction) images**: not supported anywhere in MVP.
