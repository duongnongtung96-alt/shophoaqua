CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE products ADD COLUMN created_at TEXT NOT NULL DEFAULT '';
UPDATE products SET created_at = CURRENT_TIMESTAMP WHERE created_at = '';
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products (created_at DESC, id DESC);

INSERT OR IGNORE INTO users (email, password, full_name, role) VALUES
('admin@fruitica.vn', 'pbkdf2$120000$3tT79NNSr6qZwBGlTi7ZIg$HTmMb7PpXs8h_O-XCgM_ZDQbdBqJRjm5rCHrFUgOf2s', 'Fruitica Admin', 'admin');