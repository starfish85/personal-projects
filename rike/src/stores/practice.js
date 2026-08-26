import { computed, reactive } from 'vue'
import * as db from '../db'
import { dateMode, localDateKey, shiftDateKey, uid, weekdayOf } from '../utils/date'
import { compressImage, ImageError } from '../utils/image'
import { toast } from './ui'

export const TASK_ID = 'guitar'
export const DRAW_ID = 'drawing'

export const COMPLETION_MODES = [
  { id: 'check', title: '打卡' },
  { id: 'counter', title: '计数' },
  { id: 'photo-log', title: '传图' },
]

export const TASK_COMPONENTS = [
  { id: 'pomodoro', title: '番茄钟' },
  { id: 'images', title: '插入图片' },
  { id: 'annotation', title: '批注' },
  { id: 'sheet', title: '曲谱' },
  { id: 'notes', title: '笔记' },
]

export const DEFAULT_RICH_COMPONENTS = ['counter', 'pomodoro', 'annotation', 'sheet', 'notes']

export const TASK_TEMPLATES = [
  {
    id: 'instrument',
    title: '乐器练习',
    defaultTitle: '练习乐器',
    color: '#e2a23a',
    completion: 'counter',
    sheet: true,
    notes: true,
    components: ['pomodoro', 'sheet', 'annotation', 'notes'],
    summary: '计数、番茄钟、曲谱、批注、笔记',
  },
  {
    id: 'creative',
    title: '画画 / 创作',
    defaultTitle: '每日创作',
    color: '#7da9c7',
    completion: 'photo-log',
    sheet: false,
    notes: false,
    components: ['annotation', 'notes'],
    summary: '图片打卡、批注、笔记',
  },
  {
    id: 'study',
    title: '学习 / 备考',
    defaultTitle: '学习',
    color: '#8fbf88',
    completion: 'check',
    sheet: false,
    notes: true,
    components: ['pomodoro', 'notes'],
    summary: '打卡、番茄钟、笔记、可添加子任务',
  },
  {
    id: 'fitness',
    title: '健身 / 康复',
    defaultTitle: '运动',
    color: '#d46a4c',
    completion: 'counter',
    sheet: false,
    notes: false,
    components: ['counter', 'pomodoro', 'images', 'notes'],
    summary: '计数器、番茄钟、图片打卡、日记',
  },
  {
    id: 'habit',
    title: '生活习惯',
    defaultTitle: '生活习惯',
    color: '#b08dcf',
    completion: 'check',
    sheet: false,
    notes: false,
    components: ['notes'],
    summary: '普通打卡、可添加子任务、日记',
  },
  {
    id: 'custom',
    title: '自定义',
    defaultTitle: '',
    color: '#5e9e8e',
    completion: 'check',
    sheet: false,
    notes: false,
    components: [],
    summary: '普通打卡',
  },
]

export const TASK_COLORS = [
  '#e2a23a',
  '#7da9c7',
  '#8fbf88',
  '#d46a4c',
  '#b08dcf',
  '#e08a5a',
  '#5e9e8e',
  '#d4b85c',
]

