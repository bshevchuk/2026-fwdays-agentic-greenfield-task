# ADR-0001: Technology Stack

- **Status:** Accepted
- **Date:** 2026-06-28
- **Deciders:** orchestrator + user

## Context

The product is a privacy-first, no-account personal finance web app (see `docs/product-brief.md`). Requirements specify (TC-STACK-01–04, TC-REPO-01–03, TC-API-01, TC-DEPLOY-01, TC-FX-01):
- Next.js App Router with TypeScript strict (TC-STACK-01)
- Tailwind CSS 4 + shadcn/ui + class-variance-authority (TC-STACK-02)
- Recharts for charts (TC-STACK-03)
- Vitest for unit tests; no Playwright in MVP (TC-STACK-04)
- SQLite via repository interface, no ORM calls outside the adapter (TC-REPO-01/02)
- Route Handlers for all DB mutations (TC-API-01)
- Vercel deployment (TC-DEPLOY-01)
- frankfurter.app FX rates via Route Handler (TC-FX-01)
- No auth, no email (no-account product per product brief)

## Decision

We will use **Next.js 15 App Router · TypeScript strict · Tailwind CSS 4 · shadcn/ui · Recharts · better-sqlite3 behind a typed repository interface · Vitest · Vercel**.

No Better Auth, no Resend, no Drizzle, no Playwright in MVP. These are explicitly excluded by requirements.

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| **This stack (chosen)** | Exactly matches TC-STACK-01–04 and TC-REPO-01–03; no auth overhead; Vitest-only keeps DX fast (NFR-DX-01) | SQLite on Vercel requires ephemeral /tmp (see ADR-0003) |
| Drizzle ORM | Type-safe migrations | Adds ORM abstraction layer on top of repository — contradicts TC-REPO-01 "no ORM calls outside adapter" |
| Playwright in MVP | Full E2E coverage | Explicitly excluded by TC-STACK-04 |
| Prisma | Good DX | Same as Drizzle; also overkill for a no-account app |

## Consequences

- Pure `lib/` functions are 100 % Vitest-testable with no DOM (TC-PURE-01).
- The repository interface makes a future Postgres adapter a single-file swap (TC-REPO-02).
- No E2E in MVP; integration coverage comes from Vitest with real SQLite.
- `lib/i18n/en.ts` owns all UI strings (NFR-I18N-01); no runtime i18n library.
