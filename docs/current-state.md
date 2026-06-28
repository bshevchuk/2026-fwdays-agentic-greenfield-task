# Current State

> Persistent handoff file for future agent windows. Verify with OpenSpec, tests,
> and the repo — this is a map, not the source of truth.

## Last Updated

- **Date and time:** 2026-06-28 21:40 (Europe/Kyiv)
- **Current phase:** Phase 4 — slice delivery
- **Active change:** add-categories (COMPLETE)
- **Progress:** G0 complete (scaffold + loop). G1 complete (requirements signed off).
  Next.js 16 / React 19 / Tailwind 4 / shadcn/ui / better-sqlite3 / Vitest scaffolded.
  ADRs 0001–0004 written. Lint + build green.
  add-categories slice implemented and all 46 new tests passing.
  `002_categories.sql` migration applied; 7 default categories seeded.
  Route Handlers `/api/categories` (GET, POST) and `/api/categories/[id]` (GET, PUT, DELETE) implemented.
  Settings page at `/settings` with CategoryList, CategoryForm, DeleteCategoryButton.
  Settings link added to TopBar.
- **Next task:** add-fx slice (slice 2b), then add-transactions (slice 3).

## Known Issues

Three pre-existing shell tests (from the add-shell slice) conflict with the add-categories spec
and will fail after 002_categories.sql is added. These are flagged for the next agent to fix:

1. `lib/db/migrate.test.ts` — "records exactly one row in _migrations after first run" (expects 1, gets 2)
2. `lib/db/migrate.test.ts` — "is idempotent — second call does not add a duplicate migration row" (expects 1, gets 2)
3. `lib/db/repository.test.ts` — "returns an empty array when no categories have been inserted" (expects 0, gets 7)

These tests were written for the shell when only 001_initial.sql existed. The add-categories
spec mandates 002_categories.sql which seeds 7 rows. The tests need their assertions updated
(e.g. `toBe(2)` and `toHaveLength(7)` respectively) to reflect the new baseline.

## Source Of Truth

1. `AGENTS.md` — project agent rules.
2. `docs/current-state.md` — this handoff.
3. `docs/requirements.md` — canonical FR/NFR/TC/BC requirements.
4. `docs/product-brief.md` — product narrative.
5. `docs/mvp-capability-plan.md` — change sequence and scope.
6. `openspec/project.md` + `openspec/specs/` — accepted behavior.
7. `docs/adr/` — architecture decisions (ADR-0001 through ADR-0004 accepted).
8. `docs/qa/` — QA proof pack and recordings (Phase 6).

## OpenSpec Status

- `openspec/changes/add-categories/` — implementation complete (tasks.md all ticked).

## Completed Changes

- **add-categories** — 2026-06-28 21:40 UTC+3 (Europe/Kyiv)
  - `lib/db/migrations/002_categories.sql`
  - `lib/categories/types.ts`, `validation.ts`, `queries.ts`, `service.ts`
  - `lib/db/repository.ts` extended; `lib/db/adapters/sqlite.ts` extended
  - `lib/i18n/en.ts` — all category strings added
  - `app/api/categories/route.ts`, `app/api/categories/[id]/route.ts`
  - `components/categories/CategoryList.tsx`, `CategoryForm.tsx`, `DeleteCategoryButton.tsx`
  - `app/settings/page.tsx`
  - `components/TopBar.tsx` — Settings link added