export const practice = reactive({
  ready: false,
  tasks: [],
  task: { id: TASK_ID, title: '练习吉他', target: 10, color: '#e2a23a', completion: 'counter' },
  date: '',
  count: 0,
  completedAt: null,
  todayByTask: {},
  sheets: [],
  notes: [],
  helperImages: [],
  helperImageBank: [],
  checkins: [],
  journals: [],
  journalTexts: {},
  journalUpdatedAt: {},
  taskNotes: {},
  taskNotesUpdatedAt: {},
  tasksUpdatedAt: '',
  lastBackupAt: '',
  viewingDate: '',
  byPiece: {},
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

export const done = computed(() => dayComplete(practice.task, {
  count: practice.count,
  target: practice.task.target,
  completedAt: practice.completedAt,
  subtasks: practice.todayByTask[practice.task.id]?.subtasks || {},
}))

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
    featured: Boolean(asset.featured),
    pieceId: String(asset.pieceId || ''),
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

export function quotaMessage(error) {
  if (error?.name === 'QuotaExceededError') {
    return '手机给这个页面的空间不够了，删几张谱或导出后清理'
  }
  return '保存失败，请再试一次'
}

function cloneTaskState(task) {
  return {
    ...task,
    components: Array.isArray(task.components) ? [...task.components] : [],
    subtasks: Array.isArray(task.subtasks) ? task.subtasks.map((item) => ({ ...item })) : [],
    repeatWeekdays: Array.isArray(task.repeatWeekdays) ? [...task.repeatWeekdays] : [],
    skipDates: Array.isArray(task.skipDates) ? [...task.skipDates] : [],
    pieces: Array.isArray(task.pieces) ? task.pieces.map((item) => ({ ...item })) : [],
  }
}

function syncCompleteFlag() {
  if (practice.count >= practice.task.target) {
    if (!practice.completedAt) practice.completedAt = new Date().toISOString()
  } else {
    practice.completedAt = null
  }
}

let cloudHook = () => {}

export function onLocalChange(fn) {
  cloudHook = fn
}

export function notifyCloud() {
  try {
    cloudHook()
  } catch {
    /* ignore */
  }
}

function stampTask(task) {
  task.updatedAt = new Date().toISOString()
  return task
}

function keepSeconds(prev, patchSeconds) {
  return Math.max(0, Math.round(Number(patchSeconds ?? prev?.seconds) || 0))
}

function keepByPiece(prev) {
  const src = prev?.byPiece && typeof prev.byPiece === 'object' && !Array.isArray(prev.byPiece) ? prev.byPiece : {}
  const out = {}
  for (const [id, rec] of Object.entries(src)) {
    out[id] = {
      count: Math.max(0, Math.round(Number(rec?.count) || 0)),
      target: rec?.target == null ? null : Math.max(0, Math.round(Number(rec.target) || 0)),
    }
  }
  return out
}

function dayRecord(prev, patch) {
  return {
    count: patch.count ?? prev?.count ?? 0,
    target: 'target' in patch ? patch.target : (prev?.target ?? null),
    completedAt: 'completedAt' in patch ? patch.completedAt : (prev?.completedAt ?? null),
    subtasks: patch.subtasks ?? prev?.subtasks ?? {},
    seconds: 'seconds' in patch ? keepSeconds(prev, patch.seconds) : keepSeconds(prev),
    byPiece: patch.byPiece ?? keepByPiece(prev),
    updatedAt: new Date().toISOString(),
  }
}

function normalizePieces(list) {
  if (!Array.isArray(list)) return []
  const seen = new Set()
  const out = []
  for (const item of list) {
    const id = String(item?.id || '').trim()
    const title = String(item?.title || '').trim()
    if (!id || !title || seen.has(id)) continue
    seen.add(id)
    const n = Math.round(Number(item.target))
    out.push({
      id,
      title,
      target: Number.isFinite(n) && n >= 1 && n <= 999 ? n : 10,
    })
  }
  return out
}

export function currentPieceOf(task) {
  const pieces = Array.isArray(task?.pieces) ? task.pieces : []
  if (!pieces.length) return null
  const id = String(task.currentPieceId || '')
  return pieces.find((item) => item.id === id) || null
}

export function pieceProgress(task, record) {
  const piece = currentPieceOf(task)
  if (!piece) {
    return {
      piece: null,
      count: record?.count ?? (task?.id === practice.task.id ? practice.count : 0),
      target: record?.target || task?.target || 10,
    }
  }
  const rec =
    record?.byPiece?.[piece.id] ||
    (task.id === practice.task.id ? practice.byPiece?.[piece.id] : null) ||
    {}
  return {
    piece,
    count: Math.max(0, Math.round(Number(rec.count) || 0)),
    target: rec.target || piece.target || task.target || 10,
  }
}

function counterCopy(task, record, today) {
  const progress = pieceProgress(task, record)
  if (progress.piece) {
    const { piece, count, target } = progress
    if (count >= target) return `${today ? '今日已完成' : '已完成'} · ${piece.title} ${count}/${target}`
    if (count > 0) return `${today ? '今日 ' : ''}${piece.title} ${count}/${target}`
    return today ? `今日 ${piece.title} · 未完成` : `${piece.title} · 未完成`
  }
  const count = record?.count || 0
  const target = record?.target || task.target || 10
  if (count >= target) return `${today ? '今日已完成' : '已完成'} · ${count}/${target}`
  if (count > 0) return `${today ? '今日 ' : ''}${count}/${target}`
  return today ? '今日未完成' : '未完成'
}

async function saveDay() {
  const key = `day.${practice.task.id}.${practice.date}`
  const prev = (await db.kvGet(key)) || {}
  await db.kvSet(
    key,
    dayRecord(prev, {
      count: practice.count,
      target: practice.task.target || null,
      completedAt: practice.completedAt,
      subtasks: prev.subtasks || {},
      byPiece: keepByPiece({ byPiece: practice.byPiece }),
    }),
  )
  await refreshTodayMap()
  notifyCloud()
}

export async function addPracticeSeconds(elapsed) {
  const n = Math.round(Number(elapsed) || 0)
  if (n <= 0) return
  await ensureToday()
  const key = `day.${practice.task.id}.${practice.date}`
  const prev = (await db.kvGet(key)) || {}
  await db.kvSet(
    key,
    dayRecord(prev, {
      count: practice.count,
      target: practice.task.target || null,
      completedAt: practice.completedAt,
      subtasks: prev.subtasks || {},
      seconds: keepSeconds(prev) + n,
      byPiece: keepByPiece({ byPiece: practice.byPiece }),
    }),
  )
  await refreshTodayMap()
  notifyCloud()
}

export function dayComplete(task, record) {
  if (!task) return false
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : []
  if (subtasks.length) {
    const doneMap = record?.subtasks || {}
    return subtasks.every((item) => doneMap[item.id])
  }
  if (!record) return false
  if (task.completion === 'photo-log') return record.count > 0
  if (task.completion === 'check') return Boolean(record.completedAt) || record.count > 0
  if (record.completedAt) return true
  const target = record.target || task.target || 0
  return target > 0 && record.count >= target
}

export function taskLineOnDate(task, date, record) {
  const mode = dateMode(date)
  if (mode === 'future') return '已安排'
  if (mode === 'today') return taskTodayLine(task)
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : []
  if (subtasks.length) {
    const doneCount = subtasks.filter((item) => record?.subtasks?.[item.id]).length
    if (subtasks.length && doneCount === subtasks.length) return `已完成 · ${doneCount}/${subtasks.length}`
    if (doneCount > 0) return `${doneCount}/${subtasks.length}`
    return '未完成'
  }
  if (task.completion === 'counter') return counterCopy(task, record, false)
  if (task.completion === 'photo-log') {
    const n = record?.count || 0
    return n ? `已打卡 · ${n} 张` : '未打卡'
  }
  return record?.completedAt || record?.count ? '已完成' : '未完成'
}

export function taskTodayLine(task) {
  const rec = practice.todayByTask[task.id]
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : []
  if (subtasks.length) {
    const doneCount = subtasks.filter((item) => rec?.subtasks?.[item.id]).length
    if (doneCount === subtasks.length) return `今日已完成 · ${doneCount}/${subtasks.length}`
    if (doneCount > 0) return `今日 ${doneCount}/${subtasks.length}`
    return '今日未完成'
  }
  if (task.completion === 'counter') return counterCopy(task, rec, true)
  if (task.completion === 'photo-log') {
    const n = rec?.count || 0
    return n ? `今日已打卡 · ${n} 张` : '今日未打卡'
  }
  return rec?.completedAt || rec?.count ? '今日已完成' : '今日未完成'
}

export function taskScheduledOn(task, date = localDateKey()) {
  if (!task) return false
  if (task.archived) return false
  if (task.paused) return false
  if (task.longTerm) {
    const weekdays = Array.isArray(task.repeatWeekdays) ? task.repeatWeekdays : []
    if (!weekdays.length) return true
    return weekdays.includes(weekdayOf(date))
  }
  return (task.dueDate || localDateKey()) === date
}

export function taskOnDate(task, date = localDateKey()) {
  if (!task) return false
  if ((task.skipDates || []).includes(date)) return false
  return taskScheduledOn(task, date)
}

export function tasksOnDate(date = localDateKey()) {
  return practice.tasks.filter((task) => taskOnDate(task, date))
}

export function assetDayKey(item) {
  if (item?.date) return String(item.date).slice(0, 10)
  if (item?.createdAt) return String(item.createdAt).slice(0, 10)
  return ''
}

function dayHasActivity(task, date, daysByTask) {
  const rec = daysByTask?.[task.id]?.[date]
  if ((rec?.count || 0) > 0) return true
  if (rec?.completedAt) return true
  if (rec?.subtasks && Object.values(rec.subtasks).some(Boolean)) return true
  if (practice.checkins.some((item) => item.taskId === task.id && item.date === date)) return true
  if (
    taskLogsImages(task) &&
    practice.helperImageBank.some((item) => item.taskId === task.id && assetDayKey(item) === date)
  ) {
    return true
  }
  return false
}

function sortCalendarTasks(a, b) {
  const ae = a.archived || a.paused ? 1 : 0
  const be = b.archived || b.paused ? 1 : 0
  if (ae !== be) return ae - be
  const ap = a.pinned ? 1 : 0
  const bp = b.pinned ? 1 : 0
  if (ap !== bp) return bp - ap
  if (ap && (a.pinnedAt || 0) !== (b.pinnedAt || 0)) return (b.pinnedAt || 0) - (a.pinnedAt || 0)
  return (a.order ?? 0) - (b.order ?? 0)
}

export function tasksForCalendarDate(date, daysByTask = {}) {
  if (date >= localDateKey()) {
    return practice.tasks.filter((task) => taskScheduledOn(task, date)).sort(sortCalendarTasks)
  }
  return practice.tasks
    .filter((task) => {
      if (dayHasActivity(task, date, daysByTask)) return true
      return !task.longTerm && (task.dueDate || '') === date
    })
    .sort(sortCalendarTasks)
}

export function streakFor(task, today = localDateKey(), daysByTask = {}) {
  if (!task?.longTerm || task.archived) return 0
  const recOf = (date) => {
    if (date === localDateKey()) return practice.todayByTask[task.id] || daysByTask?.[task.id]?.[date]
    return daysByTask?.[task.id]?.[date]
  }
  let cursor = dayComplete(task, recOf(today)) ? today : shiftDateKey(today, -1)
  let n = 0
  for (let i = 0; i < 366; i += 1) {
    if ((task.skipDates || []).includes(cursor) || !taskOnDate(task, cursor)) {
      cursor = shiftDateKey(cursor, -1)
      continue
    }
    if (dayComplete(task, recOf(cursor))) {
      n += 1
      cursor = shiftDateKey(cursor, -1)
      continue
    }
    break
  }
  return n
}

export async function assertMutableDay(date) {
  await ensureToday()
  const today = localDateKey()
  const target = date == null || date === '' ? today : date
  if (target === today) return true
  toast(target > today ? '还没到这一天，不能打卡。' : '过去日期不能补打卡。')
  return false
}

function clonePlain(value) {
  return JSON.parse(JSON.stringify(value))
}

async function saveTasks() {
  practice.tasksUpdatedAt = new Date().toISOString()
  await db.kvSet('tasks', clonePlain(practice.tasks))
  await db.kvSet('tasksUpdatedAt', practice.tasksUpdatedAt)
  notifyCloud()
}

export function normalizeTask(task) {
  let completion = task.completion || 'check'
  let components = Array.isArray(task.components) ? task.components.filter(Boolean) : null
  if (components == null) {
    components = []
    if (completion === 'counter') components.push('counter')
    const sheet = typeof task.sheet === 'boolean' ? task.sheet : completion === 'counter'
    const notes = typeof task.notes === 'boolean' ? task.notes : completion === 'counter'
    if (sheet) components.push('sheet')
    if (notes) components.push('notes')
  }
  components = components.filter((id) => id && id !== 'check')
  const hadCounter = components.includes('counter')
  if (hadCounter && completion === 'check') completion = 'counter'
  if (completion === 'counter' && !hadCounter) completion = 'check'
  const componentSet = new Set(components.filter((id) => id !== 'counter'))
  if (completion === 'counter') componentSet.add('counter')
  let target = task.target
  if (completion === 'counter') {
    const n = Math.round(Number(target))
    target = Number.isFinite(n) && n >= 1 && n <= 999 ? n : 10
  }
  const repeatWeekdays = [...new Set(Array.isArray(task.repeatWeekdays) ? task.repeatWeekdays : [])]
    .map((item) => Math.round(Number(item)))
    .filter((item) => item >= 1 && item <= 7)
  const skipDates = [...new Set(Array.isArray(task.skipDates) ? task.skipDates : [])].filter((item) =>
    /^\d{4}-\d{2}-\d{2}$/.test(String(item)),
  )
  const pieces = normalizePieces(task.pieces)
  let currentPieceId = String(task.currentPieceId || '')
  if (currentPieceId && !pieces.some((item) => item.id === currentPieceId)) currentPieceId = ''
  return {
    ...task,
    completion,
    target,
    sheet: componentSet.has('sheet'),
    notes: componentSet.has('notes'),
    components: [...componentSet],
    dueDate: task.dueDate || localDateKey(),
    longTerm: 'longTerm' in task ? Boolean(task.longTerm) : !task.dueDate,
    repeatWeekdays,
    skipDates,
    pieces,
    currentPieceId,
    archived: Boolean(task.archived),
    paused: Boolean(task.paused),
    subtasks: Array.isArray(task.subtasks)
      ? task.subtasks
          .map((item) => ({
            id: item.id || uid('s'),
            title: String(item.title || '').trim(),
          }))
          .filter((item) => item.title)
      : [],
    pinned: Boolean(task.pinned),
    pinnedAt: Number(task.pinnedAt) || 0,
    order: Number.isFinite(task.order) ? task.order : 0,
    updatedAt: task.updatedAt || '',
  }
}

export async function applyMergedTasks(list, stamp) {
  practice.tasks = (Array.isArray(list) ? list : []).map(normalizeTask)
  sortTasksInPlace()
  practice.task =
    practice.tasks.find((item) => item.id === practice.task?.id) ||
    practice.tasks[0] ||
    practice.task
  practice.tasksUpdatedAt = stamp || practice.tasksUpdatedAt || ''
  await db.kvSet('tasks', clonePlain(practice.tasks))
  await db.kvSet('tasksUpdatedAt', practice.tasksUpdatedAt)
}

function sortTasksInPlace() {
  practice.tasks.sort((a, b) => {
    const ap = a.pinned ? 1 : 0
    const bp = b.pinned ? 1 : 0
    if (ap !== bp) return bp - ap
    if (ap && (a.pinnedAt || 0) !== (b.pinnedAt || 0)) return (b.pinnedAt || 0) - (a.pinnedAt || 0)
    return (a.order ?? 0) - (b.order ?? 0)
  })
}

function defaultTasks(guitar, drawing) {
  return [
    {
      id: TASK_ID,
      title: guitar?.title || '练习吉他',
      color: '#e2a23a',
      completion: 'counter',
      target: guitar?.target || 10,
      sheet: true,
      notes: true,
      components: DEFAULT_RICH_COMPONENTS,
      dueDate: localDateKey(),
      longTerm: true,
      repeatWeekdays: [],
      order: 0,
    },
    {
      id: DRAW_ID,
      title: drawing?.title || '画画',
      color: '#7da9c7',
      completion: 'photo-log',
      sheet: false,
      notes: true,
      components: ['annotation', 'notes'],
      dueDate: localDateKey(),
      longTerm: true,
      repeatWeekdays: [],
      order: 1,
    },
  ]
}

async function migrateLocalData() {
  const version = (await db.kvGet('schemaVersion')) || 0
  if (version >= 3) return
  const tasks = await db.kvGet('tasks')
  if (!Array.isArray(tasks)) {
    await db.kvSet('schemaVersion', 3)
    return
  }
  const normalized = tasks.map(normalizeTask)
  await db.kvSet('tasks', clonePlain(normalized))
  await db.kvSet('schemaVersion', 3)
}

async function loadTasks() {
  await migrateLocalData()
  let tasks = await db.kvGet('tasks')
  if (!Array.isArray(tasks)) {
    const guitar = await db.kvGet(`task.${TASK_ID}`)
    const drawing = await db.kvGet(`task.${DRAW_ID}`)
    tasks = guitar || drawing ? defaultTasks(guitar, drawing) : []
    await db.kvSet('tasks', clonePlain(tasks))
  }
  const normalized = tasks.map(normalizeTask)
  practice.tasks = normalized
  sortTasksInPlace()
  practice.task = practice.tasks.find((item) => item.id === practice.task?.id) || practice.tasks[0] || practice.task
  practice.tasksUpdatedAt = (await db.kvGet('tasksUpdatedAt')) || ''
  if (JSON.stringify(normalized) !== JSON.stringify(tasks)) {
    await db.kvSet('tasks', clonePlain(normalized))
  }
}

export async function openTask(id) {
  const task = practice.tasks.find((item) => item.id === id)
  if (!task) return false
  practice.task = task
  await loadToday()
  await loadAssets()
  return true
}

export async function addTask({
  title,
  color,
  completion,
  target,
  reminder,
  sheet,
  notes,
  components,
  subtasks,
  dueDate,
  longTerm,
  repeatWeekdays,
  paused,
  template,
}) {
  const name = String(title || '').trim()
  if (!name) {
    toast('先写任务名称')
    return null
  }
  const used = new Set(practice.tasks.map((item) => item.color))
  const nextColor = TASK_COLORS.find((c) => !used.has(c)) || color || TASK_COLORS[0]
  const task = normalizeTask({
    id: uid('t'),
    title: name,
    template: template || 'custom',
    color: color || nextColor,
    completion: completion || 'check',
    target,
    reminder: reminder || '',
    dueDate: dueDate || localDateKey(),
    longTerm: Boolean(longTerm),
    repeatWeekdays: Array.isArray(repeatWeekdays) ? repeatWeekdays : [],
    paused: Boolean(paused),
    archived: false,
    sheet: Boolean(sheet),
    notes: Boolean(notes),
    components: Array.isArray(components) ? components : [],
    subtasks: Array.isArray(subtasks) ? subtasks : [],
    pinned: false,
    pinnedAt: 0,
    order: practice.tasks.length,
  })
  stampTask(task)
  practice.tasks.push(task)
  try {
    await saveTasks()
  } catch (error) {
    const index = practice.tasks.findIndex((item) => item.id === task.id)
    if (index >= 0) practice.tasks.splice(index, 1)
    toast(quotaMessage(error))
    return null
  }
  await refreshTodayMap()
  return task
}

export async function updateTask(id, patch) {
  const task = practice.tasks.find((item) => item.id === id)
  if (!task) return false
  const snapshot = cloneTaskState(task)
  try {
    if (patch.title != null) {
      const name = String(patch.title).trim()
      if (!name) {
        Object.assign(task, snapshot)
        toast('名称不能为空')
        return false
      }
      task.title = name
    }
    if (patch.color) task.color = patch.color
    if ('template' in patch) task.template = patch.template || 'custom'
    if ('reminder' in patch) task.reminder = patch.reminder || ''
    if ('completion' in patch) task.completion = patch.completion || 'check'
    if ('sheet' in patch) task.sheet = Boolean(patch.sheet)
    if ('notes' in patch) task.notes = Boolean(patch.notes)
    if ('components' in patch) {
      task.components = [...new Set((patch.components || []).filter(Boolean))]
    }
    if ('dueDate' in patch) task.dueDate = patch.dueDate || localDateKey()
    if ('longTerm' in patch) task.longTerm = Boolean(patch.longTerm)
    if ('repeatWeekdays' in patch) {
      task.repeatWeekdays = [...new Set(Array.isArray(patch.repeatWeekdays) ? patch.repeatWeekdays : [])]
        .map((item) => Math.round(Number(item)))
        .filter((item) => item >= 1 && item <= 7)
    }
    if ('paused' in patch) task.paused = Boolean(patch.paused)
    if ('skipDates' in patch) {
      task.skipDates = [...new Set(Array.isArray(patch.skipDates) ? patch.skipDates : [])].filter((item) =>
        /^\d{4}-\d{2}-\d{2}$/.test(String(item)),
      )
    }
    if ('archived' in patch) task.archived = Boolean(patch.archived)
    if ('subtasks' in patch) {
      task.subtasks = Array.isArray(patch.subtasks)
        ? patch.subtasks
            .map((item) => ({
              id: item.id || uid('s'),
              title: String(item.title || '').trim(),
            }))
            .filter((item) => item.title)
        : []
    }
    if (patch.target != null && (task.completion === 'counter' || patch.completion === 'counter')) {
      const n = Math.round(Number(patch.target))
      if (!Number.isFinite(n) || n < 1 || n > 999) {
        Object.assign(task, snapshot)
        toast('目标遍数请填 1 到 999 的整数')
        return false
      }
      task.target = n
    }
    Object.assign(task, normalizeTask(task))
    stampTask(task)
    await saveTasks()
    return true
  } catch (error) {
    Object.assign(task, snapshot)
    toast(quotaMessage(error))
    return false
  }
}

export async function removeTask(id) {
  const index = practice.tasks.findIndex((item) => item.id === id)
  if (index < 0) return false
  practice.tasks[index].archived = true
  practice.tasks[index].pinned = false
  practice.tasks[index].pinnedAt = 0
  stampTask(practice.tasks[index])
  await saveTasks()
  if (practice.task.id === id) {
    practice.task = practice.tasks.find((item) => !item.archived && !item.paused) || practice.tasks[0] || practice.task
  }
  await refreshTodayMap()
  return true
}

export async function restoreTask(id) {
  const task = practice.tasks.find((item) => item.id === id)
  if (!task) return false
  task.archived = false
  task.paused = false
  stampTask(task)
  await saveTasks()
  await refreshTodayMap()
  return true
}

export async function skipTaskOnDate(id, date) {
  const task = practice.tasks.find((item) => item.id === id)
  if (!task || !task.longTerm) return false
  const today = localDateKey()
  if (!date || date < today) {
    toast('不能给过去补跳过')
    return false
  }
  const next = new Set(task.skipDates || [])
  next.add(date)
  task.skipDates = [...next].sort()
  stampTask(task)
  await saveTasks()
  return true
}

export async function unskipTaskOnDate(id, date) {
  const task = practice.tasks.find((item) => item.id === id)
  if (!task) return false
  task.skipDates = (task.skipDates || []).filter((item) => item !== date)
  stampTask(task)
  await saveTasks()
  return true
}

export async function pinTask(id) {
  const task = practice.tasks.find((item) => item.id === id)
  if (!task) return false
  if (task.pinned) {
    task.pinned = false
    task.pinnedAt = 0
  } else {
    task.pinned = true
    task.pinnedAt = Date.now()
  }
  stampTask(task)
  sortTasksInPlace()
  await saveTasks()
  return true
}

export async function refreshTodayMap() {
  const previousToday = practice.date
  const date = localDateKey()
  practice.date = date
  if (!practice.viewingDate || practice.viewingDate === previousToday) {
    practice.viewingDate = date
  }
  const map = {}
  for (const task of practice.tasks) {
    map[task.id] = await db.kvGet(`day.${task.id}.${date}`)
  }
  practice.todayByTask = map
}

export async function loadDaysByTask() {
  const next = {}
  await Promise.all(
    practice.tasks.map(async (task) => {
      const map = {}
      for (const day of await listDays(task.id)) map[day.date] = day
      next[task.id] = map
    }),
  )
  return next
}

export function taskDoneToday(task) {
  return dayComplete(task, practice.todayByTask[task.id])
}

export function subtaskDone(taskId, subtaskId) {
  return Boolean(practice.todayByTask[taskId]?.subtasks?.[subtaskId])
}

export async function toggleSubtask(taskId, subtaskId, date) {
  if (!(await assertMutableDay(date))) return false
  const today = localDateKey()
  const task = practice.tasks.find((item) => item.id === taskId)
  if (!task) return false
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : []
  const subtask = subtasks.find((item) => item.id === subtaskId)
  if (!subtask) return false
  const key = `day.${taskId}.${today}`
  const prev = (await db.kvGet(key)) || {}
  const doneMap = { ...(prev.subtasks || {}) }
  if (doneMap[subtaskId]) delete doneMap[subtaskId]
  else doneMap[subtaskId] = true
  const allDone = subtasks.length > 0 && subtasks.every((item) => doneMap[item.id])
  await db.kvSet(
    key,
    dayRecord(prev, {
      count: allDone ? 1 : 0,
      target: subtasks.length,
      completedAt: allDone ? prev.completedAt || new Date().toISOString() : null,
      subtasks: doneMap,
    }),
  )
  await refreshTodayMap()
  notifyCloud()
  return true
}

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
      subtasks: value?.subtasks || {},
      seconds: Math.max(0, Math.round(Number(value?.seconds) || 0)),
      byPiece: keepByPiece(value),
      updatedAt: value?.updatedAt || null,
    })
  }
  return days.sort((a, b) => a.date.localeCompare(b.date))
}

