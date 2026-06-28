// @trace FR-CAT-01, FR-CAT-02
// Unit tests for pure validation helpers in the categories module.
// All tests MUST FAIL (red) until lib/categories/validation.ts is implemented —
// the module does not exist yet, so the import below will produce "module not found".

import { describe, it, expect } from 'vitest';
import { validateName, validateColor, validateIcon } from '@/lib/categories/validation';

// ---------------------------------------------------------------------------
// validateName
// ---------------------------------------------------------------------------
describe('validateName', () => {
  it('returns false for an empty string', () => {
    expect(validateName('')).toBe(false);
  });

  it('returns false for a whitespace-only string', () => {
    expect(validateName('  ')).toBe(false);
  });

  it('returns true for a valid name', () => {
    expect(validateName('Food')).toBe(true);
  });

  it('returns false when name exceeds 50 characters (max+1 boundary)', () => {
    expect(validateName('x'.repeat(51))).toBe(false);
  });

  it('returns true for exactly 50 characters (upper boundary)', () => {
    expect(validateName('x'.repeat(50))).toBe(true);
  });

  it('returns true for a single non-whitespace character (lower boundary)', () => {
    expect(validateName('a')).toBe(true);
  });

  it('returns true for a name with leading/trailing spaces that trim to a valid value', () => {
    // Trimmed value is "Food" (4 chars) — still valid.
    expect(validateName('  Food  ')).toBe(true);
  });

  it('returns false for a string of spaces whose trimmed length is 0 but raw length is > 0', () => {
    // Distinct from empty string: raw length is 3, trimmed is 0.
    expect(validateName('   ')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateColor
// ---------------------------------------------------------------------------
describe('validateColor', () => {
  it('returns true for a valid lowercase 6-digit hex color', () => {
    expect(validateColor('#4ade80')).toBe(true);
  });

  it('returns false for a CSS named color', () => {
    expect(validateColor('red')).toBe(false);
  });

  it('returns false for a hex value missing the leading hash', () => {
    expect(validateColor('4ade80')).toBe(false);
  });

  it('returns false when hex digits contain characters outside 0-9 a-f A-F', () => {
    expect(validateColor('#gggggg')).toBe(false);
  });

  it('returns true for an uppercase hex color (case-insensitive)', () => {
    expect(validateColor('#4ADE80')).toBe(true);
  });

  it('returns false for a 3-digit CSS hex shorthand', () => {
    expect(validateColor('#4ae')).toBe(false);
  });

  it('returns false for a 7-digit hex (one digit over the limit)', () => {
    expect(validateColor('#4ade800')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(validateColor('')).toBe(false);
  });

  it('returns true for a mixed-case valid hex color', () => {
    expect(validateColor('#4AdE80')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateIcon
// ---------------------------------------------------------------------------
describe('validateIcon', () => {
  it('returns true for "utensils" — a known icon in the allowed set', () => {
    expect(validateIcon('utensils')).toBe(true);
  });

  it('returns false for a name not present in the allowed icon set', () => {
    expect(validateIcon('nonexistent-icon-xyz')).toBe(false);
  });

  it('returns true for "tag" — a known icon in the allowed set', () => {
    expect(validateIcon('tag')).toBe(true);
  });

  it('returns false for an empty string', () => {
    expect(validateIcon('')).toBe(false);
  });

  it('returns true for "car" — a known icon in the allowed set', () => {
    expect(validateIcon('car')).toBe(true);
  });

  it('returns true for "home" — a known icon in the allowed set', () => {
    expect(validateIcon('home')).toBe(true);
  });

  it('returns true for "shopping-cart" — a known icon in the allowed set', () => {
    expect(validateIcon('shopping-cart')).toBe(true);
  });

  it('returns true for "film" — a known icon in the allowed set', () => {
    expect(validateIcon('film')).toBe(true);
  });

  it('returns true for "heart-pulse" — a known icon in the allowed set', () => {
    expect(validateIcon('heart-pulse')).toBe(true);
  });

  it('returns true for "trending-up" — a known icon in the allowed set', () => {
    expect(validateIcon('trending-up')).toBe(true);
  });
});
