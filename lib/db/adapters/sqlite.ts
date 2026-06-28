// @trace FR-SHELL-01, FR-CAT-01, FR-CAT-02, FR-CAT-03, FR-CAT-04
import type Database from 'better-sqlite3';
import type { IRepository } from '../repository';
import type { CategoryFullRow, CreateCategoryInput, UpdateCategoryInput } from '@/lib/categories/types';
import {
  SQL_LIST_CATEGORIES,
  SQL_GET_CATEGORY,
  SQL_CREATE_CATEGORY,
  SQL_DELETE_CATEGORY,
  SQL_COUNT_TRANSACTIONS_BY_CATEGORY,
  buildUpdateQuery,
  buildUpdateParams,
} from '@/lib/categories/queries';

export class SqliteRepository implements IRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  ping(): boolean {
    this.db.prepare('SELECT 1').get();
    return true;
  }

  countTransactions(): number {
    const row = this.db
      .prepare('SELECT COUNT(*) AS n FROM transactions')
      .get() as { n: number };
    return row.n;
  }

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
