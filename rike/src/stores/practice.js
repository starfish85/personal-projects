import { computed, reactive } from 'vue'
import * as db from '../db'
import { localDateKey, uid } from '../utils/date'
import { compressImage, ImageError } from '../utils/image'
import { toast } from './ui'

export const TASK_ID = 'guitar'
export const DRAW_ID = 'drawing'

export const practice = reactive({
  ready: false,
  task: { id: TASK_ID, title: '练习吉他', target: 10 },
  date: '',
  count: 0,
  completedAt: null,
  sheets: [],
  notes: [],
  checkins: [],
})

function readInk() {
  try {
    return localStorage.getItem('rike.ink') === 'pencil' ? 'pencil' : 'finger'
  } catch {
    return 'finger'
  }
}

export const studio = reactive({
  sheetIndex: 0,
  mode: 'pen',
  ink: readInk(),
  color: '#1c1410',
  width: 0.007,
  notesOpen: false,
})

export function setInk(ink) {
  studio.ink = ink === 'pencil' ? 'pencil' : 'finger'
  try {
    localStorage.setItem('rike.ink', studio.ink)
  } catch {
    /* ignore */
  }
}

export const done = computed(
  () => practice.count >= practice.task.target && practice.task.target > 0,
)

const urls = new Map()

function viewAsset(asset) {
  const url = URL.createObjectURL(asset.blob)
  const thumbUrl = URL.createObjectURL(asset.thumbBlob || asset.blob)
  urls.set(asset.id, { url, thumbUrl })
  return {
    id: asset.id,
    taskId: asset.taskId,
    role: asset.role,
    name: asset.name,
    width: asset.width,
    height: asset.height,
    createdAt: asset.createdAt,
    order: asset.order,
    date: asset.date || null,
    url,
    thumbUrl,
  }
}

function revokeList(list) {
  for (const item of list) {
    const cached = urls.get(item.id)
    if (cached) {
      URL.revokeObjectURL(cached.url)
      URL.revokeObjectURL(cached.thumbUrl)
      urls.delete(item.id)
    }
  }
}

function quotaMessage(error) {
  if (error?.name === 'QuotaExceededError') {
    return '手机给这个页面的空间不够了，删几张谱或导出后清理'
  }
  return error?.message || '保存失败'
}

function syncCompleteFlag() {
  if (practice.count >= practice.task.target) {
    if (!practice.completedAt) practice.completedAt = new Date().toISOString()
  } else {
    practice.completedAt = null
  }
}

async function saveDay() {
  const key = `day.${practice.task.id}.${practice.date}`
  if (practice.count <= 0) {
    await db.kvDelete(key)
    return
  }
  await db.kvSet(key, {
    count: practice.count,
    target: practice.task.target,
    completedAt: practice.completedAt,
    updatedAt: new Date().toISOString(),
  })
}

export function dayComplete(taskId, record) {
  if (!record || !record.count) return false
  if (taskId === DRAW_ID) return record.count > 0
  if (record.completedAt) return true
  if (record.target && record.count >= record.target) return true
  return false
}

export const TASK_META = [
  { id: TASK_ID, title: '练习吉他', color: 'guitar' },
  { id: DRAW_ID, title: '画画', color: 'draw' },
]

export async function listDays(taskId = TASK_ID) {
  const kv = await db.kvGetAll()
  const prefix = `day.${taskId}.`
  const days = []
  for (const [key, value] of Object.entries(kv)) {
    if (!key.startsWith(prefix)) continue
    days.push({
      date: key.slice(prefix.length),
      count: value?.count || 0,
      target: value?.target ?? null,
      completedAt: value?.completedAt || null,
      updatedAt: value?.updatedAt || null,
    })
  }
  return days.sort((a, b) => a.date.localeCompare(b.date))
}

async function saveTask() {
  await db.kvSet(`task.${practice.task.id}`, { ...practice.task })
}

export async function loadToday() {
  const date = localDateKey()
  practice.date = date
  const day = await db.kvGet(`day.${practice.task.id}.${date}`)
  practice.count = day?.count || 0
  practice.completedAt = day?.completedAt || null
  syncCompleteFlag()
}

export async function ensureToday() {
  if (practice.date !== localDateKey()) await loadToday()
}

