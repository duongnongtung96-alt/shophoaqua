/* Nhúng trong trang Fruitica: <script defer src="/fruitica-analytics.js"></script> */
(() => {
  // Tôn trọng lựa chọn không theo dõi của trình duyệt.
  if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true) return;
  const visitorKey = 'fruitica_visitor_id_v1';
  const sessionKey = 'fruitica_session_id_v1';
  const id = getOrCreate(localStorage, visitorKey);
  const session = getOrCreate(sessionStorage, sessionKey);
  let lastPath = null;

  function getOrCreate(storage, key) {
    try {
      let value = storage.getItem(key);
      if (!value) { value = crypto.randomUUID(); storage.setItem(key, value); }
      return value;
    } catch { return crypto.randomUUID(); }
  }
  function referrerHost() {
    try { return document.referrer ? new URL(document.referrer).hostname : ''; }
    catch { return ''; }
  }
  function send(path) {
    if (path === lastPath) return;
    lastPath = path;
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'pageview', id, session, path, referrerHost: referrerHost() }),
      keepalive: true
    }).then(r => { if (!r.ok) console.warn('Fruitica Basin /api/track:', r.status); })
      .catch(e => console.warn('Không thể ghi lượt xem', e));
  }
  const update = () => send(location.pathname);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', update, { once: true });
  else update();

  // Hỗ trợ ứng dụng SPA dùng pushState / replaceState.
  for (const method of ['pushState', 'replaceState']) {
    const original = history[method];
    history[method] = function (...args) {
      const result = original.apply(this, args);
      queueMicrotask(update);
      return result;
    };
  }
  window.addEventListener('popstate', update);
})();
