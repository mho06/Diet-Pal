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
  const url = event.request.url;
  // Only handle plain http(s) requests — browser extensions and other schemes
  // (chrome-extension://, etc.) aren't supported by the Cache API.
  if (!url.startsWith('http')) return;
  // Never cache API calls (our AI proxy, Open Food Facts, Firebase) — always live.
  if (url.includes('/.netlify/functions/') || url.includes('openfoodfacts.org') || url.includes('googleapis.com') || url.includes('gstatic.com')) {
    return;
  }
  // Network-first for the app shell: always try to get the latest deploy first.
  // Only fall back to the cached copy if the network is unavailable (offline).
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

