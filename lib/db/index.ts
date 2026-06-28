// @trace FR-SHELL-01
import { SqliteRepository } from './adapters/sqlite';
import { getDb } from './client';
import type { IRepository } from './repository';

export type { IRepository, CategoryFullRow, TransactionRow } from './repository';

export function getRepository(): IRepository {
  return new SqliteRepository(getDb());
}
