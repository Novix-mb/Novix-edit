const CACHE = 'novix-admin';
const SHELL = ['./', './index.html', './admin.css', './admin.js', './data.js', './i18n.js', './manifest.webmanifest',
  './worker/icon-192.png', './worker/icon-512.png', '../assets/js/nx-config.js', '../assets/css/fonts.css', './favicon.ico', './worker/icon.svg', './worker/favicon-32.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('novix-admin-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || u.pathname.includes('/__/')) return;
  e.respondWith(fetch(r, { cache: 'no-cache' }).then(res => {
    if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)).catch(() => {}); }
    return res;
  }).catch(() => caches.match(r).then(m => m || (r.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
