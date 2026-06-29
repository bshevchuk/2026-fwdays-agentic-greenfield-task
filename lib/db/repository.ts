// @trace FR-SHELL-01, FR-CAT-01, FR-CAT-02, FR-CAT-03, FR-CAT-04, FR-TX-01, FR-TX-02, FR-TX-03, FR-TX-04, FR-TX-06, FR-TX-07
import type {
  CategoryFullRow,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@/lib/categories/types';
import type {
  TransactionRow,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilters,
} from '@/lib/transactions/types';

// Re-export for callers that imported these types by name from here.
export type { CategoryFullRow, TransactionRow };

export interface IRepository {
  /** Health-check: returns true if the DB connection is alive. */
  ping(): boolean;

  // --- Transactions ---
  countTransactions(): number;
  listTransactions(filters: TransactionFilters): TransactionRow[];
  listAllTransactions(filters: Omit<TransactionFilters, 'page'>): TransactionRow[];
  countFilteredTransactions(filters: Omit<TransactionFilters, 'page'>): number;
  getTransaction(id: number): TransactionRow | undefined;
  createTransaction(input: CreateTransactionInput): TransactionRow;
  updateTransaction(id: number, fields: UpdateTransactionInput): TransactionRow | undefined;
  deleteTransaction(id: number): boolean;

  // --- Categories ---
  listCategories(): CategoryFullRow[];
  getCategory(id: number): CategoryFullRow | undefined;
  createCategory(input: CreateCategoryInput): CategoryFullRow;
  updateCategory(id: number, fields: UpdateCategoryInput): CategoryFullRow | undefined;
  deleteCategory(id: number): boolean;
  countTransactionsByCategory(categoryId: number): number;
}
