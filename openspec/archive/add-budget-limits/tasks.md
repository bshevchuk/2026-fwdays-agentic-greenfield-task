# Tasks: add-budget-limits

## 1. Pre-flight

- [x] 1.1 Read spec FR-BUDGET-01 through FR-BUDGET-05
- [x] 1.2 Confirm `budget_limit REAL` column exists in 002_categories.sql — no new migration needed
- [x] 1.3 Confirm 169 tests pass on main before starting

## 2. RED tests (write first, confirm they FAIL)

- [x] 2.1 Write `lib/budget/status.test.ts` (`@trace FR-BUDGET-05`):
  - empty transactions → `{ spent: 0, ratio: 0, status: 'ok' }`
  - spend 60, limit 100 → status 'ok', ratio 0.6
  - spend 80, limit 100 → status 'warning', ratio 0.8 (boundary)
  - spend 95, limit 100 → status 'warning', ratio 0.95
  - spend 100, limit 100 → status 'over', ratio 1.0 (boundary)
  - spend 130, limit 100 → status 'over', ratio 1.3
  - multi-currency: 50 USD + 40 EUR (rate_to_usd 1.1 for EUR) in USD display → spent = 94
  - income transactions excluded from spend total
  - no import from `next/*` or `react` (inspect import list)
- [x] 2.2 Run `npm run test:run` — confirm new tests FAIL with "Cannot find module" or equivalent

## 3. Implementation

- [x] 3.1 Write `lib/budget/status.ts`:
  - signature: `budgetStatus(transactions: TransactionRow[], limit: number, displayCurrency: string, rates: Record<string, number>): { spent: number; ratio: number; status: 'ok' | 'warning' | 'over' }`
  - filter to `type === 'expense'` only
  - convert each `amount_cents / 100` via `convertAmount`
  - thresholds: ratio < 0.8 → ok; ratio < 1.0 → warning; ratio ≥ 1.0 → over
  - pure: no side effects, no framework imports

- [x] 3.2 Add to `lib/i18n/en.ts`:
  - `BUDGET_LIMIT_LABEL`, `BUDGET_LIMIT_PLACEHOLDER`, `BUDGET_LIMIT_INVALID`
  - `BUDGET_STATUS_OK`, `BUDGET_STATUS_WARNING`, `BUDGET_STATUS_OVER`
  - `BUDGET_SPEND_LABEL`, `BUDGET_OF_LIMIT`, `BUDGET_NO_LIMIT`
  - `BUDGET_DASHBOARD_TITLE`

- [x] 3.3 Add `PUT /api/categories/[id]/limit` Route Handler at `app/api/categories/[id]/limit/route.ts`:
  - Body: `{ limit: number | null }`
  - Validate: null is valid (clear); number must be > 0 else 422
  - Call `repo.updateCategory(id, { budget_limit: body.limit ?? null })`
  - Return updated category row or 404 if not found

- [x] 3.4 Update `components/categories/CategoryForm.tsx`:
  - Add optional budget limit number input
  - Empty = null (clear); positive decimal = new limit; zero or negative = inline error

- [x] 3.5 Write `components/BudgetDashboard.tsx` (Client Component):
  - On mount: fetch `/api/categories`, `/api/transactions?month=YYYY-MM&type=expense`, `/api/fx/rates?currency=<displayCurrency>`
  - For each category with `budget_limit > 0`: call `budgetStatus()`, render colored progress bar
  - For each category without limit (or with 0): render spend-only row, no bar
  - Colors: status 'ok' → green, 'warning' → yellow/amber, 'over' → red
  - Uses `useDisplayCurrency()` for current display currency

- [x] 3.6 Update `app/page.tsx` to render `<BudgetDashboard />` alongside `<TransactionList />`

## 4. Gate

- [x] 4.1 `npm run test:run` — all tests pass (target ≥ 178)
- [x] 4.2 `npm run lint` — 0 errors
- [x] 4.3 `npm run build` — success
- [x] 4.4 `node scripts/check-traceability.mjs` — 0 failures

## 5. Commit and archive

- [ ] 5.1 `git add -A && git commit` with `Slice: add-budget-limits` and `Refs: FR-BUDGET-01, FR-BUDGET-02, FR-BUDGET-03, FR-BUDGET-04, FR-BUDGET-05`
- [ ] 5.2 `mv openspec/changes/add-budget-limits openspec/archive/add-budget-limits`
- [ ] 5.3 `git add openspec/ && git commit -m "chore: archive add-budget-limits change folder"`
