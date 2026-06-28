// @trace FR-SHELL-01, FR-SHELL-03, NFR-I18N-01
// Single source of truth for all user-visible strings in the shell.
// No inline string literals in component files — all strings originate here.

export const en = {
  APP_NAME: 'Budget Tracker',
  META_DESCRIPTION: 'Track your personal budget',
  CURRENCY_PLACEHOLDER: 'USD',
  CURRENCY_SELECTOR_LABEL: 'Display currency',
  EMPTY_STATE_HEADING: 'No transactions yet',
  EMPTY_STATE_BODY: 'Start tracking your spending by adding your first transaction.',
  EMPTY_STATE_CTA: 'Add your first transaction',
  TOP_BAR_NAV_LABEL: 'Main navigation',
} as const;
