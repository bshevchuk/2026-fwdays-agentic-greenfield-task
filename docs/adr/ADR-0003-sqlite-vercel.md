# ADR-0003: SQLite Persistence on Vercel

- **Status:** Accepted
- **Date:** 2026-06-28
- **Deciders:** orchestrator + user

## Context

TC-REPO-02 mandates SQLite as the default adapter. TC-DEPLOY-01 mandates Vercel
for hosting. Vercel's serverless functions have a writable `/tmp` directory, but
it is ephemeral: data is lost on cold starts and is not shared across function
instances. The product is a single-user workshop demo (BC-DEMO-01); persistence
across cold starts is not a hard requirement for the MVP.

## Decision

We will use `DATABASE_PATH` as an environment variable that:
- Defaults to `./budget.db` in local development (persistent).
- Is set to `/tmp/budget.db` on Vercel (ephemeral, acceptable for demo).

A `lib/db/migrate.ts` minimal migration runner applies schema migrations on app
startup (TC-REPO-03). On Vercel this means each cold start re-applies migrations
and starts with an empty DB.

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| **/tmp ephemeral (chosen)** | Zero extra services; simple; fine for demo | Data lost on cold starts on Vercel |
| Vercel Postgres adapter | Persistent; proper production storage | Extra cost; requires a second adapter implementation; contradicts MVP simplicity |
| Vercel KV | Persistent | Key-value does not fit relational schema naturally; more adapter work |

## Consequences

- Workshop demos on the live Vercel URL start with a clean DB each cold start — acceptable for BC-DEMO-01.
- Swapping to a persistent Postgres adapter requires only writing `lib/db/adapters/postgres.ts` implementing the same repository interface (TC-REPO-02).
- The migration runner must be idempotent (safe to re-run on every cold start).
