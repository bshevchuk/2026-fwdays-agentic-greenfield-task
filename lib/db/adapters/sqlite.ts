// @trace FR-SHELL-01
import type Database from 'better-sqlite3';
import type { IRepository, CategoryRow } from '../repository';

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

  listCategories(): CategoryRow[] {
    return this.db
      .prepare('SELECT id, name FROM categories ORDER BY name')
      .all() as CategoryRow[];
  }
}
