DROP TABLE IF EXISTS transactions;

CREATE TABLE transactions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  amount_cents INTEGER NOT NULL,
  currency     TEXT    NOT NULL,
  rate_to_usd  REAL    NOT NULL,
  date         TEXT    NOT NULL,
  category_id  INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
  type         TEXT    NOT NULL CHECK(type IN ('expense', 'income')),
  note         TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_date        ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
