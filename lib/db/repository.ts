// @trace FR-SHELL-01, FR-CAT-01, FR-CAT-02, FR-CAT-03, FR-CAT-04
import type {
  CategoryFullRow,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@/lib/categories/types';

// Re-export for callers that imported CategoryRow by name from here.
export type { CategoryFullRow };

export interface TransactionRow {
  id: number;
  amount_cents: number;
}

export interface IRepository {
  /** Health-check: returns true if the DB connection is alive. */
  ping(): boolean;

  // --- Transactions (add-transactions slice will expand this) ---
  countTransactions(): number;

  // --- Categories ---
  listCategories(): CategoryFullRow[];
  getCategory(id: number): CategoryFullRow | undefined;
  createCategory(input: CreateCategoryInput): CategoryFullRow;
  updateCategory(id: number, fields: UpdateCategoryInput): CategoryFullRow | undefined;
  deleteCategory(id: number): boolean;
  countTransactionsByCategory(categoryId: number): number;
}
