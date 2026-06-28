import { en } from '@/lib/i18n/en';

export function TopBar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background dark:bg-background">
      <nav
        aria-label={en.TOP_BAR_NAV_LABEL}
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8"
      >
        <span className="text-lg font-semibold text-foreground">{en.APP_NAME}</span>
        <div className="flex items-center gap-2">
          <label htmlFor="display-currency" className="text-sm text-muted-foreground">
            {en.CURRENCY_SELECTOR_LABEL}
          </label>
          {/* Placeholder: add-fx slice will wire onChange and populate options */}
          <select
            id="display-currency"
            name="display-currency"
            defaultValue={en.CURRENCY_PLACEHOLDER}
            className="text-sm text-foreground bg-background border border-border rounded px-2 py-1 focus-visible:ring-2 focus-visible:ring-ring focus:outline-none"
          >
            <option value={en.CURRENCY_PLACEHOLDER}>{en.CURRENCY_PLACEHOLDER}</option>
          </select>
        </div>
      </nav>
    </header>
  );
}
