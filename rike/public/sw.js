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
      icon: './favicon.svg',
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
