// @trace FR-SHELL-03, NFR-OBS-01

/**
 * Eval cases for the `shell` capability.
 *
 * Dimension: usability-clarity
 * These cases grade *qualitative* properties of the empty state that unit tests
 * cannot assert (CRITICAL criteria gate the case to ≤49 if unmet).
 *
 * The `produce` function is a placeholder: fill it in once the app is running
 * and you can drive the UI (e.g. with Playwright screenshot-to-text or an
 * HTTP fetch of the rendered HTML).
 */

export interface EvalCase {
  id: string;
  trace: string[];
  dimension: string;
  capability: string;
  scenario: string;
  produce: () => Promise<string>;
  rubric: string[];
}

export const cases: EvalCase[] = [
  {
    id: 'eval-shell-empty-state-clarity',
    trace: ['FR-SHELL-03', 'NFR-OBS-01'],
    dimension: 'usability-clarity',
    capability: 'shell',
    scenario:
      'User opens the app for the first time with no transactions. ' +
      'The empty state renders in the main content area.',
    produce: async () =>
      '/* placeholder — fill in when app is running; ' +
      'return the visible text or HTML of the empty state region */',
    rubric: [
      'CRITICAL: a clear, actionable prompt is visible (not a blank screen)',
      'CRITICAL: a button or link to add the first transaction is prominent and its label matches "Add your first transaction"',
      'copy is calm and practical — no exclamation marks (BC-BRAND-01)',
      'heading and button text are concise (under 10 words each)',
    ],
  },
  {
    id: 'eval-shell-empty-state-console-silence',
    trace: ['FR-SHELL-03', 'NFR-OBS-01'],
    dimension: 'usability-clarity',
    capability: 'shell',
    scenario:
      'The browser console is open while the empty state renders. ' +
      'No transactions exist in the database.',
    produce: async () =>
      '/* placeholder — return captured console output (errors + warnings) ' +
      'during page load of the empty-state dashboard */',
    rubric: [
      'CRITICAL: zero console errors are emitted during the page load',
      'CRITICAL: zero console warnings are emitted during the page load',
      'no React hydration mismatch warnings appear',
    ],
  },
];
