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
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_created_at ON products (created_at DESC, id DESC);

INSERT OR IGNORE INTO users (email, password, full_name, role) VALUES
('admin@fruitica.vn', 'pbkdf2$100000$PbFwu4ZxD17L-nw87fUH9Q$Fzs2WxGvSLbhZUKtkAbZ43nNrIHjyjSwlKuni2LuaO0', 'Quản Trị Viên', 'admin');

INSERT OR IGNORE INTO products (id, name, price, tag, rating, description, image_key) VALUES
(1, 'Xoài cát', 79000, 'Hot', 4.9, 'Ngọt, mềm, thơm và giàu vitamin C.', 'mango.jpg'),
(2, 'Cam sành', 65000, 'New', 4.8, 'Vị chua ngọt cân đối, tăng đề kháng.', 'orange.jpg');