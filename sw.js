// Recomp PWA: precache shell only. 動作圖／山圖／xlsx 按需要 cache-on-demand。
const CACHE_NAME = 'recomp-charity-v2.4.10';

const CORE_ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'css/tailwind.css',
  'css/app-chrome.css',
  'css/mobile-app.css',
  'lib/fontawesome/css/all.min.css',
  'lib/fontawesome/webfonts/fa-solid-900.woff2',
  'lib/fontawesome/webfonts/fa-regular-400.woff2',
  'lib/fontawesome/webfonts/fa-brands-400.woff2',
  'js/boot.js',
  'js/lazy-libs.js',
  'js/data.js',
  'js/utils.js',
  'js/state.js',
  'js/api.js',
  'js/ui-app.js',
  'js/app-boot.js',
  'images/icon-192.png',
  'images/icon-512.png'
];

function isSameOrigin(url) {
  try {
    return new URL(url, self.location.href).origin === self.location.origin;
  } catch (_) {
    return false;
  }
}

function isShellRequest(url) {
  const path = new URL(url, self.location.href).pathname;
  return path.endsWith('.js') || path.endsWith('index.html') || path.endsWith('/') ||
    path.endsWith('sw.js') || path.indexOf('/partials/') >= 0;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        CORE_ASSETS.map((url) => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (!isSameOrigin(req.url) && req.mode === 'navigate') return;

  if (isShellRequest(req.url)) {
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match(req).then((cached) => {
        return cached || caches.match('index.html') || new Response('Offline', { status: 503 });
      }))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const networked = fetch(req).then((res) => {
        if (res && res.status === 200 && isSameOrigin(req.url)) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached || new Response('Offline', { status: 503 }));
      return cached || networked;
    })
  );
});
