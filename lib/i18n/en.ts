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

  // --- FX ---
  FX_RATE_FETCH_ERROR: 'Could not fetch exchange rate. Please try again.',
  CURRENCY_FIELD_LABEL: 'Currency',
  FOOTER_ATTRIBUTION: 'Exchange rates by frankfurter.app',
  FOOTER_ATTRIBUTION_URL: 'https://www.frankfurter.app',

  // --- Transactions ---
  // Form titles
  TX_ADD_TITLE: 'Add transaction',
  TX_EDIT_TITLE: 'Edit transaction',

  // Form labels
  TX_FORM_AMOUNT: 'Amount',
  TX_FORM_CURRENCY: 'Currency',
  TX_FORM_DATE: 'Date',
  TX_FORM_CATEGORY: 'Category',
  TX_FORM_TYPE: 'Type',
  TX_FORM_NOTE: 'Note (optional)',

  // Buttons
  TX_ADD_BUTTON: 'Add transaction',
  TX_SAVE: 'Save',
  TX_CANCEL: 'Cancel',
  TX_DELETE: 'Delete',

  // Type labels
  TX_TYPE_EXPENSE: 'Expense',
  TX_TYPE_INCOME: 'Income',

  // Filter labels
  TX_FILTER_MONTH: 'Month',
  TX_FILTER_CATEGORY: 'Category',
  TX_FILTER_TYPE: 'Type',
  TX_FILTER_ALL_CATEGORIES: 'All categories',
  TX_FILTER_ALL_TYPES: 'All types',

  // Delete confirmation
  TX_DELETE_CONFIRM: 'Delete this transaction? This cannot be undone.',
  TX_DELETE_CONFIRM_YES: 'Delete',
  TX_DELETE_CONFIRM_NO: 'Cancel',

  // Empty states
  TX_EMPTY_FILTER: 'No transactions for this period.',

  // Validation errors
  TX_AMOUNT_REQUIRED: 'Amount is required',
  TX_AMOUNT_NOT_NUMBER: 'Amount must be a number',
  TX_AMOUNT_NOT_POSITIVE: 'Amount must be greater than zero',
  TX_CURRENCY_REQUIRED: 'Currency is required',
  TX_CURRENCY_INVALID: 'Currency must be a supported ISO 4217 code',
  TX_DATE_REQUIRED: 'Date is required',
  TX_DATE_INVALID: 'Date must be a valid date (YYYY-MM-DD)',
  TX_CATEGORY_REQUIRED: 'Category is required',
  TX_TYPE_INVALID: 'Type must be expense or income',
  TX_NOTE_TOO_LONG: 'Note must be 1000 characters or fewer',
  TX_NOT_FOUND: 'Transaction not found',
  TX_SERVER_ERROR: 'A server error occurred. Please try again.',
  TX_FX_FETCH_FAILED: 'Could not fetch exchange rate. Please try again.',

  // --- Charts ---
  CHART_DONUT_TITLE: 'Spending by Category',
  CHART_BAR_TITLE: 'Income vs Expenses (12 months)',
  CHART_DONUT_EMPTY: 'No spending data for this month',
  CHART_INCOME_LABEL: 'Income',
  CHART_EXPENSE_LABEL: 'Expenses',
  CHART_MONTH_SELECTOR_LABEL: 'Select month',
  CHART_TOOLTIP_AMOUNT: 'Amount',

  // --- Budget limits ---
  BUDGET_LIMIT_LABEL: 'Monthly budget limit',
  BUDGET_LIMIT_PLACEHOLDER: 'e.g. 500',
  BUDGET_LIMIT_INVALID: 'Budget limit must be a positive number',
  BUDGET_STATUS_OK: 'On track',
  BUDGET_STATUS_WARNING: 'Approaching limit',
  BUDGET_STATUS_OVER: 'Over budget',
  BUDGET_SPEND_LABEL: 'Spent this month',
  BUDGET_OF_LIMIT: 'of',
  BUDGET_NO_LIMIT: 'No limit set',
  BUDGET_DASHBOARD_TITLE: 'Budget Overview',

  // --- Generic UI ---
  LOADING: 'Loading...',
  CATEGORIES_EMPTY: 'No categories yet.',
  TX_CURRENCY_NO_RESULTS: 'No results',
} as const;
