import * as db from '../db'
import { blobToBase64, base64ToBlob } from './image'
import { practice, reloadAll } from '../stores/practice'

export const BACKUP_NAG_MS = 7 * 24 * 60 * 60 * 1000

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
      date: asset.date || null,
      featured: Boolean(asset.featured),
      pieceId: asset.pieceId || '',
      blobBase64: await blobToBase64(asset.blob),
      thumbBase64: asset.thumbBlob ? await blobToBase64(asset.thumbBlob) : '',
    })
  }
  return {
    app: 'rike',
    version: 5,
    exportedAt: new Date().toISOString(),
    kv,
    assets: packedAssets,
    strokes,
  }
}

export function backupStamp(data) {
  return String(data?.exportedAt || new Date().toISOString()).slice(0, 10)
}

export function backupFileName(data) {
  return `rike-backup-${backupStamp(data)}.json`
}

export function downloadBackup(data) {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = backupFileName(data)
  a.click()
  URL.revokeObjectURL(url)
}

export async function markLastBackupAt(iso = new Date().toISOString()) {
  practice.lastBackupAt = iso
  await db.kvSet('lastBackupAt', iso)
  return iso
}

export async function exportAndDownload() {
  const data = await exportBackup()
  downloadBackup(data)
  await markLastBackupAt()
  return data
}

export function backupNagNeeded() {
  try {
    if (sessionStorage.getItem('rikeBackupNag') === '1') return false
  } catch {
    /* private mode */
  }
  const at = practice.lastBackupAt
  if (!at) return true
  const t = new Date(at).getTime()
  if (!Number.isFinite(t)) return true
  return Date.now() - t >= BACKUP_NAG_MS
}

export function dismissBackupNag() {
  try {
    sessionStorage.setItem('rikeBackupNag', '1')
  } catch {
    /* private mode */
  }
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
  await db.kvSet('schemaVersion', 0)
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
      date: asset.date || null,
      featured: Boolean(asset.featured),
      pieceId: asset.pieceId || '',
      blob: base64ToBlob(asset.blobBase64, asset.mime),
      thumbBlob: asset.thumbBase64 ? base64ToBlob(asset.thumbBase64, asset.mime) : null,
    })
  }
  for (const row of data.strokes || []) {
    await db.strokesPut(row.assetId, row.strokes || [])
  }
  await reloadAll()
}
