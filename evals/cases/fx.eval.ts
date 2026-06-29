// @trace FR-FX-01, FR-FX-05

/**
 * Eval cases for FX conversion quality.
 *
 * Dimension: correctness
 * These cases grade qualitative properties of `convertAmount` that unit tests
 * express as booleans but that an eval judge can reason about holistically:
 * correct pass-through, correct USD-pivot math, and proper error taxonomy.
 *
 * All produce() calls are pure function invocations — no HTTP needed.
 */

import { EvalCase } from './shell.eval';
import { convertAmount } from '../../lib/fx/convert';

export const cases: EvalCase[] = [
  {
    id: 'eval-fx-convert-same-currency',
    trace: ['FR-FX-01', 'FR-FX-05'],
    dimension: 'correctness',
    capability: 'fx',
    scenario:
      'convertAmount is called with identical fromCurrency and toCurrency (USD→USD). ' +
      'The function must return the original amount without touching the rate table.',
    produce: async () => {
      const result = convertAmount(100, 'USD', 'USD', { USD: 1 });
      return String(result);
    },
    rubric: [
      'CRITICAL: result is exactly 100 — same-currency must be a zero-loss pass-through',
      'CRITICAL: result is a number, not NaN or Infinity',
      'no rounding or floating-point drift is introduced by the same-currency path',
    ],
  },
  {
    id: 'eval-fx-convert-usd-pivot',
    trace: ['FR-FX-01', 'FR-FX-05'],
    dimension: 'correctness',
    capability: 'fx',
    scenario:
      'convertAmount converts 100 EUR to GBP using a USD-pivot table where ' +
      'EUR=1.1 and GBP=0.85 (both relative to USD). Expected: 100 * 1.1 / 0.85 ≈ 129.41.',
    produce: async () => {
      const result = convertAmount(100, 'EUR', 'GBP', { EUR: 1.1, GBP: 0.85 });
      return (Math.round(result * 100) / 100).toFixed(2);
    },
    rubric: [
      'CRITICAL: result is 129.41 (100 × 1.1 ÷ 0.85 rounded to 2 decimal places)',
      'CRITICAL: result is not 0, NaN, or Infinity',
      'the USD-pivot formula (amount × fromRate ÷ toRate) is applied correctly',
      'rounding to 2dp does not materially distort the value',
    ],
  },
  {
    id: 'eval-fx-error-missing-rate',
    trace: ['FR-FX-01', 'FR-FX-05'],
    dimension: 'correctness',
    capability: 'fx',
    scenario:
      'convertAmount is called with an unknown currency code XYZ not present in ' +
      'the rate table. The function must throw a domain-specific FxConversionError, ' +
      'not a generic Error, so callers can handle FX failures distinctly.',
    produce: async () => {
      try {
        convertAmount(100, 'XYZ', 'USD', { USD: 1 });
        return 'no error thrown';
      } catch (e) {
        return (e as Error).constructor.name;
      }
    },
    rubric: [
      'CRITICAL: produce() returns "FxConversionError" — the domain-specific error class',
      'CRITICAL: produce() must NOT return "Error" (generic) or "no error thrown"',
      'the error class name confirms callers can catch FxConversionError specifically',
    ],
  },
];
