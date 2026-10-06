UPDATE users
SET password = 'pbkdf2$100000$PbFwu4ZxD17L-nw87fUH9Q$Fzs2WxGvSLbhZUKtkAbZ43nNrIHjyjSwlKuni2LuaO0'
WHERE email = 'admin@fruitica.vn' COLLATE NOCASE
  AND password IN (
    'admin123',
    'pbkdf2$120000$3tT79NNSr6qZwBGlTi7ZIg$HTmMb7PpXs8h_O-XCgM_ZDQbdBqJRjm5rCHrFUgOf2s'
  );