import { reactive } from 'vue'
import * as db from '../db'
import { getClient, redirectTo, takeAuthHash } from '../cloud/client'
import { missingAssetTable, syncAssets } from '../cloud/assets'
import { currentPushOn, registerShellWorker } from '../cloud/push'
import { localDateKey } from '../utils/date'
import {
  applyMergedTasks,
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
  assetNote: '',
  push: 'off',
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

function taskStamp(task, fallback) {
  return task?.updatedAt || fallback || ''
}

async function mergeTasks(remote) {
  if (!remote) return
  const remoteList = Array.isArray(remote.tasks) ? remote.tasks.map(normalizeTask) : []
  const remoteAt = remote.tasks_updated_at || remote.updated_at || ''
  const localList = practice.tasks || []
  const localAt = practice.tasksUpdatedAt || ''
  const map = new Map()
  for (const task of remoteList) {
    map.set(task.id, { task, at: taskStamp(task, remoteAt) })
  }
  for (const task of localList) {
    const prev = map.get(task.id)
    const at = taskStamp(task, localAt)
    if (!prev || later(at, prev.at)) map.set(task.id, { task, at })
  }
  const list = [...map.values()].map((item) => item.task)
  const stamp = later(localAt, remoteAt) ? localAt || remoteAt : remoteAt || localAt
  await applyMergedTasks(list, stamp || new Date().toISOString())
}

// 同一天两边都加过遍数：取较大值，不把两边相加。较新的一次若把计数清零，则以清零为准。
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
  cloud.assetNote = ''
  try {
    await pull(client, cloud.user.id)
    await push(client, cloud.user.id)
    try {
      cloud.assetNote = '同步图片'
      await syncAssets(client, cloud.user.id, ({ done, total, label }) => {
        cloud.assetNote = total ? `${label} ${done}/${total}` : '同步图片'
      })
      await reloadAll()
    } catch (error) {
      if (missingAssetTable(error)) {
        cloud.assetNote = '请执行最新 schema.sql 才能同步图片'
      } else {
        throw error
      }
    }
    cloud.lastAt = localDateKey() + ' ' + new Date().toTimeString().slice(0, 5)
    if (cloud.assetNote && cloud.assetNote.startsWith('请执行')) {
      /* keep the hint */
    } else {
      cloud.assetNote = ''
    }
  } catch (error) {
    cloud.error = error.message || '同步失败'
    toast(error.message || '同步失败')
  } finally {
    cloud.syncing = false
  }
}

function clearAuthParams() {
  history.replaceState({}, '', `${location.pathname}#/`)
}

function decodeAuthText(value) {
  try {
    return decodeURIComponent(String(value || '').replace(/\+/g, ' '))
  } catch {
    return String(value || '')
  }
}

async function finishAuthCallback(client) {
  const search = new URLSearchParams(location.search)
  const storedHash = takeAuthHash()
  const hash = new URLSearchParams(String(storedHash || location.hash || '').replace(/^#/, ''))
  const errorDesc = search.get('error_description') || hash.get('error_description') || hash.get('error')
  if (errorDesc) {
    toast(decodeAuthText(errorDesc))
    clearAuthParams()
    return
  }
  const accessToken = hash.get('access_token')
  const refreshToken = hash.get('refresh_token')
  if (accessToken && refreshToken) {
    toast('正在登录')
    const { error } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    clearAuthParams()
    if (error) toast(error.message || '登录失败')
    else toast('已登录')
    return
  }
  const code = search.get('code')
  const tokenHash = search.get('token_hash') || hash.get('token_hash')
  const type = search.get('type') || hash.get('type') || 'email'
  if (code) {
    toast('正在登录')
    const { error } = await client.auth.exchangeCodeForSession(window.location.href)
    clearAuthParams()
    if (error) toast(error.message || '登录失败')
    else toast('已登录')
    return
  }
  if (tokenHash) {
    toast('正在登录')
    const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type })
    clearAuthParams()
    if (error) toast(error.message || '登录失败')
    else toast('已登录')
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
  cloud.email = email.trim()
  const { error } = await client.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: redirectTo(), shouldCreateUser: true },
  })
  if (error) {
    toast(error.message || '发送失败')
    return false
  }
  toast('邮件已发出。请长按复制 Sign in 链接，粘贴回这个页面。')
  return true
}

async function afterSignedIn(email) {
  const {
    data: { session },
  } = await getClient().auth.getSession()
  cloud.user = session?.user || null
  cloud.email = session?.user?.email || email || ''
  cloud.error = ''
  toast('已登录')
  if (session) await fullSync()
  return Boolean(session)
}

async function verifyToken(email, token, type) {
  const client = getClient()
  const { error } = await client.auth.verifyOtp({
    email,
    token,
    type,
  })
  if (error) return error
  await afterSignedIn(email)
  return null
}

export async function completeLoginFromPaste(raw, email) {
  const client = getClient()
  if (!client) {
    toast('先填写云项目')
    return false
  }
  const text = String(raw || '').trim()
  const address = String(email || cloud.email || '').trim()
  if (!text) {
    toast('把邮件里的 Sign in 链接粘贴进来')
    return false
  }
  if (/^\d{6,8}$/.test(text)) {
    if (!address) {
      toast('先填邮箱')
      return false
    }
    const first = await verifyToken(address, text, 'email')
    if (!first) return true
    const second = await verifyToken(address, text, 'magiclink')
    if (second) {
      toast(second.message || '验证码不对')
      return false
    }
    return true
  }

  let url
  try {
    url = new URL(text)
  } catch {
    toast('请粘贴完整链接，从 https 开头')
    return false
  }

  const params = new URLSearchParams(url.search)
  const hash = new URLSearchParams(String(url.hash || '').replace(/^#/, ''))
  const accessToken = hash.get('access_token') || params.get('access_token')
  const refreshToken = hash.get('refresh_token') || params.get('refresh_token')
  if (accessToken && refreshToken) {
    const { error } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    if (error) {
      toast(error.message || '登录失败')
      return false
    }
    return afterSignedIn(address)
  }

  const code = params.get('code')
  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(text)
    if (error) {
      toast(error.message || '这个链接要粘贴回发送邮件的那个日课页面')
      return false
    }
    return afterSignedIn(address)
  }

  const tokenHash = params.get('token_hash') || hash.get('token_hash')
  if (tokenHash) {
    const type = params.get('type') || hash.get('type') || 'email'
    const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type })
    if (error) {
      toast(error.message || '登录失败')
      return false
    }
    return afterSignedIn(address)
  }

  const token = params.get('token')
  if (token) {
    if (!address) {
      toast('先填邮箱，再粘贴链接')
      return false
    }
    const first = await verifyToken(address, token, 'email')
    if (!first) return true
    const second = await verifyToken(address, token, 'magiclink')
    if (second) {
      toast(second.message || '链接无效，再发一封试试')
      return false
    }
    return true
  }

  toast('没从链接里读到登录信息，把 Sign in 的完整链接贴过来')
  return false
}

export async function signOut() {
  const client = getClient()
  if (client) await client.auth.signOut()
  cloud.user = null
  cloud.email = ''
}

export async function bootSync() {
  onLocalChange(scheduleSync)
  registerShellWorker()
  cloud.push = await currentPushOn()
  const client = getClient()
  if (!client) return

  await finishAuthCallback(client)

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
