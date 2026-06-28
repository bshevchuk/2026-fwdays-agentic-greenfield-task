// @trace FR-SHELL-01
export interface CategoryRow {
  id: number;
  name: string;
}

export interface TransactionRow {
  id: number;
  amount_cents: number;
}

export interface IRepository {
  /** Health-check: returns true if the DB connection is alive. */
  ping(): boolean;

  // --- Transactions (add-transactions slice will expand this) ---
  countTransactions(): number;

  // --- Categories (add-categories slice will expand this) ---
  listCategories(): CategoryRow[];
}
