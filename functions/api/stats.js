// Cloudflare Pages Function: GET /api/stats
// Bảo vệ bằng STATS_ADMIN_KEY, không bao giờ nhúng token SQL trong HTML.
const TABLE = 'default.visitors';

function secureEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  let mismatch = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return mismatch === 0;
}

async function basinQuery(env, sql) {
  const url = `https://api.sql.cloudflarestorage.com/api/v1/accounts/${env.BASIN_ACCOUNT_ID}/basin-sql/query/${env.BASIN_BUCKET}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.BASIN_SQL_TOKEN}`
    },
    body: JSON.stringify({ query: sql })
  });
  const payload = await r.json().catch(() => ({}));
  if (!r.ok || payload.success === false || !Array.isArray(payload.result?.rows)) {
    console.error('Basin SQL error', r.status, JSON.stringify(payload).slice(0, 1000));
    throw new Error(`Basin SQL trả về lỗi ${r.status}`);
  }
  return payload.result.rows;
}

export async function onRequestGet({ request, env }) {
  const reply = (data, status = 200) => new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
  if (!env.STATS_ADMIN_KEY || !env.BASIN_SQL_TOKEN || !env.BASIN_ACCOUNT_ID || !env.BASIN_BUCKET) {
    return reply({ error: 'Chưa cấu hình secrets thống kê' }, 503);
  }
  const provided = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || '';
  if (!secureEqual(provided, env.STATS_ADMIN_KEY)) return reply({ error: 'Không có quyền truy cập' }, 401);

  // Bắt đầu ngày theo múi giờ Việt Nam (UTC+7), không phụ thuộc server ở đâu.
  const todayVN = Math.floor((Date.now() + 7 * 3600_000) / 86_400_000) * 86_400 - 7 * 3600;
  const start7 = todayVN - 6 * 86_400;
  const realView = "json_get_str(meta, 'event') = 'pageview'";
  const last7 = `time >= from_unixtime(${start7}) AND ${realView}`;

  const sql = {
    overview: `SELECT COUNT(*) AS total_views, approx_distinct(json_get_str(meta, 'visitorId')) AS unique_visitors,
      SUM(CASE WHEN time >= from_unixtime(${todayVN}) THEN 1 ELSE 0 END) AS views_today,
      SUM(CASE WHEN time >= from_unixtime(${start7}) THEN 1 ELSE 0 END) AS views_7days
      FROM ${TABLE} WHERE ${realView}`,
    daily: `SELECT to_char(from_unixtime(to_unixtime(time) + 25200), '%Y-%m-%d') AS day,
      COUNT(*) AS views FROM ${TABLE} WHERE ${last7}
      GROUP BY to_char(from_unixtime(to_unixtime(time) + 25200), '%Y-%m-%d') ORDER BY day LIMIT 7`,
    country: `SELECT country, COUNT(*) AS views FROM ${TABLE} WHERE ${last7}
      GROUP BY country ORDER BY views DESC LIMIT 12`,
    device: `SELECT device, COUNT(*) AS views FROM ${TABLE} WHERE ${last7}
      GROUP BY device ORDER BY views DESC LIMIT 8`,
    page: `SELECT json_get_str(meta, 'path') AS path, COUNT(*) AS views FROM ${TABLE}
      WHERE ${last7} GROUP BY json_get_str(meta, 'path') ORDER BY views DESC LIMIT 12`
  };
  try {
    const entries = await Promise.all(Object.entries(sql).map(async ([name, query]) => [name, await basinQuery(env, query)]));
    const result = Object.fromEntries(entries);
    return reply({ generatedAt: new Date().toISOString(), timezone: 'Asia/Ho_Chi_Minh',
      overview: result.overview[0] || {}, daily: result.daily,
      country: result.country, device: result.device, page: result.page });
  } catch (err) {
    return reply({ error: String(err.message || err) }, 502);
  }
}
