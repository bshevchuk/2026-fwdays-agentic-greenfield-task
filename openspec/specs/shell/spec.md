# Shell Specification

## Purpose

The shell capability defines the application's outermost chrome: the persistent top bar, the responsive content grid, and the empty state shown to first-time users. It provides the structural container into which all other capabilities (transactions, categories, budget limits, charts) render their UI. Accessibility, runtime silence, and string centralisation NFRs travel with the shell because its chrome is present on every page load.

## Requirements

### Requirement: Top Bar (FR-SHELL-01)

The application must render a persistent top bar containing the app name and a display-currency selector. The theme toggle is intentionally absent in MVP; dark mode is handled exclusively by a CSS `prefers-color-scheme` media query (ADR-0004).

#### Scenario: Top bar is visible on page load

- GIVEN a user opens the dashboard URL in a browser
- WHEN the page finishes loading
- THEN a top bar is rendered at the top of the viewport
- AND the top bar contains the application name as visible text
- AND the top bar contains a display-currency selector control
- AND no theme toggle button or switch is present anywhere on the page

#### Scenario: Display-currency selector changes the active currency

- GIVEN the top bar is displayed with the display-currency selector showing "USD"
- WHEN the user opens the selector and chooses "EUR"
- THEN the selector label updates to "EUR"
- AND all monetary totals, progress bars, and chart amounts across the dashboard re-derive to EUR without a full-page reload
- AND the chosen currency persists for the remainder of the session

#### Scenario: Top bar remains visible during scroll

- GIVEN the dashboard contains enough content to require scrolling
- WHEN the user scrolls down the page
- THEN the top bar remains fixed or sticky at the top of the viewport and does not scroll out of view

### Requirement: Responsive Layout (FR-SHELL-02)

The main content area must adapt at the 768 px and 1280 px breakpoints: single-column on mobile, two-column on tablet, three-column on desktop. Layout is achieved via Tailwind CSS responsive utilities with no JavaScript breakpoint detection.

#### Scenario: Single-column layout below the mobile breakpoint

- GIVEN a browser viewport width of 767 px (one pixel below the tablet breakpoint)
- WHEN the dashboard page is displayed
- THEN the main content area renders all widgets stacked in a single column
- AND no widget is placed side-by-side with another widget

#### Scenario: Two-column layout at the tablet breakpoint

- GIVEN a browser viewport width of 768 px (at the tablet breakpoint)
- WHEN the dashboard page is displayed
- THEN the main content area switches to a two-column grid
- AND at least two widgets are rendered side by side

#### Scenario: Three-column layout at the desktop breakpoint

- GIVEN a browser viewport width of 1280 px (at the desktop breakpoint)
- WHEN the dashboard page is displayed
- THEN the main content area switches to a three-column grid
- AND at least three widgets are rendered side by side

#### Scenario: Layout uses only CSS — no JavaScript breakpoint logic

- GIVEN the application source is inspected
- WHEN searching all TypeScript and TSX files for window.innerWidth, matchMedia, or resize event listeners used for layout switching
- THEN no such code is found; breakpoints are implemented exclusively with Tailwind responsive prefixes (md: and xl:)

### Requirement: Empty State on First Load (FR-SHELL-03)

When the application has no transactions, the main content area must display a centred empty-state prompt with an "Add your first transaction" button, replacing the normal dashboard widgets.

#### Scenario: Empty state is displayed when no transactions exist

- GIVEN the application database contains zero transactions
- WHEN a user loads the dashboard page
- THEN the main content area shows prompt copy explaining that no transactions have been added
- AND a button labeled exactly "Add your first transaction" is visible and centred in the main content area
- AND the transaction list, budget progress bars, and charts are not rendered

#### Scenario: "Add your first transaction" button opens the transaction form

- GIVEN the empty state is displayed
- WHEN the user clicks the "Add your first transaction" button
- THEN the transaction creation modal or form opens
- AND the user can proceed to add a transaction

#### Scenario: Empty state is replaced after the first transaction is added

- GIVEN the empty state is displayed
- WHEN the user adds a transaction via the form and the form is submitted successfully
- THEN the empty state prompt and button are no longer visible
- AND the dashboard widgets (transaction list, charts, budget progress) render with the newly added transaction's data

### Requirement: Accessibility — Lighthouse Score and Interactive Element Standards (NFR-A11Y-01)

All interactive elements in the shell chrome must carry visible focus styles and accessible names. A Lighthouse accessibility audit of the dashboard must score 95 or higher.

#### Scenario: Lighthouse accessibility score meets threshold

- GIVEN the application is deployed and accessible via a URL
- WHEN a Lighthouse accessibility audit is run against the dashboard page in both mobile and desktop modes
- THEN the accessibility score is 95 or higher in both modes

#### Scenario: Display-currency selector has an accessible name

