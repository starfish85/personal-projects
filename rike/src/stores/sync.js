import { reactive } from 'vue'
import * as db from '../db'
import { getClient, redirectTo } from '../cloud/client'
import { localDateKey } from '../utils/date'
import {
  normalizeTask,
  onLocalChange,
  practice,
  reloadAll,
} from './practice'
import { toast } from './ui'

export const cloud = reactive({
  user: null,
  email: '',
  syncing: false,
  lastAt: '',
  error: '',
})

let timer = 0
let pulling = false

function later(isoA, isoB) {
  return String(isoA || '') >= String(isoB || '')
}

function parseDayKey(key) {
  const date = key.slice(-10)
  const taskId = key.slice(4, key.length - 11)
  return { taskId, date }
}

async function mergeTasks(remote) {
  if (!remote) return
  const remoteAt = remote.tasks_updated_at || remote.updated_at
  if (practice.tasksUpdatedAt && later(practice.tasksUpdatedAt, remoteAt) && practice.tasks.length) {
    return
  }
  const list = Array.isArray(remote.tasks) ? remote.tasks.map(normalizeTask) : []
  if (!list.length && practice.tasks.length) return
  practice.tasks = list
  practice.tasksUpdatedAt = remoteAt || new Date().toISOString()
  practice.task =
    list.find((item) => item.id === practice.task.id) || list[0] || practice.task
  await db.kvSet('tasks', JSON.parse(JSON.stringify(list)))
  await db.kvSet('tasksUpdatedAt', practice.tasksUpdatedAt)
}

function mergeDay(local, remote) {
  if (!local) {
    return {
      count: remote.count || 0,
      target: remote.target ?? null,
      completedAt: remote.completed_at || null,
      subtasks: remote.subtasks || {},
      updatedAt: remote.updated_at,
    }
  }
  if (!remote) return local
  const localNewer = later(local.updatedAt, remote.updated_at)
  const newer = localNewer ? local : remote
  const newerCount = (localNewer ? local.count : remote.count) || 0
  const maxCount = Math.max(local.count || 0, remote.count || 0)
  return {
    count: newerCount === 0 ? 0 : maxCount,
    target: newer.target ?? local.target ?? remote.target ?? null,
    completedAt:
      newerCount === 0 ? null : local.completedAt || remote.completed_at || null,
    subtasks: localNewer ? local.subtasks || {} : remote.subtasks || local.subtasks || {},
    updatedAt: localNewer ? local.updatedAt : remote.updated_at,
  }
}

async function mergeDays(rows) {
  const localKv = await db.kvGetAll()
  for (const row of rows || []) {
    const key = `day.${row.task_id}.${row.date}`
    const merged = mergeDay(localKv[key], {
      count: row.count,
      target: row.target,
      completed_at: row.completed_at,
      subtasks: row.subtasks,
      updated_at: row.updated_at,
    })
    await db.kvSet(key, {
      count: merged.count,
      target: merged.target,
      completedAt: merged.completedAt,
      subtasks: merged.subtasks || {},
      updatedAt: merged.updatedAt,
    })
  }
}

async function mergeJournals(rows) {
  for (const row of rows || []) {
    const date = row.date
    const localAt = practice.journalUpdatedAt[date] || ''
    if (later(localAt, row.updated_at)) continue
    practice.journalTexts[date] = row.text || ''
    practice.journalUpdatedAt[date] = row.updated_at
    await db.kvSet(`journal.${date}`, { text: row.text || '', updatedAt: row.updated_at })
  }
}

async function mergeTaskNotes(rows) {
  for (const row of rows || []) {
    const taskId = row.task_id
    const localAt = practice.taskNotesUpdatedAt[taskId] || ''
    if (later(localAt, row.updated_at)) continue
    practice.taskNotes[taskId] = row.text || ''
    practice.taskNotesUpdatedAt[taskId] = row.updated_at
    await db.kvSet(`taskNote.${taskId}`, { text: row.text || '', updatedAt: row.updated_at })
  }
}

