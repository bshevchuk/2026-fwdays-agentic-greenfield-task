# Spec: add-fx (change copy)

> This is a change-copy of `openspec/specs/fx/spec.md` captured at the time
> this change folder was created. The canonical baseline spec is the source of truth.

## ADDED Requirements

### Requirement: Transaction Currency and Rate Storage (FR-FX-01)

Each transaction record persists two FX fields: the ISO 4217 currency code and the
rate from that currency to USD at moment of entry. These fields are immutable after creation.

#### Scenario: Transaction is saved with currency code and rate-to-USD
- GIVEN amount=150, currency=EUR submitted
- THEN record contains `currency="EUR"` and non-null `rateToUsd`; raw `amount` is 150

#### Scenario: Rate field is set at entry time and never overwritten
- GIVEN a transaction with `rateToUsd=0.0067` on day 1
- WHEN display currency changes on day 2
- THEN stored `rateToUsd` remains 0.0067

---

### Requirement: Rate Fetch on Transaction Creation (FR-FX-02, TC-FX-01)

Rate fetch happens in a Route Handler only. On failure, transaction is not persisted.

#### Scenario: Successful rate fetch stores the rate
- GIVEN frankfurter.app is reachable and currency=GBP
- THEN `rateToUsd` = `rates.USD` from the response; HTTP 201 returned

#### Scenario: Network failure blocks transaction creation
- THEN transaction NOT written; HTTP 4xx/5xx with fetch-failure message returned

#### Scenario: Rate fetch never originates from the client bundle (TC-FX-01)
- THEN no request to frankfurter.app from the browser; all calls from Route Handler

---

### Requirement: Unknown Currency Rejected Before Fetch (FR-FX-02)

Unrecognised ISO 4217 code produces inline validation error before any network call.

#### Scenario: Unrecognised currency code → inline validation error
- WHEN user types "XYZ" and submits → inline error; no Route Handler request sent

---

### Requirement: Session-Scoped In-Memory Rate Cache (FR-FX-03)

Each unique currency fetched at most once per server process lifetime.

#### Scenario: Second transaction in same currency reuses cached rate
- THEN no additional frankfurter.app call for CAD

#### Scenario: Different currency triggers a new fetch
- THEN exactly one new call for AUD

#### Scenario: Cache does not persist across server restarts
- THEN fresh call made after restart

---

### Requirement: Display-Currency Re-Derivation Without DB Re-Fetch (FR-FX-04)

Changing display currency re-derives amounts from stored `rateToUsd`; no DB/API calls.

#### Scenario: Switching currency re-derives all totals immediately
- THEN amounts update; no DB or frankfurter.app requests fired

---

### Requirement: Pure convertAmount Function (FR-FX-05, TC-PURE-01)

`convertAmount(amount, fromCurrency, toCurrency, rates): number` in `lib/fx/convert.ts`.

#### Scenario: USD-pivot conversion
- GIVEN rates={EUR:1.08, GBP:1.27}, amount=100 EUR→GBP
- THEN result ≈ 85.04 (within floating-point tolerance)

#### Scenario: Same-currency returns amount unchanged
- `convertAmount(250, "USD", "USD", rates)` → 250

#### Scenario: Missing rate for fromCurrency throws typed error
- → throws `FxConversionError` with identifying message

#### Scenario: Zero rate for toCurrency throws typed error
- → throws `FxConversionError`; result never Infinity or NaN

#### Scenario: No framework or DOM imports (TC-PURE-01)
- No `next/*`, `react`, or DOM globals imported

---

### Requirement: Console Silence on Healthy FX Flow (NFR-OBS-01)
No console output during rate fetch, cache hit, currency switch, or conversion.

### Requirement: FX UI Strings Centralised in i18n Module (NFR-I18N-01)
All FX strings (error messages, labels, attribution) in `lib/i18n/en.ts`.

### Requirement: Rate Fetch Does Not Block Dashboard TTFB (NFR-PERF-01)
Rate fetch only on transaction creation; dashboard load makes no frankfurter.app call.

### Requirement: frankfurter.app Attribution in Footer (BC-BRAND-02)
Footer contains `<a href="https://www.frankfurter.app">` keyboard-accessible link.
