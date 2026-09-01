// Recomp PWA: precache shell + JS + vendor libs so Gym 網絡差 / 離線都開到。
// index.html 同 JS 仍優先走網絡，有網就更新；斷線用快取。
const CACHE_NAME = 'recomp-charity-v2.3.73';

const CORE_ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'css/tailwind.css',
  'css/mobile-app.css',
  'lib/chart.umd.min.js',
  'lib/xlsx.full.min.js',
  'lib/fontawesome/css/all.min.css',
  'lib/fontawesome/webfonts/fa-solid-900.woff2',
  'lib/fontawesome/webfonts/fa-regular-400.woff2',
  'lib/fontawesome/webfonts/fa-brands-400.woff2',
  'lib/fontawesome/webfonts/fa-v4compatibility.woff2',
  'js/data.js',
  'js/exercise-gif-map.js',
  'js/utils.js',
  'js/state.js',
  'js/api.js',
  'js/fullscreen.js',
  'js/ui.js',
  'js/ui-log.js',
  'js/ui-history.js',
  'js/ui-calendar.js',
  'js/ui-workoutsets.js',
  'js/ui-library.js',
  'js/ui-analysis.js',
  'js/ui-yugong.js',
  'js/food-nutrition.js',
  'js/food-depth.js',
  'js/ui-calories.js',
  'js/unique-health.js',
  'js/ui-habits.js',
  'js/ui-app.js',
  'images/icon.jpeg',
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
  'images/zercher_squats.jpg',
  'images/可愛山圖1.png',
  'images/可愛山圖2.png',
  'images/可愛山圖3.png',
  'images/可愛山圖4.png'
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
    path.endsWith('sw.js');
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
