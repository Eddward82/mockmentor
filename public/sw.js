const CACHE_NAME = 'mockmentor-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// On fetch, if a chunk fails to load (stale hash), tell the page to reload
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isAsset = url.pathname.startsWith('/assets/') && url.pathname.endsWith('.js');

  if (isAsset) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Asset not found — new deploy must have replaced it
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => client.postMessage({ type: 'RELOAD' }));
        });
        return new Response('', { status: 503 });
      })
    );
  }
});