- GIVEN the top bar is rendered
- WHEN the display-currency selector is inspected with an accessibility tree tool (e.g. browser DevTools accessibility panel or axe-core)
- THEN the selector has a non-empty accessible name (aria-label, aria-labelledby, or a visible associated label)
- AND the selector is reachable and operable via keyboard alone

#### Scenario: All interactive elements show visible focus styles

- GIVEN the dashboard is displayed
- WHEN a user navigates through all interactive elements using the Tab key only
- THEN each focused element (buttons, selectors, links) shows a visible focus ring or highlight that meets WCAG AA focus-visible requirements
- AND no interactive element loses its focus indicator entirely

### Requirement: WCAG AA Contrast in Light and Dark Modes (NFR-A11Y-02)

The color palette must meet WCAG AA contrast ratios in both light mode (default) and dark mode (applied automatically via `prefers-color-scheme: dark`, with no JavaScript toggle). Dark mode is CSS-only per ADR-0004.

#### Scenario: Light mode contrast ratios meet WCAG AA

- GIVEN the operating system or browser has no dark mode preference (prefers-color-scheme: light or unset)
- WHEN the dashboard is displayed and the color palette is audited with a WCAG AA contrast checker
- THEN all normal-sized text elements achieve a contrast ratio of at least 4.5:1 against their background
- AND all large-sized text and UI component boundaries achieve at least 3:1

#### Scenario: Dark mode activates automatically via CSS media query

- GIVEN the operating system or browser is configured to dark mode (prefers-color-scheme: dark)
- WHEN the dashboard is loaded without any user interaction
- THEN dark-mode styles are applied automatically through the CSS `prefers-color-scheme: dark` media query
- AND no JavaScript code, no cookie, and no toggle interaction is required to activate dark mode

#### Scenario: Dark mode contrast ratios meet WCAG AA

- GIVEN prefers-color-scheme: dark is active and dark-mode styles are applied
- WHEN the dashboard color palette is audited with a WCAG AA contrast checker
- THEN all normal-sized text elements achieve a contrast ratio of at least 4.5:1 against their dark background
- AND all large-sized text and UI component boundaries achieve at least 3:1

### Requirement: Silent Console on a Healthy Session (NFR-OBS-01)

No console warnings or errors may be emitted during normal user interaction with the shell or any capability rendered within it.

#### Scenario: Console is clean during a healthy dashboard session

- GIVEN the browser console is open and the application is loaded
- WHEN the user performs typical interactions: page load, scrolling, changing the display currency, opening and closing the transaction modal
- THEN zero console errors appear
- AND zero console warnings appear
- AND React hydration mismatch warnings are absent

#### Scenario: Console is clean when empty state is shown

- GIVEN the database contains no transactions
- WHEN the dashboard loads and renders the empty state
- THEN zero console errors or warnings are emitted during the page load and rendering cycle

### Requirement: Centralised UI Strings (NFR-I18N-01)

All user-visible strings rendered by the shell (app name, currency selector label, empty-state copy, button labels) must be sourced from `lib/i18n/en.ts`. No UI string literal may be hardcoded inside a React component file.

#### Scenario: Shell strings are imported from lib/i18n/en.ts

- GIVEN the source files for the top bar, layout container, and empty-state component are inspected
- WHEN all string values rendered to the DOM are traced to their definition site
- THEN every user-visible string originates from an export in `lib/i18n/en.ts`
- AND no component file contains an inline string literal used as visible UI text (button labels, headings, prompt copy, aria-labels)

#### Scenario: Changing a string in en.ts propagates to the rendered UI

- GIVEN the empty-state button label is defined in `lib/i18n/en.ts` as the string "Add your first transaction"
- WHEN that string in `en.ts` is updated to a different value and the app is rebuilt
- THEN the button on the dashboard reflects the updated string with no changes required to the component file

## Exclusions

The following items are explicitly out of scope for this capability and for MVP. Testers must not raise issues against these as bugs.

- **Theme toggle control**: No button, switch, or user-facing control for switching between light and dark mode is provided. Dark mode is applied automatically via the CSS `prefers-color-scheme: dark` media query only (ADR-0004). A manual toggle is deferred to post-MVP.
- **Navigation sidebar or drawer**: The shell uses a top bar only. No side navigation, hamburger menu, or drawer component is part of this capability.
- **Authentication shell states**: No login page, auth-redirect logic, or user-profile area in the top bar. The application has no user accounts in MVP.
- **Internationalisation beyond English**: `lib/i18n/en.ts` is the sole locale file. No locale switching, RTL support, or translated string files are provided.
- **Server-side breakpoint detection**: Responsive layout is CSS-only. No user-agent sniffing or server-rendered layout variants exist.
- **Footer content**: Attribution of frankfurter.app (BC-BRAND-02) is owned by the `fx` capability, not the shell.
