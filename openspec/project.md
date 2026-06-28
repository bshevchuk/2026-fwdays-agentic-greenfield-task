# OpenSpec — Project Index

## Project: Budget Expense Tracker

A privacy-first, no-account personal finance web app. See `docs/product-brief.md`
for the business narrative and `docs/requirements.md` for all numbered requirements.

## Capabilities

| Capability | Spec | MVP FRs owned |
|---|---|---|
| [shell](specs/shell/spec.md) | Baseline | FR-SHELL-01, FR-SHELL-02, FR-SHELL-03 |
| [transactions](specs/transactions/spec.md) | Baseline | FR-TX-01 – FR-TX-07 |
| [categories](specs/categories/spec.md) | Baseline | FR-CAT-01 – FR-CAT-04 |
| [budget-limits](specs/budget-limits/spec.md) | Baseline | FR-BUDGET-01 – FR-BUDGET-05 |
| [charts](specs/charts/spec.md) | Baseline | FR-CHART-01 – FR-CHART-05 |
| [fx](specs/fx/spec.md) | Baseline | FR-FX-01 – FR-FX-05 |

**Total: 29 MVP FRs across 6 capabilities. No gaps, no duplicates.**

## Cross-cutting NFRs (honored by every capability)

- NFR-A11Y-01 — Lighthouse Accessibility ≥ 95 (owned by shell, enforced everywhere)
- NFR-A11Y-02 — WCAG AA in light + dark (CSS prefers-color-scheme, ADR-0004)
- NFR-OBS-01 — Console clean at runtime
- NFR-I18N-01 — All UI strings in `lib/i18n/en.ts`
- NFR-PERF-01 — TTFB ≤ 300ms (owned by transactions + fx)
- NFR-PERF-02 — Lighthouse Performance ≥ 90 (global)
- NFR-PERF-03 — Client JS ≤ 200KB gzipped (owned by charts)
- NFR-DX-01 — Full build + test < 60s

## Conventions

- Spec files: `openspec/specs/<capability>/spec.md`
- Active change folders: `openspec/changes/add-<capability>/`
  - Files: `proposal.md`, `design.md`, `tasks.md`
- Archive: `openspec/archive/` (after smoke test passes)
