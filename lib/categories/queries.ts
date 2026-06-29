// @trace FR-CAT-01, FR-CAT-02, FR-CAT-03, FR-CAT-04
// Pure SQL query strings — no DB calls in this module.

export const SQL_LIST_CATEGORIES =
  'SELECT id, name, icon, color, budget_limit FROM categories ORDER BY name';

export const SQL_GET_CATEGORY =
  'SELECT id, name, icon, color, budget_limit FROM categories WHERE id = ?';

export const SQL_CREATE_CATEGORY =
  'INSERT INTO categories (name, icon, color) VALUES (?, ?, ?)';

export const SQL_GET_CATEGORY_BY_ID =
  'SELECT id, name, icon, color, budget_limit FROM categories WHERE id = ?';

export const SQL_DELETE_CATEGORY = 'DELETE FROM categories WHERE id = ?';

export const SQL_COUNT_TRANSACTIONS_BY_CATEGORY =
  'SELECT COUNT(*) AS n FROM transactions WHERE category_id = ?';

/**
 * Builds a dynamic UPDATE statement from the provided field keys.
 * Only keys in the allowlist ('name', 'icon', 'color') are included.
 * Returns null when no valid fields are supplied.
 */
export function buildUpdateQuery(fields: Record<string, unknown>): string | null {
  const ALLOWED = ['name', 'icon', 'color', 'budget_limit'] as const;
  const setClauses = ALLOWED.filter((k) => k in fields).map((k) => `${k} = ?`);
  if (setClauses.length === 0) return null;
  return `UPDATE categories SET ${setClauses.join(', ')} WHERE id = ?`;
}

/**
 * Extracts the ordered parameter list matching buildUpdateQuery's field order.
 * Must be called with the same fields object to guarantee alignment.
 */
export function buildUpdateParams(
  id: number,
  fields: Record<string, unknown>,
): unknown[] {
  const ALLOWED = ['name', 'icon', 'color', 'budget_limit'] as const;
  const values = ALLOWED.filter((k) => k in fields).map((k) => fields[k]);
  return [...values, id];
}