export async function loadToday() {
  await refreshTodayMap()
  const day = practice.todayByTask[practice.task.id]
  practice.count = day?.count || 0
  practice.completedAt = day?.completedAt || null
  practice.byPiece = keepByPiece(day)
  if (practice.task.completion === 'counter') syncCompleteFlag()
}

export async function ensureToday() {
  if (practice.date !== localDateKey()) await loadToday()
}

export async function loadAllHelperImages() {
  const rows = (await db.assetsAll()).filter((item) => item.role === 'helper-image')
  revokeList(practice.helperImageBank)
  practice.helperImageBank = rows.map(viewAsset)
  practice.helperImages = helperImagesForTask(practice.task.id)
}

export async function loadAssets() {
  const sheets = await db.assetsByRole(practice.task.id, 'sheet')
  const notes = await db.assetsByRole(practice.task.id, 'note')
  revokeList(practice.sheets)
  revokeList(practice.notes)
  practice.sheets = sheets.map(viewAsset)
  practice.notes = notes.map(viewAsset)
  await loadAllHelperImages()
  if (studio.sheetIndex >= practice.sheets.length) {
    studio.sheetIndex = Math.max(0, practice.sheets.length - 1)
  }
}

export function taskHasComponent(id) {
  const components = Array.isArray(practice.task.components) ? practice.task.components : []
  return components.includes(id)
}

