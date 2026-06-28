// @trace FR-SHELL-01, FR-CAT-01, FR-CAT-02, FR-CAT-03, FR-CAT-04, FR-TX-01, FR-TX-02, FR-TX-03, FR-TX-04, FR-TX-06, FR-TX-07
import type Database from 'better-sqlite3';
import type { IRepository } from '../repository';
import type { CategoryFullRow, CreateCategoryInput, UpdateCategoryInput } from '@/lib/categories/types';
import type {
  TransactionRow,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilters,
} from '@/lib/transactions/types';
import {
  SQL_LIST_CATEGORIES,
  SQL_GET_CATEGORY,
  SQL_CREATE_CATEGORY,
  SQL_DELETE_CATEGORY,
  SQL_COUNT_TRANSACTIONS_BY_CATEGORY,
  buildUpdateQuery,
  buildUpdateParams,
} from '@/lib/categories/queries';
import {
  SQL_GET_TRANSACTION,
  SQL_CREATE_TRANSACTION,
  SQL_DELETE_TRANSACTION,
  buildListTransactionsQuery,
  buildCountTransactionsQuery,
  buildTransactionUpdateQuery,
  buildTransactionUpdateParams,
} from '@/lib/transactions/queries';

export class SqliteRepository implements IRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  ping(): boolean {
    this.db.prepare('SELECT 1').get();
    return true;
  }

  // -------------------------------------------------------------------------
  // Transactions
  // -------------------------------------------------------------------------

  countTransactions(): number {
    const row = this.db
      .prepare('SELECT COUNT(*) AS n FROM transactions')
      .get() as { n: number };
    return row.n;
  }

  listTransactions(filters: TransactionFilters): TransactionRow[] {
    const { sql, params } = buildListTransactionsQuery(filters);
    return this.db.prepare(sql).all(...params) as TransactionRow[];
  }

  countFilteredTransactions(filters: Omit<TransactionFilters, 'page'>): number {
    const { sql, params } = buildCountTransactionsQuery(filters);
    const row = this.db.prepare(sql).get(...params) as { n: number };
    return row.n;
  }

  getTransaction(id: number): TransactionRow | undefined {
    return this.db.prepare(SQL_GET_TRANSACTION).get(id) as TransactionRow | undefined;
  }

  createTransaction(input: CreateTransactionInput): TransactionRow {
    const result = this.db
      .prepare(SQL_CREATE_TRANSACTION)
      .run(
        input.amount_cents,
        input.currency,
        input.rate_to_usd,
        input.date,
        input.category_id ?? null,
        input.type,
        input.note ?? null,
      );
    return this.db
      .prepare(SQL_GET_TRANSACTION)
      .get(result.lastInsertRowid) as TransactionRow;
  }

  updateTransaction(
    id: number,
    fields: UpdateTransactionInput,
  ): TransactionRow | undefined {
    const sql = buildTransactionUpdateQuery(fields as Record<string, unknown>);
    if (!sql) {
      // No valid fields to update; return current row (or undefined if not found).
      return this.getTransaction(id);
    }
    const params = buildTransactionUpdateParams(id, fields as Record<string, unknown>);
    const result = this.db.prepare(sql).run(...params);
    if (result.changes === 0) return undefined;
    return this.getTransaction(id);
  }

  deleteTransaction(id: number): boolean {
    const result = this.db.prepare(SQL_DELETE_TRANSACTION).run(id);
    return result.changes > 0;
  }

  // -------------------------------------------------------------------------
  // Categories
  // -------------------------------------------------------------------------

  listCategories(): CategoryFullRow[] {
    return this.db
      .prepare(SQL_LIST_CATEGORIES)
      .all() as CategoryFullRow[];
  }

  getCategory(id: number): CategoryFullRow | undefined {
    const row = this.db
      .prepare(SQL_GET_CATEGORY)
      .get(id) as CategoryFullRow | undefined;
    return row;
  }

  createCategory(input: CreateCategoryInput): CategoryFullRow {
    const result = this.db
      .prepare(SQL_CREATE_CATEGORY)
      .run(input.name, input.icon, input.color);
    const row = this.db
      .prepare(SQL_GET_CATEGORY)
      .get(result.lastInsertRowid) as CategoryFullRow;
    return row;
  }

  updateCategory(id: number, fields: UpdateCategoryInput): CategoryFullRow | undefined {
    const sql = buildUpdateQuery(fields as Record<string, unknown>);
    if (!sql) {
      // No valid fields to update; return current row.
      return this.getCategory(id);
    }
    const params = buildUpdateParams(id, fields as Record<string, unknown>);
    this.db.prepare(sql).run(...params);
    return this.getCategory(id);
  }

  deleteCategory(id: number): boolean {
    const result = this.db
      .prepare(SQL_DELETE_CATEGORY)
      .run(id);
    return result.changes > 0;
  }

  countTransactionsByCategory(categoryId: number): number {
    const row = this.db
      .prepare(SQL_COUNT_TRANSACTIONS_BY_CATEGORY)
      .get(categoryId) as { n: number };
    return row.n;
  }
}
