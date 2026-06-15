// Basic Service Worker for Recomp Charity PWA (web.dev + Google HTML Service friendly)
// Caches core shell + assets for offline use. Images are best-effort.
const CACHE_NAME = 'recomp-charity-v2.3.14';
const CORE_ASSETS = [
  'index.html',
  './',
  'manifest.json',
  'css/tailwind.css',
  'tailwind.config.js'
];

const IMAGE_ASSETS = [
  'images/ab_wheel_rollout.jpg',
  'images/bayesian_cable_curls.jpg',
  'images/cable_overhead_triceps.jpg',
  'images/deadlift.jpg',
  'images/dragon_flag.jpg',
  'images/finger_curls.jpg',
  'images/flat_dumbbell_press.jpg',
  'images/incline_dumbbell_press.jpg',
  'images/lateral_raises.jpg',
  'images/lower_chest_cable_fly.jpg',
  'images/preacher_curls.jpg',
  'images/pull_ups.jpg',
  'images/rear_delt_raises.jpg',
  'images/reverse_forearm_curl.jpg',
  'images/seated_cable_row.jpg',
  'images/tricep_rope_pushdown.jpg',
  'images/wood_chopper.jpg',
  'images/zercher_squats.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch(() => { /* non-fatal */ });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // JS / index.html 永遠優先走網絡，避免舊版快取導致 Tab 結構或同步邏輯錯誤
  try {
    const url = new URL(req.url);
    const path = url.pathname;
    if (path.endsWith('.js') || path.endsWith('index.html') || path.endsWith('/')) {
      event.respondWith(
        fetch(req).then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone)).catch(() => {});
          }
          return res;
        }).catch(() => caches.match(req))
      );
      return;
    }
  } catch (_) {}

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // Only cache successful same-origin responses
          if (!res || res.status !== 200 || res.type !== 'basic') return res;
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone)).catch(()=>{});
          return res;
        })
        .catch(() => cached || new Response('Offline', { status: 503 }));
    })
  );
});