export async function loadCheckins() {
  const rows = (await db.assetsAll()).filter((item) => item.role === 'checkin')
  revokeList(practice.checkins)
  practice.checkins = rows.map(viewAsset)
}

export async function loadJournals() {
  const kv = await db.kvGetAll()
  const texts = {}
  const stamps = {}
  for (const [key, value] of Object.entries(kv)) {
    if (!key.startsWith('journal.')) continue
    const date = key.slice(8)
    texts[date] = value?.text || ''
    stamps[date] = value?.updatedAt || ''
  }
  practice.journalTexts = texts
  practice.journalUpdatedAt = stamps
  const rows = (await db.assetsAll()).filter((item) => item.role === 'journal')
  revokeList(practice.journals)
  practice.journals = rows.map(viewAsset)
}

export async function loadTaskNotes() {
  const kv = await db.kvGetAll()
  const texts = {}
  const stamps = {}
  for (const [key, value] of Object.entries(kv)) {
    if (!key.startsWith('taskNote.')) continue
    const taskId = key.slice(9)
    texts[taskId] = value?.text || ''
    stamps[taskId] = value?.updatedAt || ''
  }
  practice.taskNotes = texts
  practice.taskNotesUpdatedAt = stamps
}

export async function saveTaskNote(taskId, text) {
  const clean = String(text || '')
  practice.taskNotes[taskId] = clean
  const key = `taskNote.${taskId}`
  const updatedAt = new Date().toISOString()
  practice.taskNotesUpdatedAt[taskId] = updatedAt
  if (!clean.trim()) {
    await db.kvSet(key, { text: '', updatedAt })
    notifyCloud()
    return
  }
  await db.kvSet(key, { text: clean, updatedAt })
  notifyCloud()
}

