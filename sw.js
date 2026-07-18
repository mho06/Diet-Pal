const CACHE_NAME = 'dietpal-v2';
const SHELL_FILES = ['./index.html', './styles.css', './app.js', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Network-first for API calls (our own AI proxy, Open Food Facts, Firebase) so data stays live.
  // Cache-first for the app shell so it loads instantly and works offline.
  const url = event.request.url;
  if (url.includes('/.netlify/functions/') || url.includes('openfoodfacts.org') || url.includes('googleapis.com') || url.includes('gstatic.com')) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

