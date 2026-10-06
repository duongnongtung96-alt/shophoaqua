DROP TABLE IF EXISTS products;

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  tag TEXT,
  rating REAL DEFAULT 5.0,
  description TEXT,
  image_key TEXT
);

INSERT INTO products (name, price, tag, rating, description, image_key) VALUES
('Xoài cát', 79000, 'Hot', 4.9, 'Ngọt, mềm, thơm và giàu vitamin C cho sức khỏe mỗi ngày.', 'mango.jpg'),
('Cam sành', 65000, 'New', 4.8, 'Vị chua ngọt cân đối, giúp tăng cường đề kháng.', 'orange.jpg'),
('Dưa hấu', 99000, 'Best', 5.0, 'Giải nhiệt tuyệt vời, nhiều nước và rất phù hợp cho mùa hè.', 'watermelon.jpg'),
('Nho xanh', 120000, 'Fresh', 4.9, 'Chín mọng, ngọt thanh và giàu dưỡng chất.', 'grape.jpg');