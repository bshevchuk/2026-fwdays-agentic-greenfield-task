# Tasks: add-fx

## 1. Types and errors

- [ ] 1.1 Create `lib/fx/errors.ts` — `FxConversionError extends Error` (with `currency: string`), `FxFetchError extends Error`

## 2. Tests — write RED first, before any implementation

- [ ] 2.1 Create `lib/fx/convert.test.ts` (`@trace FR-FX-05`):
  - Same-currency conversion returns amount unchanged
  - USD-pivot: 100 EUR → GBP with rates `{ EUR: 1.08, GBP: 1.27 }` ≈ 85.04
  - Missing fromCurrency rate → throws `FxConversionError`
  - Zero toCurrency rate → throws `FxConversionError`
  - Result is never NaN or Infinity
  - No import from `next/*` or `react` in the source file (static check)

- [ ] 2.2 Create `lib/fx/cache.test.ts` (`@trace FR-FX-03`):
  - `getCachedRate('USD')` → undefined on cold cache
  - After `setCachedRate('USD', 1)`: `getCachedRate('USD')` → 1
  - Different key ('EUR') still returns undefined after setting USD

## 3. Implementation

- [ ] 3.1 Create `lib/fx/convert.ts` — `convertAmount(amount, fromCurrency, toCurrency, rates): number`
- [ ] 3.2 Create `lib/fx/cache.ts` — module-level Map with `getCachedRate` / `setCachedRate`
- [ ] 3.3 Create `lib/fx/fetcher.ts` — `fetchRateToUsd(currency: string): Promise<number>`; uses `process.env.FX_API_BASE_URL`
- [ ] 3.4 Create `app/api/fx/rates/route.ts` — GET handler; checks cache, fetches if miss, returns `{ currency, rateToUsd }`; 422 on unknown currency, 502 on fetch failure
- [ ] 3.5 Create `lib/fx/currency-context.tsx` (`'use client'`) — `CurrencyContext`, `CurrencyProvider`, `useDisplayCurrency` hook
- [ ] 3.6 Update `components/TopBar.tsx` → add `'use client'`; wire `<select>` onChange to context; populate with 30-currency list
- [ ] 3.7 Update `app/layout.tsx` — wrap body content with `<CurrencyProvider>`; add `<Footer />`
- [ ] 3.8 Create `components/Footer.tsx` — attribution link to frankfurter.app with `rel="noopener noreferrer"`
- [ ] 3.9 Add FX i18n keys to `lib/i18n/en.ts`: `FX_RATE_FETCH_ERROR`, `CURRENCY_FIELD_LABEL`, `FOOTER_ATTRIBUTION`, `FOOTER_ATTRIBUTION_URL`
- [ ] 3.10 Update `.env.example` (already has `FX_API_BASE_URL=https://api.frankfurter.app` — verify it is there)

## 4. Quality checks

- [ ] 4.1 `npm run test:run` — all tests green (convert + cache + existing shell tests)
- [ ] 4.2 `npm run lint` — clean
- [ ] 4.3 `npm run build` — clean; verify frankfurter.app URL does NOT appear in `.next/static/`
- [ ] 4.4 `node scripts/check-traceability.mjs` — 0 failures
- [ ] 4.5 Smoke: GET /api/fx/rates?currency=EUR returns `{ currency: "EUR", rateToUsd: <number> }`
- [ ] 4.6 Smoke: GET /api/fx/rates?currency=INVALID returns 422
- [ ] 4.7 Verify display-currency `<select>` in TopBar has at least 10 options and is keyboard focusable

## 5. Archive

- [ ] 5.1 Update `docs/current-state.md` with slice completion timestamp
- [ ] 5.2 Move `openspec/changes/add-fx/` → `openspec/archive/add-fx/`
- [ ] 5.3 Commit: `feat(fx): add-fx slice` with `Slice: add-fx` and `Refs: FR-FX-01, FR-FX-02, FR-FX-03, FR-FX-04, FR-FX-05` trailers
