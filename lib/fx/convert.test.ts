// @trace FR-FX-05
// Unit tests for convertAmount() pure function and FxConversionError.
// These tests are written RED-first: lib/fx/convert.ts and lib/fx/errors.ts
// do not exist yet.  All cases must fail with "Cannot find module" until
// the implementation is in place.

import { describe, it, expect } from 'vitest';
import { convertAmount } from '@/lib/fx/convert';
import { FxConversionError } from '@/lib/fx/errors';

// rates map convention: rates[ISO] = how many USD 1 unit of that currency is worth.
// e.g. { EUR: 1.08 } means 1 EUR = 1.08 USD.
// The USD-pivot formula: result = amount * rates[from] / rates[to]

describe('convertAmount — FR-FX-05', () => {
  describe('same-currency shortcut', () => {
    it('returns the original amount unchanged when from === to', () => {
      // No rate lookup should occur at all — an empty rates map is fine.
      const result = convertAmount(250, 'USD', 'USD', {});
      expect(result).toBe(250);
    });

    it('same-currency shortcut works for non-USD currencies too', () => {
      // Even with an empty rates map this must not throw.
      const result = convertAmount(99.99, 'EUR', 'EUR', {});
      expect(result).toBe(99.99);
    });
  });

  describe('USD-pivot conversion', () => {
    // rates: 1 EUR = 1.08 USD, 1 GBP = 1.27 USD
    // 100 EUR → USD = 108; 108 USD → GBP = 108 / 1.27 ≈ 85.039…
    const rates = { EUR: 1.08, GBP: 1.27 };

    it('converts 100 EUR → GBP ≈ 85.04 (within 2 decimal places)', () => {
      const result = convertAmount(100, 'EUR', 'GBP', rates);
      expect(result).toBeCloseTo(85.04, 2);
    });

    it('result is never NaN for a valid conversion', () => {
      const result = convertAmount(100, 'EUR', 'GBP', rates);
      expect(Number.isNaN(result)).toBe(false);
    });

    it('result is never Infinity for a valid conversion', () => {
      const result = convertAmount(100, 'EUR', 'GBP', rates);
      expect(Number.isFinite(result)).toBe(true);
    });
  });

  describe('error: missing fromCurrency rate', () => {
    it('throws FxConversionError when fromCurrency is absent from rates map', () => {
      // CHF is not in the empty rates map.
      expect(() => convertAmount(50, 'CHF', 'USD', {})).toThrow(FxConversionError);
    });

    it('thrown FxConversionError carries the offending currency code on .currency', () => {
      let err: unknown;
      try {
        convertAmount(50, 'CHF', 'USD', {});
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(FxConversionError);
      expect((err as FxConversionError).currency).toBe('CHF');
    });

    it('thrown error has a meaningful message string', () => {
      let err: unknown;
      try {
        convertAmount(50, 'CHF', 'USD', {});
      } catch (e) {
        err = e;
      }
      expect((err as Error).message.length).toBeGreaterThan(0);
    });
  });

  describe('error: zero toCurrency rate', () => {
    // A zero rate would produce Infinity (division by zero) — must throw instead.
    it('throws FxConversionError when toCurrency rate is 0', () => {
      expect(() =>
        convertAmount(100, 'USD', 'JPY', { USD: 1, JPY: 0 })
      ).toThrow(FxConversionError);
    });

    it('FxConversionError.currency is the toCurrency when its rate is zero', () => {
      let err: unknown;
      try {
        convertAmount(100, 'USD', 'JPY', { USD: 1, JPY: 0 });
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(FxConversionError);
      expect((err as FxConversionError).currency).toBe('JPY');
    });

    it('does not produce Infinity or NaN — throws before the division completes', () => {
      // Confirm that the function never silently returns a bad numeric value.
      let result: number | undefined;
      try {
        result = convertAmount(100, 'USD', 'JPY', { USD: 1, JPY: 0 });
      } catch {
        // expected — do nothing
      }
      // result should remain undefined (never assigned) because the throw fired
      expect(result).toBeUndefined();
    });
  });

  describe('FxConversionError shape', () => {
    it('is an instance of Error (extends Error)', () => {
      let err: unknown;
      try {
        convertAmount(1, 'MISSING', 'USD', {});
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(Error);
    });

    it('has a .currency string property on the thrown object', () => {
      let err: unknown;
      try {
        convertAmount(1, 'MISSING', 'USD', {});
      } catch (e) {
        err = e;
      }
      expect(typeof (err as FxConversionError).currency).toBe('string');
    });
  });
});
