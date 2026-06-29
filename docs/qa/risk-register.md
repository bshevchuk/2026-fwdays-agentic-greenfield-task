# Risk Register — Budget Expense Tracker MVP

Date: 2026-06-29
Phase: G5 gate (post-Phase 5)

Likelihood scale: Low / Medium / High
Impact scale: Low / Medium / High / Critical

---

## R-01 — SQLite file lost on Vercel redeploy

| Field | Detail |
|---|---|
| Risk | The SQLite database file is written to the local filesystem. On Vercel, each new deployment or function cold-start gets a fresh ephemeral filesystem unless a persistent volume (Vercel Storage or a mounted path) is configured. A redeploy without a configured persistent path wipes all user data. |
| Likelihood | High (Vercel's default behaviour erases /tmp between deployments) |
| Impact | Critical (complete data loss for the user) |
| Mitigation | Configure `DATABASE_PATH` to point at a Vercel Volume mount path before going to production. Document this in `docs/technical/operations-environments.md`. The migration runner is idempotent so the schema re-applies cleanly on a new volume. Alternatively, for the workshop/demo context the Vercel deployment is read-only demo data only — data loss is acceptable. |
| Owner | Deploying engineer |
| Status | Open — no persistent volume configured as of 2026-06-29. Acceptable for workshop demo; must be resolved before any production use. |

---

## R-02 — FX rate fetch fails (frankfurter.app outage)

| Field | Detail |
|---|---|
| Risk | `app/api/fx/rates/route.ts` fetches exchange rates from `api.frankfurter.app`. If the service is unreachable or returns an error, the Route Handler returns a 502 response. The `POST /api/transactions` handler surfaces this as a 502 to the client, which shows an inline error via `TX_FX_FETCH_FAILED`. Users cannot add transactions in foreign currencies during the outage. |
| Likelihood | Low (frankfurter.app has good uptime; the service is free and community-maintained) |
| Impact | Medium (USD transactions are unaffected because the USD-to-USD rate is 1.0 and may be hard-coded as a fallback; only foreign-currency adds are blocked) |
| Mitigation | In-session cache (`lib/fx/cache.ts`) means only the first transaction per currency per session hits the network; subsequent transactions in the same currency use the cached rate. Post-MVP: add a stale-while-revalidate pattern or a fallback rate store. |
| Owner | Engineering |
| Status | Accepted for MVP. The error message is user-visible and clear. |

---

## R-03 — rate_to_usd = 0 edge case (divide-by-zero in convertAmount)

| Field | Detail |
|---|---|
| Risk | `convertAmount` in `lib/fx/convert.ts` divides by the `toCurrency` rate. If a transaction were stored with `rate_to_usd = 0` (e.g. via a direct DB write or a future data-import path), `convertAmount` would throw `FxConversionError` rather than return `Infinity`, which is the correct defensive behaviour but would surface as an unhandled error in `BudgetDashboard` or `ChartsDashboard` if not caught. |
| Likelihood | Low (the `POST /api/transactions` Route Handler validates and rejects any zero rate returned from the FX API; direct DB writes are not user-accessible in MVP) |
| Impact | Medium (the dashboard widget fails to render; other widgets are unaffected because components are independent) |
| Mitigation | `convertAmount` throws `FxConversionError` rather than returning NaN or Infinity (tested in `lib/fx/convert.test.ts`). The dashboard components should catch this error and render an inline error state rather than crashing. Post-MVP: add a DB-level CHECK constraint `rate_to_usd > 0`. |
| Owner | Engineering |
| Status | Partially mitigated. The pure function is defensive; component-level error boundary is post-MVP. |

---

## R-04 — Concurrent writes on Vercel (SQLite WAL mode)

| Field | Detail |
|---|---|
| Risk | SQLite has a single-writer constraint. If two Vercel serverless function instances handle write requests simultaneously, the second write may block or fail with a SQLITE_BUSY error. |
| Likelihood | Low (Vercel hobby/pro function concurrency is typically low; single-user no-auth product means traffic is effectively serialised in practice) |
| Impact | Low (a 503 on rare concurrent write; user retries) |
| Mitigation | WAL (Write-Ahead Logging) mode is enabled in `lib/db/adapters/sqlite.ts` (`db.pragma('journal_mode = WAL')`). WAL allows concurrent readers and a single writer with minimal blocking. |
| Owner | Engineering |
| Status | Mitigated for MVP. WAL is enabled. |

---

## R-05 — Budget limit currency drift (limit stored as raw number, no currency tag)

| Field | Detail |
|---|---|
| Risk | `budget_limit` in the `categories` table is a `REAL` with no associated currency column. It is intended to be interpreted in the display currency at the time of entry. If the user sets a limit of 300 while the display currency is USD and later switches to EUR, the progress bar will compare EUR-denominated spend against a limit that was intended as USD. The limit value is not converted. |
| Likelihood | Medium (any user who switches display currency after setting a limit will see this) |
| Impact | Medium (progress bar shows misleading figures; no data corruption) |
| Mitigation | Acknowledged as an MVP limitation documented in `openspec/archive/add-budget-limits/design.md`. A tooltip or label should clarify the limit currency. Post-MVP: add a `budget_limit_currency` column and convert at display time. |
| Owner | Product |
| Status | Accepted for MVP. Known limitation; to be addressed in a post-MVP data model change. |

---

## R-06 — Recharts SSR (server-side rendering crash)

| Field | Detail |
|---|---|
| Risk | Recharts uses browser-only APIs (`window`, `document`). If rendered on the server, it throws a hydration error that crashes the page. |
| Likelihood | Low (mitigated by architecture decision) |
| Impact | High (entire dashboard page would crash if triggered) |
| Mitigation | All Recharts components are loaded via `next/dynamic({ ssr: false, loading: <ChartSkeleton /> })` in `components/charts/ChartsDashboard.tsx`. This defers rendering to the client. A same-footprint skeleton is shown during SSR and initial client load. The `npm run build` step validates that no Recharts symbols appear in the server bundle. |
| Owner | Engineering |
| Status | Mitigated. Build-time check in place. |

---

## R-07 — No authentication (by design, no-account product)

| Field | Detail |
|---|---|
| Risk | Any person who can reach the Vercel URL can read and modify all data. There is no user isolation, access control, or audit log. |
| Likelihood | N/A (this is a deliberate product decision, not an accidental gap) |
| Impact | Medium (acceptable for a personal finance tool used by one person; unacceptable for shared or multi-user use) |
| Mitigation | Documented as out-of-scope in `docs/requirements.md` (Out of scope section: "User accounts, authentication, or cloud sync"). The Vercel deployment URL should not be publicly shared during the MVP period. Post-MVP: add Next.js Auth or equivalent. |
| Owner | Product |
| Status | Accepted by design for MVP. |