async function pull(client, userId) {
  const [meta, days, journals, taskNotes] = await Promise.all([
    client.from('rike_meta').select('*').eq('user_id', userId).maybeSingle(),
    client.from('rike_days').select('*').eq('user_id', userId),
    client.from('rike_journals').select('*').eq('user_id', userId),
    client.from('rike_task_notes').select('*').eq('user_id', userId),
  ])
  if (meta.error) throw meta.error
  if (days.error) throw days.error
  if (journals.error) throw journals.error
  if (taskNotes.error) throw taskNotes.error
  pulling = true
  try {
    await mergeTasks(meta.data)
    await mergeDays(days.data)
    await mergeJournals(journals.data)
    await mergeTaskNotes(taskNotes.data)
    await reloadAll()
  } finally {
    pulling = false
  }
}

async function push(client, userId) {
  const kv = await db.kvGetAll()
  const dayRows = []
  const journalRows = []
  const taskNoteRows = []
  for (const [key, value] of Object.entries(kv)) {
    if (key.startsWith('day.')) {
      const { taskId, date } = parseDayKey(key)
      dayRows.push({
        user_id: userId,
        task_id: taskId,
        date,
        count: value?.count || 0,
        target: value?.target ?? null,
        completed_at: value?.completedAt || null,
        subtasks: value?.subtasks || {},
        updated_at: value?.updatedAt || new Date().toISOString(),
      })
    }
    if (key.startsWith('journal.')) {
      journalRows.push({
        user_id: userId,
        date: key.slice(8),
        text: value?.text || '',
        updated_at: value?.updatedAt || new Date().toISOString(),
      })
    }
    if (key.startsWith('taskNote.')) {
      taskNoteRows.push({
        user_id: userId,
        task_id: key.slice(9),
        text: value?.text || '',
        updated_at: value?.updatedAt || new Date().toISOString(),
      })
    }
  }

  const { error: metaErr } = await client.from('rike_meta').upsert({
    user_id: userId,
    tasks: practice.tasks,
    tasks_updated_at: practice.tasksUpdatedAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  if (metaErr) throw metaErr

  if (dayRows.length) {
    const { error } = await client.from('rike_days').upsert(dayRows)
    if (error) throw error
  }
  if (journalRows.length) {
    const { error } = await client.from('rike_journals').upsert(journalRows)
    if (error) throw error
  }
  if (taskNoteRows.length) {
    const { error } = await client.from('rike_task_notes').upsert(taskNoteRows)
    if (error) throw error
  }
}

export async function fullSync() {
  const client = getClient()
  if (!client || !cloud.user || cloud.syncing) return
  cloud.syncing = true
  cloud.error = ''
  try {
    await pull(client, cloud.user.id)
    await push(client, cloud.user.id)
    cloud.lastAt = localDateKey() + ' ' + new Date().toTimeString().slice(0, 5)
  } catch (error) {
    cloud.error = error.message || '同步失败'
    toast(error.message || '同步失败')
  } finally {
    cloud.syncing = false
  }
}

function scheduleSync() {
  if (pulling || !cloud.user) return
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    fullSync()
  }, 800)
}

export async function sendLogin(email) {
  const client = getClient()
  if (!client) {
    toast('先填写云项目')
    return false
  }
  if (!email.trim()) {
    toast('先填写邮箱')
    return false
  }
  const { error } = await client.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: redirectTo() },
  })
  if (error) {
    toast(error.message || '发送失败')
    return false
  }
  toast('去邮箱点登录链接')
  return true
}

export async function signOut() {
  const client = getClient()
  if (client) await client.auth.signOut()
  cloud.user = null
  cloud.email = ''
}

export async function bootSync() {
  onLocalChange(scheduleSync)
  const client = getClient()
  if (!client) return

  if (location.search.includes('code=')) {
    const { error } = await client.auth.exchangeCodeForSession(location.search)
    if (error) toast(error.message || '登录失败')
    history.replaceState({}, '', location.pathname + location.hash)
  }

  const {
    data: { session },
  } = await client.auth.getSession()
  cloud.user = session?.user || null
  cloud.email = session?.user?.email || ''
  if (session) await fullSync()

  client.auth.onAuthStateChange(async (_event, next) => {
    cloud.user = next?.user || null
    cloud.email = next?.user?.email || ''
    if (next) await fullSync()
  })
}
