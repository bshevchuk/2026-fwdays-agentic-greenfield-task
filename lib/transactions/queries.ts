// @trace FR-TX-01, FR-TX-02, FR-TX-03, FR-TX-04, FR-TX-06, FR-TX-07
// Pure SQL query strings and builders — no DB calls in this module.

const COLUMNS =
  'id, amount_cents, currency, rate_to_usd, date, category_id, type, note, created_at';

export const SQL_GET_TRANSACTION = `SELECT ${COLUMNS} FROM transactions WHERE id = ?`;

export const SQL_CREATE_TRANSACTION =
  'INSERT INTO transactions (amount_cents, currency, rate_to_usd, date, category_id, type, note) VALUES (?, ?, ?, ?, ?, ?, ?)';

export const SQL_DELETE_TRANSACTION = 'DELETE FROM transactions WHERE id = ?';

/**
 * Builds a WHERE clause and parameter list from optional filter fields.
 */
function buildWhereClause(filters: {
  month?: string;
  category_id?: number;
  type?: string;
}): { whereClause: string; params: (string | number)[] } {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.month) {
    conditions.push(`date LIKE ?`);
    params.push(`${filters.month}-%`);
  }
  if (filters.category_id !== undefined) {
    conditions.push(`category_id = ?`);
    params.push(filters.category_id);
  }
  if (filters.type) {
    conditions.push(`type = ?`);
    params.push(filters.type);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, params };
}

/**
 * Returns the full paginated list query and its parameters.
 */
export function buildListTransactionsQuery(filters: {
  month?: string;
  category_id?: number;
  type?: string;
  page?: number;
}): { sql: string; params: (string | number)[] } {
  const { whereClause, params } = buildWhereClause(filters);
  const page = filters.page ?? 1;
  const offset = (page - 1) * 25;
  const sql = `SELECT ${COLUMNS} FROM transactions ${whereClause} ORDER BY date DESC, id DESC LIMIT 25 OFFSET ?`;
  return { sql, params: [...params, offset] };
}

/**
 * Returns the COUNT(*) query and its parameters for pagination totals.
 */
export function buildCountTransactionsQuery(filters: {
  month?: string;
  category_id?: number;
  type?: string;
}): { sql: string; params: (string | number)[] } {
  const { whereClause, params } = buildWhereClause(filters);
  const sql = `SELECT COUNT(*) AS n FROM transactions ${whereClause}`;
  return { sql, params };
}

/** Fields allowed to be updated; rate_to_usd and created_at are excluded (KD-4). */
const ALLOWED_UPDATE_FIELDS = [
  'amount_cents',
  'currency',
  'date',
  'category_id',
  'type',
  'note',
] as const;

/**
 * Builds a dynamic UPDATE statement from the supplied field keys.
 * Returns null if no valid fields are present.
 */
export function buildTransactionUpdateQuery(
  fields: Record<string, unknown>,
): string | null {
  const setClauses = ALLOWED_UPDATE_FIELDS.filter((k) => k in fields).map(
    (k) => `${k} = ?`,
  );
  if (setClauses.length === 0) return null;
  return `UPDATE transactions SET ${setClauses.join(', ')} WHERE id = ?`;
}

/**
 * Extracts ordered parameters matching buildTransactionUpdateQuery's field order.
 */
export function buildTransactionUpdateParams(
  id: number,
  fields: Record<string, unknown>,
): unknown[] {
  const values = ALLOWED_UPDATE_FIELDS.filter((k) => k in fields).map(
    (k) => fields[k],
  );
  return [...values, id];
}
