import * as db from '../db'
import { blobToBase64, base64ToBlob } from './image'
import { reloadAll } from '../stores/practice'

export async function exportBackup() {
  const kv = await db.kvGetAll()
  const assets = await db.assetsAll()
  const strokes = await db.strokesAll()
  const packedAssets = []
  for (const asset of assets) {
    packedAssets.push({
      id: asset.id,
      taskId: asset.taskId,
      role: asset.role,
      name: asset.name,
      mime: asset.mime,
      width: asset.width,
      height: asset.height,
      createdAt: asset.createdAt,
      order: asset.order,
      blobBase64: await blobToBase64(asset.blob),
      thumbBase64: asset.thumbBlob ? await blobToBase64(asset.thumbBlob) : '',
    })
  }
  return {
    app: 'rike',
    version: 1,
    exportedAt: new Date().toISOString(),
    kv,
    assets: packedAssets,
    strokes,
  }
}

export function downloadBackup(data) {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = data.exportedAt.slice(0, 10)
  a.href = url
  a.download = `rike-backup-${stamp}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importBackup(file) {
  const text = await file.text()
  const data = JSON.parse(text)
  if (data.app !== 'rike' || !data.kv || !Array.isArray(data.assets)) {
    throw new Error('这不是日课的备份文件')
  }
  await db.clearAll()
  for (const [key, value] of Object.entries(data.kv)) {
    await db.kvSet(key, value)
  }
  for (const asset of data.assets) {
    await db.assetPut({
      id: asset.id,
      taskId: asset.taskId,
      role: asset.role,
      name: asset.name,
      mime: asset.mime,
      width: asset.width,
      height: asset.height,
      createdAt: asset.createdAt,
      order: asset.order,
      blob: base64ToBlob(asset.blobBase64, asset.mime),
      thumbBlob: asset.thumbBase64 ? base64ToBlob(asset.thumbBase64, asset.mime) : null,
    })
  }
  for (const row of data.strokes || []) {
    await db.strokesPut(row.assetId, row.strokes || [])
  }
  await reloadAll()
}