export function journalPhotosOn(date) {
  return practice.journals.filter((item) => item.date === date)
}

export function hasJournal(date) {
  if ((practice.journalTexts[date] || '').trim()) return true
  return practice.journals.some((item) => item.date === date)
}

async function saveJournalMeta(date) {
  const text = practice.journalTexts[date] || ''
  const photos = journalPhotosOn(date)
  const key = `journal.${date}`
  const updatedAt = new Date().toISOString()
  practice.journalUpdatedAt[date] = updatedAt
  if (!text.trim() && !photos.length) {
    await db.kvSet(key, { text: '', updatedAt })
    notifyCloud()
    return
  }
  await db.kvSet(key, { text, updatedAt })
  notifyCloud()
}

export async function saveJournalText(date, text) {
  if (date > localDateKey()) {
    toast('未来日期不能写日记')
    return false
  }
  practice.journalTexts[date] = text
  await saveJournalMeta(date)
  return true
}

export async function addJournalPhotos(fileList, date) {
  const today = localDateKey()
  const target = date == null || date === '' ? today : date
  if (target > today) {
    toast('未来日期不能写日记')
    return []
  }
  const files = [...fileList]
  if (!files.length) return []
  let order = practice.journals.reduce((max, item) => Math.max(max, item.order || 0), 0)
  const added = []
  for (const file of files) {
    try {
      const packed = await compressImage(file)
      order += 1
      await db.assetPut({
        id: uid('a'),
        taskId: 'journal',
        role: 'journal',
        date: target,
        name: packed.name,
        mime: packed.mime,
        width: packed.width,
        height: packed.height,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        order,
        blob: packed.blob,
        thumbBlob: packed.thumbBlob,
      })
      added.push(true)
    } catch (error) {
      if (error instanceof ImageError) toast(error.message)
      else toast(quotaMessage(error))
    }
  }
  await loadJournals()
  await saveJournalMeta(target)
  return added
}

