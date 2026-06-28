'use client';
// @trace FR-SHELL-01, FR-FX-04

import Link from 'next/link';
import { en } from '@/lib/i18n/en';
import { useDisplayCurrency } from '@/lib/fx/currency-context';

export function TopBar() {
  const { displayCurrency, setDisplayCurrency, supportedCurrencies } =
    useDisplayCurrency();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background dark:bg-background">
      <nav
        aria-label={en.TOP_BAR_NAV_LABEL}
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8"
      >
        <span className="text-lg font-semibold text-foreground">{en.APP_NAME}</span>
        <div className="flex items-center gap-4">
          <Link
            href="/settings"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {en.TOP_BAR_SETTINGS}
          </Link>
          <label htmlFor="display-currency" className="text-sm text-muted-foreground">
            {en.CURRENCY_SELECTOR_LABEL}
          </label>
          <select
            id="display-currency"
            name="display-currency"
            value={displayCurrency}
            onChange={(e) => setDisplayCurrency(e.target.value)}
            className="text-sm text-foreground bg-background border border-border rounded px-2 py-1 focus-visible:ring-2 focus-visible:ring-ring focus:outline-none"
          >
            {supportedCurrencies.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </div>
      </nav>
    </header>
  );
}
