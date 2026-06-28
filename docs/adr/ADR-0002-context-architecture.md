# ADR-0002: Context Architecture (Static vs Dynamic)

- **Status:** Accepted
- **Date:** 2026-06-28
- **Deciders:** orchestrator + user

## Context

Every agent turn pays for static context. Over-stuffing `AGENTS.md` with
per-domain details inflates every turn's cost without benefit. The static/dynamic
boundary is an architectural decision with direct TCO impact.

## Decision

**Static layer (≤ 4k tokens, paid every turn):** `CLAUDE.md → @AGENTS.md`.
`AGENTS.md` contains only durable cross-cutting rules: module conventions,
correctness rules, validation cadence, test-first discipline, and the handoff
protocol.

**Dynamic layer (loaded on demand):** per-domain code + specs under
`openspec/specs/<domain>/`, skills vendored under `.agents/skills/`, framework
bundled docs at `node_modules/next/dist/docs/`, QA pack under `docs/qa/`,
and `docs/current-state.md` (read at session start, not embedded).

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| **Static/dynamic split (chosen)** | Lean static = cheap turns; detail available on demand | Requires discipline to demote content when AGENTS.md grows |
| Embed everything in AGENTS.md | One file, always loaded | Context window bloat; inflated cost on every turn |

## Consequences

- Static budget is 4k tokens. When `AGENTS.md` exceeds this, move detail to a skill or domain doc — never silently raise the budget.
- Any change to this boundary (promote/demote) must be recorded in a new ADR.
- Current static size: ~2k tokens (initial).
