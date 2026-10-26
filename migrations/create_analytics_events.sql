
-- Bảng thống kê lượt truy cập Fruitica
CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT NOT NULL UNIQUE,
    group_id TEXT NOT NULL DEFAULT '06',
    visitor_id TEXT,
    event TEXT NOT NULL,
    path TEXT NOT NULL,
    country TEXT,
    device TEXT,
    created_at INTEGER NOT NULL
);

-- Tăng tốc truy vấn theo thời gian
CREATE INDEX IF NOT EXISTS idx_analytics_time
ON analytics_events(created_at);

-- Tăng tốc thống kê theo loại sự kiện
CREATE INDEX IF NOT EXISTS idx_analytics_event
ON analytics_events(event);
