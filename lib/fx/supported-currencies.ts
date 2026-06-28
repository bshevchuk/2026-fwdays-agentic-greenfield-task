// @trace FR-FX-01, FR-FX-02
// Single source of truth for the supported display currencies.
// Imported by both the Route Handler (validation) and the CurrencyContext (UI).

export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'SEK', 'NOK', 'PLN',
  'DKK', 'CZK', 'HUF', 'RON', 'BGN', 'CNY', 'HKD', 'SGD', 'KRW', 'INR',
  'BRL', 'MXN', 'ZAR', 'TRY', 'ILS', 'AED', 'THB', 'MYR', 'RUB', 'HRK',
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
