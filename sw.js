const APP_VERSION = 'v31.0.0';
const CACHE_NAME = 'masarefy-' + APP_VERSION;
const URLS_TO_CACHE = [
  './', './index.html', './manifest.json',
  './icon-192.png', './icon-512.png',
  './icon-192-maskable.png', './icon-512-maskable.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(URLS_TO_CACHE).catch(()=>{})));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(names =>
    Promise.all(names.map(n => n !== CACHE_NAME ? caches.delete(n) : null))
  ).then(() => self.clients.claim()));
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== 'GET') return;

  const isHTML = e.request.mode === 'navigate' ||
                 (e.request.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          if (r && r.status === 200) {
            const copy = r.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, copy));
          }
          return r;
        })
        .catch(() => caches.match(e.request, {ignoreSearch: true})
          .then(c => c || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request, {ignoreSearch: true}).then(cached => {
      if (cached) {
        fetch(e.request).then(r => {
          if (r && r.status === 200) caches.open(CACHE_NAME).then(c => c.put(e.request, r));
        }).catch(()=>{});
        return cached;
      }
      return fetch(e.request).then(r => {
        if (!r || r.status !== 200 || r.type !== 'basic') return r;
        caches.open(CACHE_NAME).then(c => c.put(e.request, r.clone()));
        return r;
      });
    })
  );
});
