// Service worker: precache every app file and serve cache first, so the game
// works with no signal. Change CACHE_VERSION on every deploy (see CLAUDE.md)
// or players keep the old files.

const CACHE_VERSION = 'anc-v3';

const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './src/main.js',
  './src/messages.js',
  './src/core/rng.js',
  './src/core/rules.js',
  './src/core/solver.js',
  './src/core/generator.js',
  './src/core/techniques.js',
  './src/core/difficulty.js',
  './src/core/hints.js',
  './src/core/game.js',
  './src/ui/style.css',
  './src/ui/board.js',
  './src/ui/controls.js',
  './src/ui/screens.js',
  './src/ui/animals.js',
  './src/ui/animals-pixel.js',
  './src/ui/palettes.js',
  './src/store/storage.js',
  './src/worker/generate.worker.js',
  './fonts/PixelifySans.ttf',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_VERSION).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache same-origin files we did not know about (defensive; the list above should cover everything).
        if (response.ok && new URL(event.request.url).origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    }),
  );
});
