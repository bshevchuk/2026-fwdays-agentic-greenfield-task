# Multi-Currency (FX) Specification

## Purpose

The FX capability enables users to record transactions in any ISO 4217 currency while viewing all amounts in a single chosen display currency. Each transaction captures its source currency and the exchange rate to USD at entry time, so all subsequent display conversions are derived purely from stored data without additional database or network round-trips. Exchange rates are fetched from the free, keyless frankfurter.app API exclusively inside Next.js Route Handlers and never exposed to the client bundle.

## Requirements

### Requirement: Transaction Currency and Rate Storage (FR-FX-01)

Each transaction record persists two FX fields: the ISO 4217 currency code the user chose and the exchange rate from that currency to USD that was current at the moment of entry. These fields are immutable after creation; no background job updates them.

#### Scenario: Transaction is saved with currency code and rate-to-USD

- GIVEN a user submits the transaction form with amount `150`, currency `EUR`, and a valid date
- WHEN the server processes the create request
- THEN the persisted transaction record contains `currency = "EUR"` and a non-null, non-zero `rateToUsd` decimal value
- AND the raw `amount` field stores the original `150` in EUR, not a converted value

#### Scenario: Rate field is set at entry time and never overwritten

- GIVEN a transaction was created on day 1 with `currency = "JPY"` and `rateToUsd = 0.0067`
- WHEN the display currency is changed on day 2 after the JPY/USD rate has moved
- THEN the stored `rateToUsd` on that transaction remains `0.0067`
- AND all derived amounts use the stored rate, not the current market rate

---

### Requirement: Rate Fetch on Transaction Creation (FR-FX-02, TC-FX-01)

When a new transaction is submitted, the application fetches the current USD rate for the transaction's currency from frankfurter.app. The fetch occurs inside a Route Handler (`app/api/`). The fetched rate is stored with the transaction record. If the fetch fails for any reason, the transaction is not persisted and the user sees an inline error on the form.

#### Scenario: Successful rate fetch stores the rate and saves the transaction

- GIVEN frankfurter.app is reachable
- AND the user submits a transaction with `currency = "GBP"`
- WHEN the Route Handler calls `GET https://api.frankfurter.app/latest?base=GBP&symbols=USD`
- THEN the response `rates.USD` value is stored as `rateToUsd` on the new transaction record
- AND the API response returns HTTP 201 with the full transaction including `rateToUsd`

#### Scenario: Network failure during rate fetch blocks transaction creation

- GIVEN frankfurter.app returns a network error or a non-2xx response
- WHEN the Route Handler attempts to fetch the rate for the transaction currency
- THEN the transaction is NOT written to the database
- AND the API response returns an error status (4xx or 5xx) with a message referencing the rate-fetch failure
- AND the transaction form displays the error message inline without a full-page reload

#### Scenario: Rate fetch never originates from the client bundle (TC-FX-01)

- GIVEN the client-side JavaScript bundle is inspected
- WHEN all outbound network requests during a transaction submission are traced
- THEN no request to `frankfurter.app` originates from the browser; all such calls come from the server-side Route Handler
- AND the frankfurter.app URL does not appear in any client component or page component file

---

### Requirement: Unknown Currency Rejected Before Fetch (FR-FX-02)

The transaction form validates that the currency field contains a recognised ISO 4217 code before any network call is made. An unrecognised code produces a form validation error; no fetch to frankfurter.app is attempted.

#### Scenario: Unrecognised currency code triggers inline validation error

- GIVEN the user types `"XYZ"` into the currency field and submits the form
- WHEN client-side validation runs (before the form is submitted to the server)
- THEN an inline error appears beneath the currency field explaining that the code is not a valid ISO 4217 currency
- AND no request is sent to the `/api/` Route Handler or to frankfurter.app

#### Scenario: Valid ISO 4217 code passes validation and proceeds to fetch

- GIVEN the user selects `"SEK"` from the searchable currency list
- WHEN the form is submitted
- THEN no validation error appears for the currency field
- AND the Route Handler proceeds to fetch the SEK/USD rate from frankfurter.app

---

### Requirement: Session-Scoped In-Memory Rate Cache (FR-FX-03)

Within a single browser session, each unique currency code's rate is fetched from frankfurter.app at most once. Subsequent requests for the same currency reuse the cached value. The cache is in-memory on the server and is scoped to the session; it does not survive server restarts or new sessions.

#### Scenario: Second transaction in the same currency reuses the cached rate

