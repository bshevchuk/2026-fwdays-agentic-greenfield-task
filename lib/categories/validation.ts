// @trace FR-CAT-01, FR-CAT-02

export const ALLOWED_ICONS: readonly string[] = [
  'utensils',
  'car',
  'home',
  'heart-pulse',
  'film',
  'shopping-bag',
  'trending-up',
  'shopping-cart',
  'plane',
  'coffee',
  'book',
  'music',
  'gift',
  'briefcase',
  'smartphone',
  'tv',
  'dumbbell',
  'bike',
  'baby',
  'paw-print',
  'graduation-cap',
  'wrench',
  'zap',
  'umbrella',
  'star',
  'tag',
  'wallet',
  'piggy-bank',
  'receipt',
  'heart',
];

/**
 * Returns true when name is non-blank and at most 50 characters after trimming.
 */
export function validateName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= 50;
}

/**
 * Returns true when color is a valid 6-digit hex string prefixed with '#'.
 */
export function validateColor(color: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(color);
}

/**
 * Returns true when icon is a member of the ALLOWED_ICONS list.
 */
export function validateIcon(icon: string): boolean {
  return ALLOWED_ICONS.includes(icon);
}
