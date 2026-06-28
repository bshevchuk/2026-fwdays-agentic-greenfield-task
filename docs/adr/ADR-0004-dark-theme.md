# ADR-0004: Dark Theme — CSS Only, No Toggle

- **Status:** Accepted
- **Date:** 2026-06-28
- **Deciders:** orchestrator + user

## Context

NFR-A11Y-02 requires WCAG AA contrast in both light and dark themes. The MVP
out-of-scope list explicitly defers "Dark / light theme toggle". These two are
in tension: if there is no toggle, the dark theme still exists via the OS
`prefers-color-scheme` media query.

## Decision

We will implement dark mode via **CSS `prefers-color-scheme` media query** using
Tailwind CSS 4's `dark:` variant (`darkMode: 'media'`). No UI toggle in the MVP.
`check-a11y` will be run against both light and dark variants (headless, via
Playwright with `colorScheme: 'dark'`).

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| **CSS media query, no toggle (chosen)** | Satisfies NFR-A11Y-02; respects user OS preference; zero JS overhead | No in-app override; deferred to post-MVP |
| Light mode only | Simpler | Contradicts NFR-A11Y-02 explicitly |
| Toggle in MVP | Full user control | Explicitly deferred out of scope |

## Consequences

- Tailwind config uses `darkMode: 'media'` (the Tailwind 4 default).
- Every component uses `dark:` variants for backgrounds, text, and border colors.
- `check-a11y` runs axe twice: once with OS light, once with OS dark (Playwright `colorScheme`).
- Post-MVP toggle is a one-line Tailwind config change to `darkMode: 'class'` + a button.