- GIVEN a transaction with `currency = "CAD"` was already created in the current session, resulting in one call to frankfurter.app
- WHEN the user creates a second transaction also with `currency = "CAD"`
- THEN no additional network call is made to frankfurter.app for CAD
- AND the stored `rateToUsd` on the second transaction equals the cached value from the first call

#### Scenario: Different currency code triggers a new fetch

- GIVEN the in-memory cache already holds a rate for `"CAD"`
- WHEN the user creates a transaction with `currency = "AUD"`
- THEN exactly one new call is made to frankfurter.app to fetch the AUD/USD rate
- AND the cache is updated to include the AUD rate for the remainder of the session

#### Scenario: Cache does not persist across server restarts

- GIVEN the server process has restarted (clearing the in-memory cache)
- WHEN the first transaction with `currency = "CAD"` is submitted after restart
- THEN a fresh call to frankfurter.app is made to obtain the current rate
- AND the response is stored in the refreshed cache

---

### Requirement: Display-Currency Re-Derivation Without DB Re-Fetch (FR-FX-04)

When the user changes the display currency via the top-bar selector, all monetary totals, budget-limit progress bars, and chart amounts are re-derived from the already-loaded transaction data and their stored `rateToUsd` values. No additional database queries or frankfurter.app calls are triggered by this interaction.

#### Scenario: Switching display currency re-derives all totals immediately

- GIVEN the dashboard is loaded with display currency `"USD"` and a set of transactions in mixed currencies
- WHEN the user selects `"EUR"` from the display-currency selector
- THEN all visible amount totals update to reflect the EUR equivalent
- AND no additional requests are made to the database
- AND no additional requests are made to frankfurter.app

#### Scenario: Budget progress bars update on currency switch without DB call

- GIVEN a category has a monthly limit of 500 USD and month-to-date spend of 300 USD
- WHEN the user switches the display currency to `"GBP"`
- THEN the progress bar label and fill reflect the GBP-equivalent spend and limit
- AND the progress bar colour threshold logic (green / yellow / red) is evaluated against the re-derived GBP amounts
- AND no database query is issued during the switch

#### Scenario: Chart amounts are re-derived on currency switch

- GIVEN the donut and bar charts are rendered with amounts in `"USD"`
- WHEN the user changes the display currency to `"JPY"`
- THEN all chart segment amounts and tooltip values reflect JPY equivalents derived from stored `rateToUsd` values
- AND the charts update without a page reload

---

### Requirement: Pure convertAmount Function (FR-FX-05, TC-PURE-01)

`convertAmount(amount, fromCurrency, toCurrency, rates): number` in `lib/fx/convert.ts` is a pure function: deterministic, side-effect-free, no network calls, no framework imports. It accepts a rates object (currency code → rate-to-USD), performs the two-step USD-pivot conversion, and returns a number.

#### Scenario: Convert between two non-USD currencies using stored rates

- GIVEN `amount = 100`, `fromCurrency = "EUR"`, `toCurrency = "GBP"`, and `rates = { EUR: 1.08, GBP: 1.27 }` (each rate is the value of 1 unit in USD)
- WHEN `convertAmount(100, "EUR", "GBP", rates)` is called
- THEN the function returns `(100 * 1.08) / 1.27` ≈ `85.04` (within floating-point tolerance)
- AND no network call is made
- AND no side effects are produced

#### Scenario: Convert from a currency to itself returns the amount unchanged

- GIVEN `amount = 250`, `fromCurrency = "USD"`, `toCurrency = "USD"`, and any rates object
- WHEN `convertAmount(250, "USD", "USD", rates)` is called
- THEN the function returns exactly `250` without inspecting the rates object or making any external call

#### Scenario: Missing rate for fromCurrency throws a typed error

- GIVEN `amount = 50`, `fromCurrency = "CHF"`, `toCurrency = "USD"`, and `rates = {}` (CHF absent)
- WHEN `convertAmount(50, "CHF", "USD", rates)` is called
- THEN the function throws a typed error (not a raw `Error("...")`) with a message identifying the missing currency
- AND the return value is never `NaN` or `undefined`

#### Scenario: Zero rate for toCurrency throws a typed error

- GIVEN `amount = 100`, `fromCurrency = "USD"`, `toCurrency = "JPY"`, and `rates = { USD: 1, JPY: 0 }`
- WHEN `convertAmount(100, "USD", "JPY", rates)` is called
- THEN the function throws a typed error indicating a zero or invalid rate for JPY
- AND the return value is never `Infinity` or `NaN`

