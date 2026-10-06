CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  tag TEXT DEFAULT 'Fresh',
  rating REAL DEFAULT 5.0,
  description TEXT,
  image_key TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  unit TEXT NOT NULL DEFAULT 'kg',
  origin TEXT,
  specifications TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_created_at ON products (created_at DESC, id DESC);

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

INSERT OR IGNORE INTO users (email, password, full_name, role) VALUES
('admin@fruitica.vn', 'pbkdf2$100000$PbFwu4ZxD17L-nw87fUH9Q$Fzs2WxGvSLbhZUKtkAbZ43nNrIHjyjSwlKuni2LuaO0', 'Quản Trị Viên', 'admin');

INSERT OR IGNORE INTO products (id, name, price, tag, rating, description, image_key) VALUES
(1, 'Xoài cát', 79000, 'Hot', 4.9, 'Ngọt, mềm, thơm và giàu vitamin C.', 'mango.jpg'),
(2, 'Cam sành', 65000, 'New', 4.8, 'Vị chua ngọt cân đối, tăng đề kháng.', 'orange.jpg');