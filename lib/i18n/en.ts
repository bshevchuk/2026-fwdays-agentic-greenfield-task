// @trace FR-SHELL-01, FR-SHELL-03, NFR-I18N-01, FR-CAT-01, FR-CAT-02, FR-CAT-03, FR-CAT-04
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
  TOP_BAR_SETTINGS: 'Settings',

  // --- Categories ---
  CATEGORIES_PAGE_TITLE: 'Categories',
  CATEGORIES_ADD: 'Add category',
  CATEGORIES_SAVE: 'Save',
  CATEGORIES_CANCEL: 'Cancel',
  CATEGORIES_DELETE: 'Delete',
  CATEGORIES_FORM_NAME: 'Name',
  CATEGORIES_FORM_ICON: 'Icon',
  CATEGORIES_FORM_COLOR: 'Color',

  // Error messages
  CATEGORIES_NAME_REQUIRED: 'Name is required',
  CATEGORIES_COLOR_INVALID: 'Color must be a valid 6-digit hex code (e.g. #4ade80)',
  CATEGORIES_ICON_INVALID: 'Icon must be selected from the allowed set',
  CATEGORIES_NAME_DUPLICATE: 'A category with this name already exists',
  CATEGORIES_DELETE_HAS_TRANSACTIONS:
    'Cannot delete a category that has associated transactions',
  CATEGORIES_NOT_FOUND: 'Category not found',
} as const;
