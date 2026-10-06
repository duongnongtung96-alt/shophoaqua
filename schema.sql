CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  tag TEXT,
  rating REAL DEFAULT 5.0,
  description TEXT,
  image_key TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_created_at ON products (created_at DESC, id DESC);

INSERT OR IGNORE INTO users (email, password, full_name, role) VALUES
('admin@fruitica.vn', 'pbkdf2$120000$3tT79NNSr6qZwBGlTi7ZIg$HTmMb7PpXs8h_O-XCgM_ZDQbdBqJRjm5rCHrFUgOf2s', 'Fruitica Admin', 'admin');

INSERT OR IGNORE INTO products (id, name, price, tag, rating, description, image_key) VALUES
(1, 'Xoài cát', 79000, 'Hot', 4.9, 'Ngọt, mềm, thơm và giàu vitamin C cho sức khỏe mỗi ngày.', 'mango.jpg'),
(2, 'Cam sành', 65000, 'New', 4.8, 'Vị chua ngọt cân đối, giúp tăng cường đề kháng.', 'orange.jpg'),
(3, 'Dưa hấu', 99000, 'Best', 5.0, 'Giải nhiệt tuyệt vời, nhiều nước và rất phù hợp cho mùa hè.', 'watermelon.jpg'),
(4, 'Nho xanh', 120000, 'Fresh', 4.9, 'Chín mọng, ngọt thanh và giàu dưỡng chất.', 'grape.jpg');