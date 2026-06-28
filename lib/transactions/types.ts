// @trace FR-TX-01, FR-TX-02, FR-TX-03, FR-TX-04, FR-TX-05, FR-TX-06, FR-TX-07

export interface TransactionRow {
  id: number;
  amount_cents: number;    // integer cents (amount × 100)
  currency: string;
  rate_to_usd: number;
  date: string;            // YYYY-MM-DD
  category_id: number | null;
  type: 'expense' | 'income';
  note: string | null;
  created_at: string;
}

export interface CreateTransactionInput {
  amount_cents: number;    // pre-computed by route handler
  currency: string;
  rate_to_usd: number;     // fetched by route handler from /api/fx/rates
  date: string;
  category_id: number | null;
  type: 'expense' | 'income';
  note?: string | null;
}

export interface UpdateTransactionInput {
  amount_cents?: number;
  currency?: string;
  date?: string;
  category_id?: number | null;
  type?: 'expense' | 'income';
  note?: string | null;
  // rate_to_usd is intentionally absent — immutable after creation (KD-4)
}

export interface TransactionFilters {
  month?: string;          // YYYY-MM; defaults to current local calendar month
  category_id?: number;
  type?: 'expense' | 'income';
  page?: number;           // 1-indexed; default 1
}
