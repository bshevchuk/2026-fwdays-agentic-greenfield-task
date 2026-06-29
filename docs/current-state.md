# Current State

> Persistent handoff file for future agent windows. Verify with OpenSpec, tests,
> and the repo — this is a map, not the source of truth.

## Last Updated

- **Date and time:** 2026-06-29 13:15 (Europe/Kyiv)
- **Current phase:** Phase 7 — Global review + deploy (complete)
- **Active change:** none — global-review archived
- **Progress:** G0–G7 complete. All 6 feature slices + global review delivered and archived.
  205 tests passing (14 suites). Lint + build green.
  Slices archived: add-shell, add-categories, add-fx, add-transactions,
  add-budget-limits, add-charts, global-review (all under `openspec/archive/`).
- **Next task:** Vercel deploy — set DATABASE_PATH=/tmp/budget.db env var, push to production.

## Known Issues

**SEC-005 (low, accepted risk):** No rate limiting on `/api/fx/rates`. Mitigated by process-level
cache. Acceptable for MVP with no auth; revisit with Vercel Edge middleware post-MVP.

**Finding 4 (minor, accepted risk):** `budget_limit` stored as SQLite REAL (float) instead of
integer cents. Changing to cents requires a migration and service refactor; deferred to post-MVP
as the precision difference is negligible for user-entered budget limits.

**Finding 5 (low confidence, accepted risk):** Migration 002 `ALTER TABLE` statements are not
idempotent if the `_migrations` tracking table is manually cleared. Documented constraint;
do not truncate `_migrations` in production.

## Security Review Summary (2026-06-29)

Severity | Count
---------|------
High     | 0
Medium   | 0 (SEC-001 fixed)
Low      | 2 remaining (SEC-005, SEC-006 PostCSS advisory — no runtime risk)

All SEC-001 through SEC-004 confirmed findings fixed in commit `ece020a`.

## Code Review Summary (2026-06-29)

Severity | Count
---------|------
Major    | 0 (Finding 1 + 2 fixed)
Minor    | 2 remaining (Finding 4 budget_limit REAL, Finding 5 migration idempotency)

All other major and minor findings fixed in commit `ece020a`.

## Source Of Truth

1. `AGENTS.md` — project agent rules.
2. `docs/current-state.md` — this handoff.
3. `docs/requirements.md` — canonical FR/NFR/TC/BC requirements.
4. `docs/product-brief.md` — product narrative.
5. `docs/mvp-capability-plan.md` — change sequence and scope.
6. `openspec/project.md` + `openspec/specs/` — accepted behavior.
7. `docs/adr/` — architecture decisions (ADR-0001 through ADR-0004 accepted).
8. `docs/qa/` — QA proof pack (Phase 6).
9. `openspec/archive/global-review/review-findings.json` — security review evidence.
10. `docs/qa/code-review-findings.md` — code quality review evidence.

## OpenSpec Status

All changes archived. No active changes.

## Vercel Deploy Configuration

```
DATABASE_PATH=/tmp/budget.db
NODE_ENV=production
```

Build command: `npm run build`  
Output: `.next`  
Install command: `npm install`

Note: SQLite at `/tmp/budget.db` on Vercel is ephemeral (resets on cold start). Acceptable
for MVP demo; persistent storage requires a volume or external DB in production.

## Completed Changes

- **global-review** — 2026-06-29 13:15 UTC+3 (Europe/Kyiv)
  - Security review: 0 high, 1 medium (fixed), 5 low (2 fixed, 2 accepted, 1 advisory)
  - Code review: 2 major (fixed), 6 minor (4 fixed, 2 accepted)
  - Commit: `ece020a` — fix(security+code): apply all confirmed review findings before deploy

- **add-charts** — 2026-06-29 (committed previously)
- **add-budget-limits** — 2026-06-29 (committed previously)
- **add-transactions** — 2026-06-28 23:00 UTC+3 (Europe/Kyiv)
- **add-categories** — 2026-06-28 21:40 UTC+3 (Europe/Kyiv)
- **add-fx** — 2026-06-28 (committed previously)
- **add-shell** — 2026-06-28 (committed previously)