export async function removeJournalPhoto(id) {
  const item = practice.journals.find((row) => row.id === id)
  await db.assetDelete(id)
  await db.rememberDeletedAsset(id)
  await loadJournals()
  if (item?.date) await saveJournalMeta(item.date)
  notifyCloud()
}

export function checkinsOn(date, taskId) {
  return practice.checkins.filter((item) => {
    if (item.date !== date) return false
    if (taskId && item.taskId !== taskId) return false
    return true
  })
}

export function checkinsForTask(taskId) {
  if (!taskId) return []
  return practice.checkins
    .filter((item) => item.taskId === taskId)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || b.order - a.order)
}

export function helperImagesForTask(taskId) {
  if (!taskId) return []
  return practice.helperImageBank
    .filter((item) => item.taskId === taskId)
    .sort(
      (a, b) =>
        String(b.date || b.createdAt || '').localeCompare(String(a.date || a.createdAt || '')) ||
        (b.order || 0) - (a.order || 0),
    )
}

export function taskLogsImages(task) {
  if (!task) return false
  const components = Array.isArray(task.components) ? task.components : []
  if (!components.includes('images')) return false
  if (task.completion === 'photo-log') return false
  return task.completion === 'counter'
}

export function galleryPhotosForTask(taskId) {
  const checkins = checkinsForTask(taskId)
  const task = practice.tasks.find((item) => item.id === taskId)
  if (!taskLogsImages(task)) return checkins
  const seen = new Set(checkins.map((item) => item.id))
  const extras = helperImagesForTask(taskId).filter((item) => !seen.has(item.id))
  return [...checkins, ...extras].sort(
    (a, b) =>
      String(b.date || b.createdAt || '').localeCompare(String(a.date || a.createdAt || '')) ||
      (b.order || 0) - (a.order || 0),
  )
}

