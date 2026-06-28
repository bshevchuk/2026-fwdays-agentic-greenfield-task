// @trace FR-TX-01, FR-TX-05
// Pure validation helpers — no next/* or react imports (TC-PURE-01).

import { SUPPORTED_CURRENCIES } from '@/lib/fx/supported-currencies';

/**
 * Validates a raw amount string from a form field.
 * Accepts decimal dot or decimal comma (e.g. "49,99" → 4999 cents).
 * Returns { ok: true, cents } on valid positive input; { ok: false } otherwise.
 */
export function validateAmount(raw: string): { ok: boolean; cents?: number } {
  const normalised = raw.trim().replace(',', '.');
  const n = parseFloat(normalised);
  if (isNaN(n) || n <= 0) return { ok: false };
  const cents = Math.round(n * 100);
  if (cents <= 0) return { ok: false };
  return { ok: true, cents };
}

/**
 * Returns true only when the value is in SUPPORTED_CURRENCIES (case-sensitive).
 */
export const validateCurrency = (c: string): boolean =>
  (SUPPORTED_CURRENCIES as readonly string[]).includes(c);

/**
 * Returns true for a valid YYYY-MM-DD calendar date.
 */
export const validateDate = (d: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return false;
  return dt.toISOString().startsWith(d);
};

/**
 * Returns true only for 'expense' or 'income'.
 */
export const validateType = (t: string): boolean =>
  t === 'expense' || t === 'income';

/**
 * Returns true when note is null/undefined (optional) or within 1000 chars.
 */
export const validateNote = (n: string | null | undefined): boolean =>
  n == null || n.length <= 1000;
