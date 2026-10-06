CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO users (email, password, full_name, role) VALUES
('admin@fruitica.vn', 'pbkdf2$100000$PbFwu4ZxD17L-nw87fUH9Q$Fzs2WxGvSLbhZUKtkAbZ43nNrIHjyjSwlKuni2LuaO0', 'Fruitica Admin', 'admin');