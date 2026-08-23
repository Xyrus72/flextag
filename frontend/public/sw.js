/* FlexTag service worker — offline shell + fast static loads.
   Deliberately conservative: never caches /api responses or non-GET requests,
   so live data and auth are always fresh. */
const CACHE = 'flextag-v1'
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/products/flextag-logo.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  // Only handle same-origin GETs; never touch the API, sockets, or POSTs.
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) return

  // Navigations: network-first, fall back to the cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/index.html')))
    return
  }

  // Static assets: cache-first, then network (and cache the result).
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((res) => {
      if (res.ok && res.type === 'basic') {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(request, copy))
      }
      return res
    }).catch(() => cached)),
  )
})
