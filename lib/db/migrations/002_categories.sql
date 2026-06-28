ALTER TABLE categories ADD COLUMN icon TEXT NOT NULL DEFAULT 'tag';
ALTER TABLE categories ADD COLUMN color TEXT NOT NULL DEFAULT '#6366f1';
ALTER TABLE categories ADD COLUMN budget_limit REAL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name ON categories (name COLLATE NOCASE);

INSERT OR IGNORE INTO categories (name, icon, color) VALUES
  ('Food & Drink', 'utensils', '#ef4444'),
  ('Transport', 'car', '#3b82f6'),
  ('Housing', 'home', '#8b5cf6'),
  ('Health', 'heart-pulse', '#10b981'),
  ('Entertainment', 'film', '#f59e0b'),
  ('Income', 'trending-up', '#22c55e'),
  ('Other', 'tag', '#6366f1');
