// @trace FR-FX-05
// TC-PURE-01: no next/*, react, or DOM imports — pure function only.

import { FxConversionError } from './errors';

/**
 * Convert `amount` from `fromCurrency` to `toCurrency` using a USD-pivot table.
 *
 * rates[ISO] = "how many USD is 1 unit of that currency worth"
 * e.g. { EUR: 1.08 } means 1 EUR = 1.08 USD.
 *
 * Formula: result = amount * rates[from] / rates[to]
 *
 * Throws FxConversionError when:
 *  - rates[fromCurrency] is undefined (missing rate)
 *  - rates[toCurrency] is undefined or 0 (would produce Infinity/NaN)
 */
export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>,
): number {
  if (fromCurrency === toCurrency) return amount;

  const fromRate = rates[fromCurrency];
  if (fromRate === undefined || fromRate === 0) {
    throw new FxConversionError(
      `Missing or zero rate for ${fromCurrency}`,
      fromCurrency,
    );
  }

  const toRate = rates[toCurrency];
  if (toRate === undefined || toRate === 0) {
    throw new FxConversionError(
      `Missing or zero rate for ${toCurrency}`,
      toCurrency,
    );
  }

  return (amount * fromRate) / toRate;
}
