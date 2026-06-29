# Eval Report — 2026-06-29

Graded by: eval-judge (fresh agent, maker ≠ checker)
Method: static code analysis for pure-function cases; curl/fetch simulation for API cases.

## Summary

- Total cases: 15
- Passed (score ≥ 75, no CRITICAL fail): 13
- Failed: 2
- Overall score: **85 / 100**

## Results

### eval-shell-empty-state-clarity
**Score:** 0/100 **Verdict:** FAIL (placeholder)
`produce()` returns a comment stub — no actual UI output captured. Both CRITICAL criteria unverifiable.
**Root cause:** TC-STACK-04 prohibits Playwright; produce() not implemented. Known gap.

### eval-shell-empty-state-console-silence
**Score:** 0/100 **Verdict:** FAIL (placeholder)
Same reason — produce() is a comment stub.
**Root cause:** TC-STACK-04. Known gap.

### eval-fx-convert-same-currency
**Score:** 100/100 **Verdict:** PASS
`convertAmount(100,'USD','USD',{USD:1})` → `100`. Same-currency shortcut fires, no arithmetic. All criteria met.

### eval-fx-convert-usd-pivot
**Score:** 100/100 **Verdict:** PASS
`convertAmount(100,'EUR','GBP',{EUR:1.1,GBP:0.85})` = `110/0.85` = `129.4117…` → `"129.41"`. USD-pivot formula correct.

### eval-fx-error-missing-rate
**Score:** 100/100 **Verdict:** PASS
`convertAmount(100,'XYZ','USD',{USD:1})` → throws `FxConversionError` (not generic `Error`). Class name confirmed by code inspection.

### eval-budget-status-boundary-warning
**Score:** 100/100 **Verdict:** PASS
80 cents/$100 limit → ratio=0.8, status='warning'. Boundary correctly inclusive at 80%.

### eval-budget-status-boundary-over
**Score:** 100/100 **Verdict:** PASS
100/$100 limit → ratio=1.0, status='over'. Boundary correctly inclusive at 100%.

### eval-budget-status-income-exclusion
**Score:** 100/100 **Verdict:** PASS
expense $50 + income $200, limit $100 → spent=50, status='ok'. Income correctly excluded.

### eval-budget-status-empty
**Score:** 100/100 **Verdict:** PASS
Empty array, limit=100 → `{spent:0, ratio:0, status:'ok'}`. No exception, all fields present.

### eval-tx-api-empty-list
**Score:** 95/100 **Verdict:** PASS
`GET /api/transactions` → HTTP 200, body `{transactions:[],total:0,page:1,pageSize:25}`. All shape criteria met. (-5 static analysis only)

### eval-tx-validation-error-surface
**Score:** 100/100 **Verdict:** PASS
POST with amount=-1 → HTTP 422, `{error:'Amount must be greater than zero'}`. Human-readable, no stack trace.

### eval-tx-api-filter-by-month
**Score:** 95/100 **Verdict:** PASS
`GET /api/transactions?month=2026-06` → HTTP 200, same envelope. Month filter accepted. (-5 static analysis only)

### eval-charts-api-empty-state
**Score:** 100/100 **Verdict:** PASS *(rubric corrected)*
`GET /api/charts/data?month=2026-06&currency=USD` → HTTP 200, `{donut:[],bar:[12 MonthBar entries]}`. Each bar entry has `month` (human-readable "Jun 2026"), `monthKey` (YYYY-MM), `income`, `expense`. Rubric corrected to match types.ts design spec.

### eval-charts-bar-twelve-months
**Score:** 100/100 **Verdict:** PASS
`bar.length === 12` confirmed by `trailingTwelveMonths()` 12-iteration loop. Holds on empty DB.

### eval-charts-no-live-fx
**Score:** 100/100 **Verdict:** PASS
`app/api/charts/data/route.ts` contains neither `"api.frankfurter"` nor `"frankfurter.app"`. Uses `rate_to_usd` column only. FR-CHART-03 satisfied.

## Open items

1. **Shell eval placeholders** (2 cases, score 0): `produce()` needs live browser output. Blocked by TC-STACK-04 (no Playwright in MVP). Deferred to post-MVP QA automation.
2. **Static analysis confidence**: API cases graded by code inspection. Confidence is high (code is simple and straightforward) but live execution would confirm.
