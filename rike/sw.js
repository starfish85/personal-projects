const CACHE = 'rike-pwa-1'

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
]

function sameOrigin(url) {
  return url.origin === self.location.origin
}

function shouldBypass(url) {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return true
  if (url.pathname.includes('/supabase/') || url.hostname.includes('supabase.co')) return true
  return false
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (shouldBypass(url)) return

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy))
          return res
        })
        .catch(() => caches.match('./index.html')),
    )
    return
  }

  if (!sameOrigin(url) && url.hostname !== 'cdn.jsdelivr.net') return

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetched = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((cache) => cache.put(req, copy))
          }
          return res
        })
        .catch(() => cached)
      return cached || fetched
    }),
  )
})

self.addEventListener('push', (event) => {
  let data = { title: '日课', body: '到点了', url: './' }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {
    try {
      data.body = event.data.text()
    } catch {
      /* empty push */
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || '日课', {
      body: data.body || '到点了',
      tag: data.tag || 'rike',
      icon: './icons/icon-192.png',
      data: { url: data.url || './' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || './'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ('focus' in client) {
          client.focus()
          if (url && 'navigate' in client) client.navigate(url)
          return
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