export async function loadAssets() {
  const sheets = await db.assetsByRole(practice.task.id, 'sheet')
  const notes = await db.assetsByRole(practice.task.id, 'note')
  revokeList(practice.sheets)
  revokeList(practice.notes)
  practice.sheets = sheets.map(viewAsset)
  practice.notes = notes.map(viewAsset)
  if (studio.sheetIndex >= practice.sheets.length) {
    studio.sheetIndex = Math.max(0, practice.sheets.length - 1)
  }
}

export async function loadCheckins() {
  const rows = await db.assetsByRole(DRAW_ID, 'checkin')
  revokeList(practice.checkins)
  practice.checkins = rows.map(viewAsset)
}

export function checkinsOn(date) {
  return practice.checkins.filter((item) => item.date === date)
}

async function syncDrawingDay(date) {
  const n = practice.checkins.filter((item) => item.date === date).length
  const key = `day.${DRAW_ID}.${date}`
  if (n <= 0) {
    await db.kvDelete(key)
    return
  }
  const prev = await db.kvGet(key)
  await db.kvSet(key, {
    count: n,
    completedAt: prev?.completedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

export async function addCheckins(fileList, date = practice.date) {
  await ensureToday()
  const files = [...fileList]
  if (!files.length) return []
  let order = practice.checkins.reduce((max, item) => Math.max(max, item.order || 0), 0)
  const added = []
  for (const file of files) {
    try {
      const packed = await compressImage(file)
      order += 1
      const asset = {
        id: uid('a'),
        taskId: DRAW_ID,
        role: 'checkin',
        date,
        name: packed.name,
        mime: packed.mime,
        width: packed.width,
        height: packed.height,
        createdAt: new Date().toISOString(),
        order,
        blob: packed.blob,
        thumbBlob: packed.thumbBlob,
      }
      await db.assetPut(asset)
      added.push(asset.id)
    } catch (error) {
      if (error instanceof ImageError) toast(error.message)
      else toast(quotaMessage(error))
    }
  }
  await loadCheckins()
  await syncDrawingDay(date)
  return added
}

export async function removeCheckin(id) {
  const item = practice.checkins.find((row) => row.id === id)
  await db.assetDelete(id)
  await loadCheckins()
  if (item?.date) await syncDrawingDay(item.date)
}

export async function bootPractice() {
  try {
    await db.openDb()
    const task = await db.kvGet(`task.${TASK_ID}`)
    practice.task = task || { id: TASK_ID, title: '练习吉他', target: 10 }
    if (!task) await saveTask()
    const drawing = await db.kvGet(`task.${DRAW_ID}`)
    if (!drawing) {
      await db.kvSet(`task.${DRAW_ID}`, {
        id: DRAW_ID,
        title: '画画',
        completion: 'photo-log',
      })
    }
    await loadToday()
    await loadAssets()
    await loadCheckins()
  } catch (error) {
    console.error(error)
    toast('本地数据打开失败，刷新试试')
  } finally {
    practice.ready = true
  }
}

export async function bump(delta) {
  await ensureToday()
  practice.count = Math.max(0, practice.count + delta)
  syncCompleteFlag()
  await saveDay()
}

export async function setTarget(n) {
  const target = Math.round(Number(n))
  if (!Number.isFinite(target) || target < 1 || target > 999) {
    toast('目标遍数请填 1 到 999 的整数')
    return false
  }
  practice.task.target = target
  syncCompleteFlag()
  await saveTask()
  await saveDay()
  return true
}

export async function addFiles(role, fileList) {
  const files = [...fileList]
  if (!files.length) return []
  const existing = role === 'sheet' ? practice.sheets : practice.notes
  let order = existing.reduce((max, item) => Math.max(max, item.order || 0), 0)
  const added = []

  for (const file of files) {
    try {
      const packed = await compressImage(file)
      order += 1
      const asset = {
        id: uid('a'),
        taskId: practice.task.id,
        role,
        name: packed.name,
        mime: packed.mime,
        width: packed.width,
        height: packed.height,
        createdAt: new Date().toISOString(),
        order,
        blob: packed.blob,
        thumbBlob: packed.thumbBlob,
      }
      await db.assetPut(asset)
      added.push(asset.id)
    } catch (error) {
      if (error instanceof ImageError) toast(error.message)
      else toast(quotaMessage(error))
    }
  }

  await loadAssets()
  return added
}

export async function removeAsset(id) {
  await db.assetDelete(id)
  await loadAssets()
}

export async function reloadAll() {
  const task = await db.kvGet(`task.${TASK_ID}`)
  practice.task = task || { id: TASK_ID, title: '练习吉他', target: 10 }
  await loadToday()
  await loadAssets()
  await loadCheckins()
}
