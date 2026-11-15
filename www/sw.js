// STAY HARD service worker: 100% offline-first, без CDN.
const VERSION = 'stayhard-v4';
const SHELL = [
  './', './index.html', './manifest.json', './js/cloud.js',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'
];
const MP = './libs/mediapipe/pose/';
const MODEL = [
  'pose.js', 'pose_solution_packed_assets_loader.js', 'pose_solution_packed_assets.data',
  'pose_solution_simd_wasm_bin.js', 'pose_solution_simd_wasm_bin.wasm',
  'pose_solution_wasm_bin.js', 'pose_solution_wasm_bin.wasm',
  'pose_landmark_lite.tflite', 'pose_landmark_full.tflite', 'pose_web.binarypb'
].map((f) => MP + f);

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // По одному файлу: отсутствие какого-то файла не ломает установку воркера
    await Promise.allSettled([...SHELL, ...MODEL].map((u) => cache.add(u)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Только свои файлы (облако идёт напрямую в сеть). Cache-first + фоновое обновление.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length) { clients[0].focus(); clients[0].postMessage({ type: 'START_WORKOUT' }); return; }
      return self.clients.openWindow('./index.html?start=1');
    })
  );
});
