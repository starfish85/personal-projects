const DB_NAME = 'rike'
const DB_VERSION = 1

let dbPromise = null

export function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv')
        if (!db.objectStoreNames.contains('assets')) {
          const store = db.createObjectStore('assets', { keyPath: 'id' })
          store.createIndex('by_task_role', ['taskId', 'role'])
        }
        if (!db.objectStoreNames.contains('strokes')) {
          db.createObjectStore('strokes', { keyPath: 'assetId' })
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

function withTransaction(storeNames, mode, run) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(storeNames, mode)
        let result
        transaction.oncomplete = () => resolve(result)
        transaction.onerror = () => reject(transaction.error)
        transaction.onabort = () => reject(transaction.error)
        try {
          result = run(transaction)
        } catch (error) {
          reject(error)
        }
      }),
  )
}

export function kvGet(key, fallback = null) {
  return withTransaction('kv', 'readonly', (tx) => tx.objectStore('kv').get(key)).then((req) => {
    const value = req.result
    return value === undefined ? fallback : value
  })
}

export function kvSet(key, value) {
  return withTransaction('kv', 'readwrite', (tx) => {
    tx.objectStore('kv').put(value, key)
  })
}

export function kvDelete(key) {
  return withTransaction('kv', 'readwrite', (tx) => {
    tx.objectStore('kv').delete(key)
  })
}

export function kvGetAll() {
  return withTransaction('kv', 'readonly', (tx) => {
    const store = tx.objectStore('kv')
    const keysReq = store.getAllKeys()
    const valuesReq = store.getAll()
    return { keysReq, valuesReq }
  }).then(({ keysReq, valuesReq }) => {
    const out = {}
    keysReq.result.forEach((key, i) => {
      out[key] = valuesReq.result[i]
    })
    return out
  })
}

export function assetPut(asset) {
  return withTransaction('assets', 'readwrite', (tx) => {
    tx.objectStore('assets').put(asset)
  })
}

export function assetsByRole(taskId, role) {
  return withTransaction('assets', 'readonly', (tx) => {
    return tx.objectStore('assets').index('by_task_role').getAll([taskId, role])
  }).then((req) => {
    const rows = req.result || []
    return rows.sort((a, b) => a.order - b.order || String(a.createdAt).localeCompare(String(b.createdAt)))
  })
}

export function assetGet(id) {
  return withTransaction('assets', 'readonly', (tx) => tx.objectStore('assets').get(id)).then(
    (req) => req.result,
  )
}

export function assetDelete(id) {
  return withTransaction(['assets', 'strokes'], 'readwrite', (tx) => {
    tx.objectStore('assets').delete(id)
    tx.objectStore('strokes').delete(id)
  })
}

const TOMBSTONE_KEY = 'assetTombstones'

export async function rememberDeletedAsset(id) {
  const map = (await kvGet(TOMBSTONE_KEY, {})) || {}
  map[id] = new Date().toISOString()
  await kvSet(TOMBSTONE_KEY, map)
}

export async function assetTombstones() {
  return (await kvGet(TOMBSTONE_KEY, {})) || {}
}

export async function clearAssetTombstone(id) {
  const map = (await kvGet(TOMBSTONE_KEY, {})) || {}
  if (!(id in map)) return
  delete map[id]
  await kvSet(TOMBSTONE_KEY, map)
}

export function assetsAll() {
  return withTransaction('assets', 'readonly', (tx) => tx.objectStore('assets').getAll()).then(
    (req) => req.result || [],
  )
}

export function strokesGet(assetId) {
  return withTransaction('strokes', 'readonly', (tx) =>
    tx.objectStore('strokes').get(assetId),
  ).then((req) => req.result?.strokes || [])
}

export function strokesPut(assetId, strokes) {
  const now = new Date().toISOString()
  return openDb().then(
    (database) =>
      new Promise((resolve, reject) => {
        const transaction = database.transaction(['strokes', 'assets'], 'readwrite')
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
        transaction.objectStore('strokes').put({
          assetId,
          strokes,
          updatedAt: now,
        })
        const getReq = transaction.objectStore('assets').get(assetId)
        getReq.onsuccess = () => {
          const asset = getReq.result
          if (!asset) return
          asset.updatedAt = now
          transaction.objectStore('assets').put(asset)
        }
      }),
  )
}

export function strokesAll() {
  return withTransaction('strokes', 'readonly', (tx) =>
    tx.objectStore('strokes').getAll(),
  ).then((req) => req.result || [])
}

export function clearAll() {
  return withTransaction(['kv', 'assets', 'strokes'], 'readwrite', (tx) => {
    tx.objectStore('kv').clear()
    tx.objectStore('assets').clear()
    tx.objectStore('strokes').clear()
  })
}
