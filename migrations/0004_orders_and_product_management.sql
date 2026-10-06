ALTER TABLE products ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1));

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  note TEXT,
  total INTEGER NOT NULL CHECK (total >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipping', 'completed', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price > 0),
  stock_returned INTEGER NOT NULL DEFAULT 0 CHECK (stock_returned IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);

