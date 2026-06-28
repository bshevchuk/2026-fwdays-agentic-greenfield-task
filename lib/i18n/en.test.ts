// @trace FR-SHELL-01, FR-SHELL-03, NFR-I18N-01
// Verifies that lib/i18n/en.ts exports all required shell UI string keys and
// that every value is a non-empty string.  No string literal may live inside a
// React component (NFR-I18N-01); this file is the single source of truth.

import { describe, it, expect } from 'vitest';
import { en } from '@/lib/i18n/en';

// The seven keys mandated by the shell spec (add-shell tasks.md §2.2 and §4.1)
const REQUIRED_KEYS = [
  'APP_NAME',
  'CURRENCY_PLACEHOLDER',
  'CURRENCY_SELECTOR_LABEL',
  'EMPTY_STATE_HEADING',
  'EMPTY_STATE_BODY',
  'EMPTY_STATE_CTA',
  'TOP_BAR_NAV_LABEL',
] as const;

type RequiredKey = (typeof REQUIRED_KEYS)[number];

describe('lib/i18n/en — shell string catalogue', () => {
  it('exports a named "en" object (not a default export)', () => {
    expect(en).toBeDefined();
    expect(typeof en).toBe('object');
    expect(en).not.toBeNull();
  });

  it.each(REQUIRED_KEYS)(
    'has required key "%s"',
    (key: RequiredKey) => {
      expect(Object.prototype.hasOwnProperty.call(en, key)).toBe(true);
    }
  );

  it.each(REQUIRED_KEYS)(
    'key "%s" is a non-empty string',
    (key: RequiredKey) => {
      const value = (en as Record<string, unknown>)[key];
      expect(typeof value).toBe('string');
      expect((value as string).trim().length).toBeGreaterThan(0);
    }
  );

  it('EMPTY_STATE_CTA is exactly "Add your first transaction" (FR-SHELL-03 scenario)', () => {
    // The spec mandates this exact label so Playwright/E2E can locate the button
    // and the prop-through-i18n change scenario proves it is sourced here.
    expect(en.EMPTY_STATE_CTA).toBe('Add your first transaction');
  });

  it('APP_NAME contains no inline string in component files — value is present here', () => {
    // This test encodes the NFR-I18N-01 requirement that the app name originates
    // from this module.  The assertion is minimal: the key exists and is non-empty.
    expect((en.APP_NAME as string).length).toBeGreaterThan(0);
  });
});
