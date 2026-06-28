// @trace FR-TX-01, FR-TX-02, FR-TX-03, FR-TX-05
// Unit tests for pure validation helpers in the transactions module.
// All tests MUST FAIL (red) until lib/transactions/validation.ts is created —
// the module does not exist yet, so every import below will produce
// "Cannot find module '@/lib/transactions/validation'".

import { describe, it, expect } from 'vitest';
import {
  validateAmount,
  validateCurrency,
  validateDate,
  validateType,
  validateNote,
} from '@/lib/transactions/validation';

// ---------------------------------------------------------------------------
// validateAmount
// Accepts a raw string from the form field.
// Returns { ok: false } on invalid input; { ok: true, cents: number } on valid.
// Supports decimal comma as decimal separator (FR-TX-01 NFR: decimal comma).
// ---------------------------------------------------------------------------
describe('validateAmount', () => {
  it('returns { ok: false } for empty string', () => {
    expect(validateAmount('')).toMatchObject({ ok: false });
  });

  it('returns { ok: false } for non-numeric string "abc"', () => {
    expect(validateAmount('abc')).toMatchObject({ ok: false });
  });

  it('returns { ok: false } for negative amount "-10"', () => {
    expect(validateAmount('-10')).toMatchObject({ ok: false });
  });

  it('returns { ok: false } for zero "0" — amount must be greater than zero', () => {
    expect(validateAmount('0')).toMatchObject({ ok: false });
  });

  it('returns { ok: true, cents: 4999 } for "49.99"', () => {
    expect(validateAmount('49.99')).toMatchObject({ ok: true, cents: 4999 });
  });

  it('returns { ok: true, cents: 4999 } for "49,99" (decimal comma)', () => {
    // Regression guard: decimal comma must be treated as decimal separator
    expect(validateAmount('49,99')).toMatchObject({ ok: true, cents: 4999 });
  });

  it('returns { ok: true, cents: 10000 } for "100.00" (trailing zeros)', () => {
    expect(validateAmount('100.00')).toMatchObject({ ok: true, cents: 10000 });
  });

  it('returns { ok: true, cents: 150000 } for "1500" (whole-number, JPY-style)', () => {
    expect(validateAmount('1500')).toMatchObject({ ok: true, cents: 150000 });
  });
});

// ---------------------------------------------------------------------------
// validateCurrency
// Returns true only when the value is in SUPPORTED_CURRENCIES (case-sensitive).
// ---------------------------------------------------------------------------
describe('validateCurrency', () => {
  it('returns true for "USD"', () => {
    expect(validateCurrency('USD')).toBe(true);
  });

  it('returns true for "EUR"', () => {
    expect(validateCurrency('EUR')).toBe(true);
  });

  it('returns false for "XYZ" (not in SUPPORTED_CURRENCIES)', () => {
    expect(validateCurrency('XYZ')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(validateCurrency('')).toBe(false);
  });

  it('returns false for lowercase "usd" (match is case-sensitive)', () => {
    expect(validateCurrency('usd')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateDate
// Accepts ISO 8601 date strings (YYYY-MM-DD) only.
// Returns false for any string that is not a valid calendar date.
// ---------------------------------------------------------------------------
describe('validateDate', () => {
  it('returns true for a valid ISO date "2026-06-28"', () => {
    expect(validateDate('2026-06-28')).toBe(true);
  });

  it('returns false for "2026-13-01" (month 13 does not exist)', () => {
    expect(validateDate('2026-13-01')).toBe(false);
  });

  it('returns false for "not-a-date"', () => {
    expect(validateDate('not-a-date')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(validateDate('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateType
// Only 'expense' and 'income' are valid; anything else is rejected.
// ---------------------------------------------------------------------------
describe('validateType', () => {
  it('returns true for "expense"', () => {
    expect(validateType('expense')).toBe(true);
  });

  it('returns true for "income"', () => {
    expect(validateType('income')).toBe(true);
  });

  it('returns false for "other"', () => {
    expect(validateType('other')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(validateType('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateNote
// Note is optional: null/undefined/empty string are all valid.
// Maximum length is 1000 characters (enforced here, not at DB layer per spec).
// ---------------------------------------------------------------------------
describe('validateNote', () => {
  it('returns true for null (note is optional)', () => {
    expect(validateNote(null)).toBe(true);
  });

  it('returns true for empty string (empty note is allowed)', () => {
    expect(validateNote('')).toBe(true);
  });

  it('returns true for a typical short note', () => {
    expect(validateNote('Lunch with team')).toBe(true);
  });

  it('returns true for a note at exactly 1000 characters (upper boundary)', () => {
    expect(validateNote('a'.repeat(1000))).toBe(true);
  });

  it('returns false for a note of 1001 characters (max+1 boundary)', () => {
    expect(validateNote('a'.repeat(1001))).toBe(false);
  });
});
