# Budget Expense Tracker — Agent Rules

# This may NOT be the Next.js you know

The installed version (Next.js 16 / React 19) may differ from training data.
Read the bundled docs in `node_modules/next/dist/docs/` before writing any code.
Heed deprecation notices — App Router patterns evolve fast.

Use `docs/requirements.md` as the numbered source of truth for what to build.

## Project Factory (works in any tool)

This project is delivered with **Project Factory**, a spec-driven multi-agent
framework. The deterministic loop — `scripts/check-*`, git hooks, CI, OpenSpec
specs, and the gates — is identical in every tool. See `docs/portability.md`.

## Project Handoff Protocol

Before any substantive change, read:

1. `docs/current-state.md` — latest handoff and exact next task.
2. `docs/mvp-capability-plan.md` — slice sequence and scope.
3. `openspec/project.md` + `openspec/specs/<capability>/` — specs for the slice.
4. `docs/adr/` — accepted architecture decisions.

Update `docs/current-state.md` at every meaningful milestone. Write date/time
(Europe/Kyiv) and current phase. It is a handoff aid — if it conflicts with
code/specs/tests, verify and update it; the code wins.

## Stack (accepted, see docs/adr/)

- **Next.js 16 App Router · TypeScript strict · React 19**
- **Tailwind CSS 4** (PostCSS plugin, `dark:` via `prefers-color-scheme`) · **shadcn/ui** · class-variance-authority
- **Recharts** for charts (client components only; SSR = same-footprint skeleton)
- **better-sqlite3** behind a typed repository interface (`lib/db/repository.ts`)
- **Vitest** for unit tests on `lib/`; no Playwright in MVP (TC-STACK-04)
- **Next.js Route Handlers** (`app/api/`) for all DB mutations (TC-API-01)
- **frankfurter.app** FX rates via Route Handler, never client bundle (TC-FX-01)
- **Vercel** deployment; SQLite at `DATABASE_PATH` (`/tmp/budget.db` on Vercel)
- No auth, no email (no-account product)

## Module conventions

- `lib/db/repository.ts` — typed repository interface (no ORM calls outside adapter)
- `lib/db/adapters/sqlite.ts` — better-sqlite3 adapter
- `lib/db/migrate.ts` — minimal migration runner (idempotent, runs on startup)
- `lib/<domain>/` — pure business logic: `validation.ts` (zod) · `queries.ts` · `service.ts` · pure helpers · colocated `*.test.ts`
- `lib/i18n/en.ts` — ALL UI strings centralised here; no runtime i18n library
- `lib/fx/convert.ts` — `convertAmount()` pure function
- `lib/budget/status.ts` — `budgetStatus()` pure function
- `app/api/` — Route Handlers for mutations
- `components/ui/` — shadcn/ui primitives; `components/` — composed app components
- Pages are thin Server Components; `"use client"` only when strictly needed

## Correctness rules

- Route Handlers and server code never throw raw on user input — catch, log,
  return a typed error response. Surface inline (`{ error: string }`), never 500.
- Numeric parsers accept trailing zeros and decimal commas.
- `convertAmount` and `budgetStatus` are pure: no side effects, fully testable.
- Migration runner is idempotent — safe to re-run on every cold start (Vercel).
- Seed/test helpers re-pin baseline state; day-bound assertions use LOCAL calendar dates.
- Validate the RENDERED result for UI: gate with axe (`check-a11y`, light+dark)
  AND `vision-verify` (fresh agent reads the settled still); recordings assert FRs.

## Test-first (per slice)

Write unit tests from the spec FIRST, confirm they FAIL (red), then implement to
green. Never weaken a test to pass it — flag the contradiction, don't edit silently.
Every test file carries `@trace FR-x` annotations.

## Validation cadence

```bash
npm run lint
npm run test:run
npm run build
npx openspec validate --all --strict
node scripts/check-eval-ratchet.mjs   # once evals exist
```

Keep `.env.local` private; never commit or print it.

## Evals (graded quality)

- Cases: `evals/cases/*.eval.ts` — scenario + `produce()` + rubric + `@trace`
- Graded by `eval-suite` workflow (fresh eval-judge, maker≠checker)
- Ratchet: `node scripts/check-eval-ratchet.mjs` — quality only goes up in CI

## Environment notes

- macOS (darwin), zsh
- Database: better-sqlite3 · path from `DATABASE_PATH` env var · no ORM
- No email service in MVP
