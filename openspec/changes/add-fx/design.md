# Change Design: add-fx

## Goals

1. Deliver `convertAmount` as a zero-dependency pure function (TC-PURE-01, FR-FX-05).
2. Server-only rate fetch (TC-FX-01) — frankfurter.app URL must never appear in client bundle.
3. Session-scoped in-memory cache (FR-FX-03) — one fetch per currency per server process lifetime.
4. Wire TopBar `<select>` to propagate display currency to all consumers via React Context.
5. Footer attribution to frankfurter.app (BC-BRAND-02).

## Non-Goals

- Persisting the selected display currency across sessions (URL param or cookie) — deferred.
- Real-time rate streaming — rates are point-in-time at transaction creation.
- `add-transactions` does not yet exist; this slice only delivers the infrastructure.

---

## Key Decisions

### KD-1: USD-pivot conversion

`convertAmount(amount, fromCurrency, toCurrency, rates)`:
```
if fromCurrency === toCurrency: return amount
usdAmount = amount * rates[fromCurrency]
return usdAmount / rates[toCurrency]
```
`rates[X]` = "1 unit of X costs rates[X] USD" (frankfurter.app `?base=X&symbols=USD` format).

Throws `FxConversionError` when `rates[fromCurrency]` is undefined (missing rate) or
`rates[toCurrency]` is 0 or undefined (would produce Infinity/NaN).

**Why typed error, not raw throw:** The caller (service layer) catches typed errors and
returns structured `{ ok: false, code: 'FX_ERROR' }` results; catching `Error` would
require string-matching on `message` which is fragile.

### KD-2: Why `convertAmount` takes a rates MAP not the cache

If `convertAmount` called `getCachedRate()` internally, it would have a side effect
(cache read) and could only be tested by mocking the module. By accepting a plain
`Record<string, number>` argument the function is purely functional: same inputs
always produce same outputs, testable with no setup, no mocking, no module state.

### KD-3: Rate fetch is server-only (TC-FX-01)

`lib/fx/fetcher.ts` imports `node:fetch` (available in Node.js 18+ and Next.js 16's
server runtime). It must never be imported by a Client Component. The Route Handler
at `app/api/fx/rates/route.ts` is the only caller. Verification: searching the client
bundle for `frankfurter` should return zero matches.

### KD-4: Session cache as module-level Map

```ts
// lib/fx/cache.ts
const _cache = new Map<string, number>();
export const getCachedRate = (c: string) => _cache.get(c);
export const setCachedRate = (c: string, r: number) => { _cache.set(c, r); };
```

Module-level singletons in Node.js persist for the server process lifetime. On
Vercel, each function invocation may be a fresh process, so the cache is cold-started
frequently — but that is intentional (FR-FX-03: "does not survive server restarts").

### KD-5: CurrencyContext avoids prop-drilling through Server Components

Next.js Server Components cannot receive Context values — Context is a Client-only
primitive. The architecture:

```
app/layout.tsx (Server Component)
  └── <CurrencyProvider>  ← 'use client' wrapper; holds useState for displayCurrency
        └── <TopBar />    ← 'use client'; onChange updates context
        └── {children}    ← Server Components can be children of a Client Provider
```

Children that are Server Components (like `app/page.tsx`) cannot READ the context
directly. They will receive display-currency-dependent data through a different path
(add-transactions and add-charts will use client-side re-fetching or URL params).
For the FX slice, the context is only needed by the TopBar itself and future client
components.

### KD-6: Footer attribution

`components/Footer.tsx` (Server Component):
```tsx
<footer>
  <a href={en.FOOTER_ATTRIBUTION_URL} rel="noopener noreferrer" target="_blank">
    {en.FOOTER_ATTRIBUTION}
  </a>
</footer>
```
`rel="noopener noreferrer"` prevents the opened tab from accessing `window.opener`
(security) and prevents the Referer header from leaking (privacy, BC-PRIVACY-01).

---

## Module Map

```
lib/fx/
  convert.ts         pure convertAmount function
  errors.ts          FxConversionError, FxFetchError
  fetcher.ts         fetchRateToUsd (server-only)
  cache.ts           module-level session cache
  currency-context.tsx  CurrencyContext + CurrencyProvider (client)

app/api/fx/
  rates/route.ts     GET /api/fx/rates?currency=XXX

components/
  Footer.tsx         attribution link
  TopBar.tsx         updated to 'use client'; wires select onChange

app/layout.tsx       wraps with CurrencyProvider, adds Footer
```

---

## Supported Currencies (initial list)

USD, EUR, GBP, JPY, CAD, AUD, CHF, SEK, NOK, PLN, DKK, CZK, HUF, RON, BGN,
HRK, RUB, CNY, HKD, SGD, KRW, INR, BRL, MXN, ZAR, TRY, ILS, AED, THB, MYR

(30 currencies — enough for an international audience; expandable in add-transactions)

---

## Error Handling

- `fetchRateToUsd` throws `FxFetchError` on non-2xx or network failure
- Route Handler catches and returns 502 `{ error: en.FX_RATE_FETCH_ERROR }`
- Unknown currency code in query → 422 `{ error: "Unknown currency code" }`
- `convertAmount` throws `FxConversionError`; callers catch and return structured error