export function taskHasGallery(task) {
  if (!task) return false
  if (task.completion === 'photo-log' || taskLogsImages(task)) return true
  return checkinsForTask(task.id).length > 0
}

export function galleryListItem(task) {
  if (!task) return false
  const photos = galleryPhotosForTask(task.id)
  if (photos.length > 0) return true
  if (task.archived || task.paused) return false
  return task.completion === 'photo-log' || taskLogsImages(task)
}

export async function toggleFeaturedCheckin(id) {
  const item = await db.assetGet(id)
  if (!item || item.role !== 'checkin') return false
  await db.assetPut({
    ...item,
    featured: !item.featured,
    updatedAt: new Date().toISOString(),
  })
  await loadCheckins()
  notifyCloud()
  return true
}

async function syncPhotoDay(taskId, date) {
  const n = practice.checkins.filter((item) => item.taskId === taskId && item.date === date).length
  const key = `day.${taskId}.${date}`
  const prev = (await db.kvGet(key)) || {}
  if (n <= 0) {
    await db.kvSet(
      key,
      dayRecord(prev, {
        count: 0,
        target: prev.target ?? null,
        completedAt: null,
      }),
    )
  } else {
    await db.kvSet(
      key,
      dayRecord(prev, {
        count: n,
        completedAt: prev.completedAt || new Date().toISOString(),
      }),
    )
  }
  if (practice.task.id === taskId && date === practice.date) {
    practice.count = n
    practice.completedAt = n > 0 ? practice.completedAt || new Date().toISOString() : null
    if (n <= 0) practice.completedAt = null
  }
  await refreshTodayMap()
  notifyCloud()
}

async function adjustTaskCount(taskId, delta) {
  await ensureToday()
  const today = localDateKey()
  const task = practice.tasks.find((item) => item.id === taskId)
  const key = `day.${taskId}.${today}`
  const prev = (await db.kvGet(key)) || {}
  const count = Math.max(0, Math.round(Number(prev.count) || 0) + delta)
  const target = Math.round(Number(prev.target || task?.target || 10)) || 10
  const completedAt =
    task?.completion === 'counter'
      ? count >= target
        ? prev.completedAt || new Date().toISOString()
        : null
      : prev.completedAt || null
  await db.kvSet(
    key,
    dayRecord(prev, {
      count,
      target: task?.completion === 'counter' ? target : prev.target ?? null,
      completedAt,
    }),
  )
  if (practice.task.id === taskId) {
    practice.count = count
    practice.completedAt = completedAt
  }
  await refreshTodayMap()
  notifyCloud()
  return { count, target }
}

export async function addCheckins(fileList, date, taskId) {
  if (!(await assertMutableDay(date))) return []
  const today = localDateKey()
  const targetTask = taskId == null || taskId === '' ? practice.task.id : taskId
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
        taskId: targetTask,
        role: 'checkin',
        date: today,
        name: packed.name,
        mime: packed.mime,
        width: packed.width,
        height: packed.height,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        order,
        featured: false,
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
  const task = practice.tasks.find((item) => item.id === targetTask)
  if (taskLogsImages(task) && added.length) {
    const result = await adjustTaskCount(targetTask, added.length)
    toast(`已记下，今日 ${result.count}/${result.target}`)
  } else if (!taskLogsImages(task)) {
    await syncPhotoDay(targetTask, today)
  }
  return added
}

export async function addHelperImages(fileList, taskId) {
  return addFiles('helper-image', fileList, taskId)
}

