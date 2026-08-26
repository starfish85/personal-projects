import * as db from '../db'

const BUCKET = 'rike'

export function assetObjectPaths(userId, id) {
  return {
    full: `${userId}/${id}/full.jpg`,
    thumb: `${userId}/${id}/thumb.jpg`,
  }
}

function later(a, b) {
  return String(a || '') >= String(b || '')
}

function rowFromAsset(asset, userId, strokes) {
  return {
    id: asset.id,
    user_id: userId,
    task_id: asset.taskId,
    role: asset.role,
    name: asset.name || '',
    mime: asset.mime || 'image/jpeg',
    width: asset.width || null,
    height: asset.height || null,
    created_at: asset.createdAt || new Date().toISOString(),
    updated_at: asset.updatedAt || asset.createdAt || new Date().toISOString(),
    order: asset.order || 0,
    date: asset.date || null,
    featured: Boolean(asset.featured),
    deleted_at: null,
    strokes: Array.isArray(strokes) ? strokes : [],
  }
}

async function uploadOne(client, userId, asset) {
  const paths = assetObjectPaths(userId, asset.id)
  const strokes = await db.strokesGet(asset.id)
  if (asset.blob) {
    const { error } = await client.storage.from(BUCKET).upload(paths.full, asset.blob, {
      upsert: true,
      contentType: asset.mime || 'image/jpeg',
    })
    if (error) throw error
  }
  if (asset.thumbBlob) {
    const { error } = await client.storage.from(BUCKET).upload(paths.thumb, asset.thumbBlob, {
      upsert: true,
      contentType: asset.mime || 'image/jpeg',
    })
    if (error) throw error
  }
  const { error } = await client.from('rike_assets').upsert(rowFromAsset(asset, userId, strokes))
  if (error) throw error
}

async function downloadOne(client, userId, row) {
  const paths = assetObjectPaths(userId, row.id)
  const full = await client.storage.from(BUCKET).download(paths.full)
  if (full.error) throw full.error
  let thumbBlob = null
  const thumb = await client.storage.from(BUCKET).download(paths.thumb)
  if (!thumb.error) thumbBlob = thumb.data
  await db.assetPut({
    id: row.id,
    taskId: row.task_id,
    role: row.role,
    name: row.name,
    mime: row.mime,
    width: row.width,
    height: row.height,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    order: row.order,
    date: row.date,
    featured: Boolean(row.featured),
    blob: full.data,
    thumbBlob,
  })
  if (Array.isArray(row.strokes)) await db.strokesPut(row.id, row.strokes)
  const stored = await db.assetGet(row.id)
  if (stored) {
    stored.updatedAt = row.updated_at
    await db.assetPut(stored)
  }
  await db.clearAssetTombstone(row.id)
}

async function tombstoneRemote(client, userId, id, when) {
  const paths = assetObjectPaths(userId, id)
  await client.storage.from(BUCKET).remove([paths.full, paths.thumb])
  const { data } = await client
    .from('rike_assets')
    .select('id')
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle()
  if (data) {
    const { error } = await client
      .from('rike_assets')
      .update({ deleted_at: when, updated_at: when, strokes: [] })
      .eq('user_id', userId)
      .eq('id', id)
    if (error) throw error
    return
  }
  const { error } = await client.from('rike_assets').upsert({
    id,
    user_id: userId,
    task_id: 'gone',
    role: 'sheet',
    deleted_at: when,
    updated_at: when,
  })
  if (error) throw error
}

export function missingAssetTable(error) {
  const message = String(error?.message || error || '')
  return /rike_assets|schema cache|does not exist|bucket not found|row-level security/i.test(message)
}

export async function syncAssets(client, userId, onProgress = () => {}) {
  const remoteRes = await client.from('rike_assets').select('*').eq('user_id', userId)
  if (remoteRes.error) throw remoteRes.error
  const remote = remoteRes.data || []
  const local = await db.assetsAll()
  const tombstones = await db.assetTombstones()
  const localMap = new Map(local.map((item) => [item.id, item]))
  const remoteMap = new Map(remote.map((item) => [item.id, item]))

  const toUpload = []
  const toDownload = []
  const toDeleteLocal = []
  const toDeleteRemote = []

  for (const [id, when] of Object.entries(tombstones)) {
    toDeleteRemote.push({ id, when })
  }

  for (const asset of local) {
    if (tombstones[asset.id]) continue
    const row = remoteMap.get(asset.id)
    if (!row || row.deleted_at) {
      toUpload.push(asset)
      continue
    }
    if (later(asset.updatedAt || asset.createdAt, row.updated_at)) toUpload.push(asset)
  }

  for (const row of remote) {
    if (tombstones[row.id]) continue
    if (row.deleted_at) {
      if (localMap.has(row.id)) toDeleteLocal.push(row.id)
      continue
    }
    const asset = localMap.get(row.id)
    if (!asset) {
      toDownload.push(row)
      continue
    }
    if (later(row.updated_at, asset.updatedAt || asset.createdAt)) toDownload.push(row)
  }

  const total = toUpload.length + toDownload.length + toDeleteRemote.length + toDeleteLocal.length
  let done = 0
  const tick = (label) => {
    done += 1
    onProgress({ done, total, label })
  }

  for (const item of toDeleteRemote) {
    await tombstoneRemote(client, userId, item.id, item.when)
    if (localMap.has(item.id)) await db.assetDelete(item.id)
    await db.clearAssetTombstone(item.id)
    tick('删云端图')
  }
  for (const id of toDeleteLocal) {
    await db.assetDelete(id)
    tick('删本机图')
  }
  for (const asset of toUpload) {
    await uploadOne(client, userId, asset)
    tick('上传图')
  }
  for (const row of toDownload) {
    await downloadOne(client, userId, row)
    tick('下载图')
  }

  return { uploaded: toUpload.length, downloaded: toDownload.length, total }
}
