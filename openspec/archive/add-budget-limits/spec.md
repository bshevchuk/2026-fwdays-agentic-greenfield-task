# Spec: add-budget-limits

## ADDED Requirements

Sourced from `openspec/specs/budget-limits/spec.md`. All scenarios apply.

### FR-BUDGET-01: Set Category Budget Limit

A user can assign a positive monthly spending limit to any category. Stored as a raw positive number (no currency tag). Zero is equivalent to removing the limit.

**Scenario: Set valid positive limit on category with no existing limit**
- GIVEN category "Food" with no budget limit
- WHEN user enters 250 as the monthly limit and confirms
- THEN category record stores 250 AND dashboard shows a progress bar for "Food"

**Scenario: Update existing limit to new positive value**
- GIVEN category "Transport" with stored limit 150
- WHEN user changes limit to 200 and confirms
- THEN category record reflects 200 AND progress bar redraws against new limit

**Scenario: Remove limit by clearing the field**
- GIVEN category "Entertainment" with stored limit 100
- WHEN user clears the limit field and confirms
- THEN category record has no limit AND dashboard shows only spend total, no progress bar

**Scenario: Negative value rejected with inline error**
- GIVEN budget limit input for any category
- WHEN user types -50 and attempts to save
- THEN save rejected before any DB write AND inline error shown (from lib/i18n/en.ts)

**Scenario: Zero treated as no limit**
- GIVEN budget limit input for any category
- WHEN user enters 0 and confirms
- THEN system removes the limit AND dashboard shows spend-only row, no bar

### FR-BUDGET-02: Dashboard Budget Progress Display

For every category with a positive stored limit, the dashboard renders a labeled progress bar showing month-to-date expense spend (in display currency) vs the limit. Income transactions excluded.

**Scenario: Category with limit shows labeled progress bar**
- GIVEN "Housing" with limit 800 AND month-to-date expense spend 500 in display currency
- WHEN user views dashboard
- THEN progress bar for "Housing" is visible, labeled with spent and limit, fill = 500/800

**Scenario: Each budgeted category has independent progress bar**
- GIVEN "Food" limit 300 spend 120; "Health" limit 200 spend 180
- WHEN dashboard renders
- THEN "Food" shows ratio 120/300 AND "Health" shows ratio 180/200 — visually independent

**Scenario: Income transactions excluded from spend**
- GIVEN category with limit 500 AND income transaction 1000 AND no expense transactions
- WHEN dashboard renders
- THEN spend is 0 and bar fill is empty

### FR-BUDGET-03: Color-Coded Progress Bar Status

The progress bar is colored to communicate urgency:
- Green: ratio < 0.80
- Yellow/amber: 0.80 ≤ ratio < 1.0
- Red: ratio ≥ 1.0

**Scenario: Bar is green when below 80%** — ratio 0.6 → green
**Scenario: Bar turns yellow at exactly 80%** — ratio 0.8 → yellow
**Scenario: Bar turns red at exactly 100%** — ratio 1.0 → red
**Scenario: Bar stays red above 100%** — ratio 1.3 → red, bar capped at 100% width, label shows overage

### FR-BUDGET-04: Categories Without Limits Show Spend Only

Categories without a positive budget limit show only the month-to-date expense spend total. No progress bar, no ratio. If spend is zero, the value 0 is shown.

**Scenario: No-limit category shows plain spend total**
- GIVEN "Books" with no budget limit AND month-to-date expense 45 in display currency
- WHEN user views dashboard
- THEN "Books" entry shows spend total (no bar)

**Scenario: No-limit category with zero spend shows 0**
- GIVEN "Books" with no limit AND no expense transactions this month
- WHEN user views dashboard
- THEN "Books" shows 0 and no progress bar

### FR-BUDGET-05: budgetStatus Pure Function (TC-PURE-01)

`budgetStatus(transactions, limit, displayCurrency, rates)` in `lib/budget/status.ts`.

Signature:
```ts
budgetStatus(
  transactions: TransactionRow[],
  limit: number,
  displayCurrency: string,
  rates: Record<string, number>
): { spent: number; ratio: number; status: 'ok' | 'warning' | 'over' }
```

No imports from `next/*`, `react`, `react-dom`, or DOM globals.

**Scenario: Returns 'ok' when spend < 80%** — sum 60, limit 100 → {spent:60, ratio:0.6, status:'ok'}
**Scenario: Returns 'warning' at exactly 80%** — sum 80, limit 100 → {spent:80, ratio:0.8, status:'warning'}
**Scenario: Returns 'warning' between 80% and 99%** — sum 95, limit 100 → {spent:95, ratio:0.95, status:'warning'}
**Scenario: Returns 'over' at exactly 100%** — sum 100, limit 100 → {spent:100, ratio:1.0, status:'over'}
**Scenario: Returns 'over' above 100%** — sum 130, limit 100 → {spent:130, ratio:1.3, status:'over'}
**Scenario: Multi-currency conversion** — 50 USD + 40 EUR (rate_to_usd=1.1) in USD display, limit 200 → spent=94, ratio=0.47, status='ok'
**Scenario: Empty transactions** → {spent:0, ratio:0, status:'ok'}
**Scenario: No framework imports** — source file has no next/* or react imports

## Exclusions (MVP)

- Per-month limit history
- Rollover of unspent budget
- Per-category currency denomination on limits
- Automatic limit re-conversion on display currency change
- Over-budget notifications or push alerts