export async function removeCheckin(id) {
  const item = practice.checkins.find((row) => row.id === id)
  await ensureToday()
  if (item?.date && item.date !== localDateKey()) {
    toast('只能改今天的打卡图。')
    return false
  }
  await db.assetDelete(id)
  await db.rememberDeletedAsset(id)
  await loadCheckins()
  if (item?.date && item?.taskId) {
    const task = practice.tasks.find((row) => row.id === item.taskId)
    if (taskLogsImages(task)) await adjustTaskCount(item.taskId, -1)
    else await syncPhotoDay(item.taskId, item.date)
  }
  notifyCloud()
  return true
}

export async function bootPractice() {
  try {
    await db.openDb()
    await loadTasks()
    await loadToday()
    await loadAssets()
    await loadCheckins()
    await loadJournals()
    await loadTaskNotes()
    practice.lastBackupAt = (await db.kvGet('lastBackupAt')) || ''
  } catch (error) {
    console.error(error)
    toast('本地数据打开失败，刷新试试')
  } finally {
    practice.ready = true
  }
}

export async function bump(delta) {
  // 无 date 参数：先切到本地今天，再写 day.{task}.{today}
  await ensureToday()
  const pieces = Array.isArray(practice.task.pieces) ? practice.task.pieces : []
  const pieceId = String(practice.task.currentPieceId || '')
  if (pieces.length || pieceId) {
    const rec = practice.byPiece[pieceId] || {
      count: 0,
      target: currentPieceOf(practice.task)?.target || practice.task.target || 10,
    }
    if (delta < 0 && rec.count <= 0) return
    rec.count = Math.max(0, rec.count + delta)
    rec.target = currentPieceOf(practice.task)?.target || rec.target || practice.task.target || 10
    practice.byPiece = { ...keepByPiece({ byPiece: practice.byPiece }), [pieceId]: rec }
  }
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
  stampTask(practice.task)
  syncCompleteFlag()
  await saveTasks()
  await saveDay()
  return true
}

export async function toggleCheck() {
  // 无 date 参数：先切到本地今天，再写当天完成态
  await ensureToday()
  if (practice.completedAt) {
    practice.count = 0
    practice.completedAt = null
  } else {
    practice.count = 1
    practice.completedAt = new Date().toISOString()
  }
  await saveDay()
}

export async function toggleCheckOnDate(taskId, date) {
  if (!(await assertMutableDay(date))) return false
  const today = localDateKey()
  const task = practice.tasks.find((item) => item.id === taskId)
  if (!task || task.completion !== 'check') return false
  const key = `day.${taskId}.${today}`
  const prev = (await db.kvGet(key)) || {}
  const completed = Boolean(prev.completedAt) || prev.count > 0
  await db.kvSet(
    key,
    dayRecord(prev, {
      count: completed ? 0 : 1,
      target: null,
      completedAt: completed ? null : new Date().toISOString(),
    }),
  )
  await refreshTodayMap()
  notifyCloud()
  return true
}

export async function addFiles(role, fileList, taskId) {
  const id = taskId || practice.task.id
  const files = [...fileList]
  if (!files.length) return []
  const existing =
    role === 'sheet' ? practice.sheets : role === 'note' ? practice.notes : practice.helperImages
  let order = existing.reduce((max, item) => Math.max(max, item.order || 0), 0)
  const added = []
  const owner = practice.tasks.find((item) => item.id === id) || practice.task

  for (const file of files) {
    try {
      const packed = await compressImage(file)
      order += 1
      const now = new Date().toISOString()
      const asset = {
        id: uid('a'),
        taskId: id,
        role,
        name: packed.name,
        mime: packed.mime,
        width: packed.width,
        height: packed.height,
        createdAt: now,
        updatedAt: now,
        order,
        pieceId: role === 'sheet' ? String(owner?.currentPieceId || '') : '',
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
  if (added.length) notifyCloud()
  return added
}

export async function removeAsset(id) {
  await db.assetDelete(id)
  await db.rememberDeletedAsset(id)
  await loadAssets()
  notifyCloud()
}

export async function reloadAll() {
  await loadTasks()
  await loadToday()
  await loadAssets()
  await loadCheckins()
  await loadJournals()
  await loadTaskNotes()
  practice.lastBackupAt = (await db.kvGet('lastBackupAt')) || ''
}

export async function setCurrentPiece(pieceId) {
  const task = practice.tasks.find((item) => item.id === practice.task.id)
  if (!task) return false
  const id = String(pieceId || '')
  if (id && !(task.pieces || []).some((item) => item.id === id)) return false
  task.currentPieceId = id
  Object.assign(task, normalizeTask(task))
  practice.task = task
  stampTask(task)
  await saveTasks()
  return true
}

export async function addPiece(title, target) {
  const task = practice.tasks.find((item) => item.id === practice.task.id)
  if (!task) return null
  const pieces = Array.isArray(task.pieces) ? task.pieces : []
  const name = String(title || '').trim() || `第${pieces.length + 1}首`
  const n = Math.round(Number(target ?? task.target ?? 10))
  const piece = {
    id: uid('p'),
    title: name,
    target: Number.isFinite(n) && n >= 1 && n <= 999 ? n : 10,
  }
  task.pieces = [...pieces, piece]
  task.currentPieceId = piece.id
  Object.assign(task, normalizeTask(task))
  practice.task = task
  stampTask(task)
  await saveTasks()
  return piece
}

export async function assignSheetPiece(assetId, pieceId) {
  const item = await db.assetGet(assetId)
  if (!item || item.role !== 'sheet') return false
  await db.assetPut({
    ...item,
    pieceId: String(pieceId || ''),
    updatedAt: new Date().toISOString(),
  })
  await loadAssets()
  notifyCloud()
  return true
}
