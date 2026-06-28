// @trace BC-BRAND-02
// frankfurter.app attribution required by BC-BRAND-02.

import { en } from '@/lib/i18n/en';

export function Footer() {
  return (
    <footer className="border-t py-4 text-center text-sm text-muted-foreground">
      <a
        href={en.FOOTER_ATTRIBUTION_URL}
        rel="noopener noreferrer"
        target="_blank"
        className="underline hover:text-foreground transition-colors"
      >
        {en.FOOTER_ATTRIBUTION}
      </a>
    </footer>
  );
}
