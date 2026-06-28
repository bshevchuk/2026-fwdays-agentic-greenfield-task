// @trace FR-FX-03
// Unit tests for the session-scoped in-memory rate cache.
// These tests are written RED-first: lib/fx/cache.ts does not exist yet.
// All cases must fail with "Cannot find module" until the implementation
// is in place.
//
// Isolation note: the cache module holds a module-level Map that persists
// across all tests within a file.  To avoid cross-contamination each test
// uses a distinct, globally-unique currency code so that a write in one
// test cannot be observed as a spurious read in another.

import { describe, it, expect } from 'vitest';
import { getCachedRate, setCachedRate } from '@/lib/fx/cache';

describe('getCachedRate / setCachedRate — FR-FX-03', () => {
  describe('cold cache', () => {
    it('getCachedRate returns undefined for a currency that was never set (USD_COLD)', () => {
      // No prior call has touched USD_COLD — must return undefined.
      expect(getCachedRate('USD_COLD')).toBeUndefined();
    });

    it('getCachedRate returns undefined for any unseen currency (AUD_COLD)', () => {
      expect(getCachedRate('AUD_COLD')).toBeUndefined();
    });
  });

  describe('set then get', () => {
    it('getCachedRate returns the value after setCachedRate (GBP_SET)', () => {
      setCachedRate('GBP_SET', 1.27);
      expect(getCachedRate('GBP_SET')).toBe(1.27);
    });

    it('setting one currency does not affect another (EUR_ISOLATION / CAD_ISOLATION)', () => {
      // Set EUR_ISOLATION; CAD_ISOLATION must remain absent.
      setCachedRate('EUR_ISOLATION', 1.08);
      expect(getCachedRate('CAD_ISOLATION')).toBeUndefined();
    });

    it('getCachedRate returns the exact numeric value that was set', () => {
      setCachedRate('JPY_EXACT', 0.0067);
      expect(getCachedRate('JPY_EXACT')).toBe(0.0067);
    });
  });

  describe('update existing entry', () => {
    it('a second setCachedRate call overwrites the previous value (CHF_UPDATE)', () => {
      setCachedRate('CHF_UPDATE', 1.0);
      setCachedRate('CHF_UPDATE', 1.05);
      expect(getCachedRate('CHF_UPDATE')).toBe(1.05);
    });

    it('after update the old value is no longer returned (CHF_OLD)', () => {
      setCachedRate('CHF_OLD', 0.9);
      setCachedRate('CHF_OLD', 0.95);
      const result = getCachedRate('CHF_OLD');
      expect(result).not.toBe(0.9);
      expect(result).toBe(0.95);
    });
  });

  describe('independence between currency slots', () => {
    it('writing NZD_A does not change SEK_B which was never written', () => {
      setCachedRate('NZD_A', 0.6);
      expect(getCachedRate('SEK_B')).toBeUndefined();
    });

    it('two distinct currencies hold their own values independently', () => {
      setCachedRate('DKK_X', 6.9);
      setCachedRate('NOK_X', 10.5);
      expect(getCachedRate('DKK_X')).toBe(6.9);
      expect(getCachedRate('NOK_X')).toBe(10.5);
    });
  });
});
