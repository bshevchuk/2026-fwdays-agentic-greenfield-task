# Change Proposal: add-fx

## Why

The FX capability enables users to record transactions in any currency and view all
amounts converted to a chosen display currency. Without it, the app is USD-only and
the TopBar's currency selector (a static `<select>` placeholder from add-shell) serves
no purpose. `add-transactions` (slice 3) depends on the `convertAmount` pure function
and the rate-fetch Route Handler existing before it can store `currency` and `rate_to_usd`
per transaction. This slice delivers those foundations.

This is safe to develop in parallel with `add-categories` (slice 2a): the FX slice
touches no DB schema, adds only `lib/fx/`, `app/api/fx/`, `components/Footer.tsx`, and
wires the TopBar selector via React Context — none of which overlap with categories.

## What Changes

### Pure function
- `lib/fx/convert.ts` — `convertAmount(amount, fromCurrency, toCurrency, rates)` pure,
  no side effects, no framework deps (TC-PURE-01)
- `lib/fx/errors.ts` — `FxConversionError` and `FxFetchError` typed errors

### Server-side rate infrastructure
- `lib/fx/fetcher.ts` — `fetchRateToUsd(currency)` hits `${FX_API_BASE_URL}/latest`
- `lib/fx/cache.ts` — module-level Map; cache per-session (clears on server restart)
- `app/api/fx/rates/route.ts` — GET `/api/fx/rates?currency=XXX`

### UI wiring
- `lib/fx/currency-context.tsx` — React Context + Provider for the selected display currency
- `components/TopBar.tsx` updated to a Client Component: wires `<select>` onChange to context
- `app/layout.tsx` wraps children in `CurrencyProvider`
- `components/Footer.tsx` — attribution link to frankfurter.app (BC-BRAND-02)

### i18n
- Keys added to `lib/i18n/en.ts`: `FX_RATE_FETCH_ERROR`, `CURRENCY_FIELD_LABEL`,
  `FOOTER_ATTRIBUTION`, `FOOTER_ATTRIBUTION_URL`

## Impact

- **Unlocks:** add-transactions (slice 3) — depends on `convertAmount` and the rate Route Handler
- **Parallel-safe with:** add-categories (slice 2a) — fully disjoint modules
- **Shell tests:** unaffected — no changes to `IRepository` or existing tests
- **Breaking changes:** TopBar becomes a Client Component; layout.tsx wraps with Provider