#### Scenario: Function has no framework or DOM imports (TC-PURE-01)

- GIVEN `lib/fx/convert.ts` is inspected statically
- WHEN its import list is enumerated
- THEN no import from `next/*`, `react`, or any DOM global is present
- AND the function can be exercised in a Vitest unit test without a Next.js or browser environment

---

### Requirement: Console Silence on Healthy FX Flow (NFR-OBS-01)

No console warnings or errors are emitted during normal FX operations — rate fetch, cache hit, display-currency switch, and amount conversion — in a healthy session.

#### Scenario: Successful rate fetch emits no console output

- GIVEN frankfurter.app responds normally with a valid rate
- WHEN a transaction is created and the rate is stored
- THEN the browser console contains no warnings or errors related to FX operations
- AND the server-side log contains no unhandled-rejection or error entries for this request

#### Scenario: Display-currency switch emits no console output

- GIVEN the dashboard is rendered with valid transaction data
- WHEN the user changes the display currency
- THEN no React key warnings, hydration mismatches, or unhandled errors appear in the browser console

---

### Requirement: FX UI Strings Centralised in i18n Module (NFR-I18N-01)

All user-visible strings related to FX — form field labels, validation messages, error messages for rate-fetch failures, and the frankfurter.app attribution text — are defined in `lib/i18n/en.ts`. No FX-related string literals appear directly in component files.

#### Scenario: Rate-fetch error message comes from the i18n module

- GIVEN `lib/i18n/en.ts` contains a key such as `fx.rateFetchError`
- WHEN the transaction form displays a rate-fetch failure to the user
- THEN the displayed text matches the value of that key exactly
- AND no raw string literal describing the rate-fetch error appears in any component or Route Handler file outside `lib/i18n/en.ts`

#### Scenario: Currency field label and placeholder come from the i18n module

- GIVEN the transaction form is rendered
- WHEN the currency input field is inspected
- THEN its label text and placeholder are sourced from `lib/i18n/en.ts`
- AND no hard-coded English string for the currency label appears in the component file

---

### Requirement: Rate Fetch Does Not Block Dashboard TTFB (NFR-PERF-01)

The frankfurter.app rate fetch only occurs during transaction creation, which is a user-initiated mutation. It never occurs during the initial load of the dashboard page. The dashboard TTFB remains at or below 300 ms p95 on Vercel Preview regardless of frankfurter.app availability.

#### Scenario: Dashboard load makes no call to frankfurter.app

- GIVEN the user navigates to the dashboard page
- WHEN the server renders the page and returns the response
- THEN no outbound request to `frankfurter.app` is made during this server render
- AND the response is returned within 300 ms p95 under normal Vercel Preview load

#### Scenario: frankfurter.app outage does not degrade dashboard load

- GIVEN frankfurter.app is unreachable or returning errors
- WHEN the user loads the dashboard page
- THEN the page loads successfully with all previously stored transaction data displayed
- AND the TTFB is unaffected by the external API state

---

### Requirement: frankfurter.app Attribution in Footer (BC-BRAND-02)

The application footer includes a visible hyperlink crediting frankfurter.app as the exchange rate source. The link text and URL must be accurate and the element must be keyboard-accessible.

#### Scenario: Footer displays a hyperlink to frankfurter.app

- GIVEN any page in the application is rendered
- WHEN the footer is inspected
- THEN it contains an `<a>` element with `href` pointing to `https://www.frankfurter.app` (or the canonical root URL)
- AND the visible link text references frankfurter.app by name
- AND the element is reachable via keyboard Tab navigation

---

## Exclusions

The following are intentionally out of scope for this capability and must not be reported as bugs or gaps:

- **Live rate streaming**: rates are fetched once per currency per session at transaction creation time; no WebSocket or polling mechanism exists.
- **Historical rates for past transactions**: the rate stored at entry time is the only rate ever associated with a transaction; the app does not back-fill or update rates to reflect what the rate "actually was" on the transaction date.
- **Multi-leg conversions**: `convertAmount` performs a two-step USD-pivot only; direct cross-rate tables or triangulated multi-hop conversions are not supported.
- **Offline or persistent rate caching**: the in-memory session cache is lost on server restart or new session; no localStorage, database, or Redis cache is maintained for rates.
- **Rate refresh on edit**: editing an existing transaction does not re-fetch or update the stored `rateToUsd`; the original rate is preserved.
