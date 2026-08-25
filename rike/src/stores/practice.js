import { computed, reactive } from 'vue'
import * as db from '../db'
import { localDateKey, uid, weekdayOf } from '../utils/date'
import { compressImage, ImageError } from '../utils/image'
import { toast } from './ui'

export const TASK_ID = 'guitar'
export const DRAW_ID = 'drawing'

export const TASK_COMPONENTS = [
  { id: 'counter', title: '计数器' },
  { id: 'pomodoro', title: '番茄钟' },
  { id: 'images', title: '插入图片' },
  { id: 'annotation', title: '批注' },
  { id: 'sheet', title: '曲谱' },
  { id: 'notes', title: '笔记' },
]

export const DEFAULT_RICH_COMPONENTS = ['counter', 'pomodoro', 'images', 'annotation', 'sheet', 'notes']

export const TASK_TEMPLATES = [
  {
    id: 'instrument',
    title: '乐器练习',
    defaultTitle: '练习乐器',
    color: '#e2a23a',
    completion: 'counter',
    sheet: true,
    notes: true,
    components: ['counter', 'pomodoro', 'sheet', 'annotation', 'notes'],
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
    components: ['images', 'annotation', 'notes'],
    summary: '图片打卡、作品图片、批注、日记',
  },
  {
    id: 'study',
    title: '学习 / 备考',
    defaultTitle: '学习',
    color: '#8fbf88',
    completion: 'counter',
    sheet: false,
    notes: true,
    components: ['pomodoro', 'notes'],
    summary: '番茄钟、笔记、可添加子任务',
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
    components: ['check', 'notes'],
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
    components: ['check'],
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

function notifyCloud() {
  try {
    cloudHook()
  } catch {
    /* ignore */
  }
}

async function saveDay() {
  const key = `day.${practice.task.id}.${practice.date}`
  await db.kvSet(key, {
    count: practice.count,
    target: practice.task.target || null,
    completedAt: practice.completedAt,
    updatedAt: new Date().toISOString(),
  })
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

export function taskTodayLine(task) {
  const rec = practice.todayByTask[task.id]
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : []
  if (subtasks.length) {
    const doneCount = subtasks.filter((item) => rec?.subtasks?.[item.id]).length
    if (doneCount === subtasks.length) return `今日已完成 · ${doneCount}/${subtasks.length}`
    if (doneCount > 0) return `今日 ${doneCount}/${subtasks.length}`
    return '今日未完成'
  }
  if (task.completion === 'counter') {
    const count = rec?.count || 0
    const target = task.target || 10
    if (count >= target) return `今日已完成 · ${count}/${target}`
    if (count > 0) return `今日 ${count}/${target}`
    return '今日未完成'
  }
  if (task.completion === 'photo-log') {
    const n = rec?.count || 0
    return n ? `今日已打卡 · ${n} 张` : '今日未打卡'
  }
  return rec?.completedAt || rec?.count ? '今日已完成' : '今日未完成'
}

export function taskOnDate(task, date = localDateKey()) {
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
  if (date >= localDateKey()) return tasksOnDate(date)
  return practice.tasks
    .filter((task) => {
      if (dayHasActivity(task, date, daysByTask)) return true
      return !task.longTerm && (task.dueDate || '') === date
    })
    .sort(sortCalendarTasks)
}

export async function assertMutableDay(date) {
  await ensureToday()
  const today = localDateKey()
  const target = date == null || date === '' ? today : date
  if (target === today) return true
  toast(target > today ? '还没到这一天，不能打卡。' : '过去日期不能补打卡。')
  return false
}

async function saveTasks() {
  practice.tasksUpdatedAt = new Date().toISOString()
  await db.kvSet('tasks', practice.tasks.map((item) => ({ ...item })))
  await db.kvSet('tasksUpdatedAt', practice.tasksUpdatedAt)
  notifyCloud()
}

export function normalizeTask(task) {
  const sheet = typeof task.sheet === 'boolean' ? task.sheet : task.completion === 'counter'
  const notes = typeof task.notes === 'boolean' ? task.notes : task.completion === 'counter'
  let components = Array.isArray(task.components) ? task.components.filter(Boolean) : null
  if (task.completion === 'counter' && !components) {
    components = ['counter']
    if (sheet) components.push('sheet')
    if (notes) components.push('notes')
  }
  const componentSet = new Set(components || [])
  const repeatWeekdays = [...new Set(Array.isArray(task.repeatWeekdays) ? task.repeatWeekdays : [])]
    .map((item) => Math.round(Number(item)))
    .filter((item) => item >= 1 && item <= 7)
  return {
    ...task,
    sheet: task.completion === 'counter' ? componentSet.has('sheet') : false,
    notes: task.completion === 'counter' ? componentSet.has('notes') : false,
    components: [...componentSet],
    dueDate: task.dueDate || localDateKey(),
    longTerm: 'longTerm' in task ? Boolean(task.longTerm) : !task.dueDate,
    repeatWeekdays,
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
  }
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
      notes: false,
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
  await db.kvSet('tasks', normalized)
  await db.kvSet('schemaVersion', 3)
}

async function loadTasks() {
  await migrateLocalData()
  let tasks = await db.kvGet('tasks')
  if (!Array.isArray(tasks)) {
    const guitar = await db.kvGet(`task.${TASK_ID}`)
    const drawing = await db.kvGet(`task.${DRAW_ID}`)
    tasks = guitar || drawing ? defaultTasks(guitar, drawing) : []
    await db.kvSet('tasks', tasks)
  }
  const normalized = tasks.map(normalizeTask)
  practice.tasks = normalized
  sortTasksInPlace()
  practice.task = practice.tasks.find((item) => item.id === practice.task?.id) || practice.tasks[0] || practice.task
  practice.tasksUpdatedAt = (await db.kvGet('tasksUpdatedAt')) || ''
  if (JSON.stringify(normalized) !== JSON.stringify(tasks)) {
    await db.kvSet('tasks', normalized)
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
  const task = {
    id: uid('t'),
    title: name,
    template: template || 'custom',
    color: color || nextColor,
    completion: completion || 'check',
    target: completion === 'counter' ? target || 10 : undefined,
    reminder: reminder || '',
    dueDate: dueDate || localDateKey(),
    longTerm: Boolean(longTerm),
    repeatWeekdays: [...new Set(Array.isArray(repeatWeekdays) ? repeatWeekdays : [])]
      .map((item) => Math.round(Number(item)))
      .filter((item) => item >= 1 && item <= 7),
    paused: Boolean(paused),
    archived: false,
    sheet: Boolean(sheet),
    notes: Boolean(notes),
    components: [...new Set(components || [])],
    subtasks: Array.isArray(subtasks)
      ? subtasks
          .map((item) => ({
            id: item.id || uid('s'),
            title: String(item.title || '').trim(),
          }))
          .filter((item) => item.title)
      : [],
    pinned: false,
    pinnedAt: 0,
    order: practice.tasks.length,
  }
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
    if ('sheet' in patch) task.sheet = Boolean(patch.sheet)
    if ('notes' in patch) task.notes = Boolean(patch.notes)
    if ('components' in patch) {
      task.components = [...new Set((patch.components || []).filter(Boolean))]
      if (task.completion === 'counter') {
        task.sheet = task.components.includes('sheet')
        task.notes = task.components.includes('notes')
      }
    }
    if ('dueDate' in patch) task.dueDate = patch.dueDate || localDateKey()
    if ('longTerm' in patch) task.longTerm = Boolean(patch.longTerm)
    if ('repeatWeekdays' in patch) {
      task.repeatWeekdays = [...new Set(Array.isArray(patch.repeatWeekdays) ? patch.repeatWeekdays : [])]
        .map((item) => Math.round(Number(item)))
        .filter((item) => item >= 1 && item <= 7)
    }
    if ('paused' in patch) task.paused = Boolean(patch.paused)
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
    if (patch.target != null && task.completion === 'counter') {
      const n = Math.round(Number(patch.target))
      if (!Number.isFinite(n) || n < 1 || n > 999) {
        Object.assign(task, snapshot)
        toast('目标遍数请填 1 到 999 的整数')
        return false
      }
      task.target = n
    }
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
  await saveTasks()
  await refreshTodayMap()
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
  sortTasksInPlace()
  await saveTasks()
  return true
}

export async function refreshTodayMap() {
  const date = localDateKey()
  practice.date = date
  const map = {}
  for (const task of practice.tasks) {
    map[task.id] = await db.kvGet(`day.${task.id}.${date}`)
  }
  practice.todayByTask = map
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
  await db.kvSet(key, {
    count: allDone ? 1 : 0,
    target: subtasks.length,
    completedAt: allDone ? prev.completedAt || new Date().toISOString() : null,
    subtasks: doneMap,
    updatedAt: new Date().toISOString(),
  })
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
  await loadJournals()
  if (item?.date) await saveJournalMeta(item.date)
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
  if (task.sheet || components.includes('sheet')) return false
  return true
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
  return true
}

async function syncPhotoDay(taskId, date) {
  const n = practice.checkins.filter((item) => item.taskId === taskId && item.date === date).length
  const key = `day.${taskId}.${date}`
  if (n <= 0) {
    const prev = await db.kvGet(key)
    await db.kvSet(key, {
      count: 0,
      target: prev?.target ?? null,
      completedAt: null,
      subtasks: prev?.subtasks || {},
      updatedAt: new Date().toISOString(),
    })
    await refreshTodayMap()
    notifyCloud()
    return
  }
  const prev = await db.kvGet(key)
  await db.kvSet(key, {
    count: n,
    completedAt: prev?.completedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  await refreshTodayMap()
  notifyCloud()
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
  await syncPhotoDay(targetTask, today)
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
  await loadCheckins()
  if (item?.date && item?.taskId) await syncPhotoDay(item.taskId, item.date)
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
  await db.kvSet(key, {
    count: completed ? 0 : 1,
    target: null,
    completedAt: completed ? null : new Date().toISOString(),
    subtasks: prev.subtasks || {},
    updatedAt: new Date().toISOString(),
  })
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

  for (const file of files) {
    try {
      const packed = await compressImage(file)
      order += 1
      const asset = {
        id: uid('a'),
        taskId: id,
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
  await loadTasks()
  await loadToday()
  await loadAssets()
  await loadCheckins()
  await loadJournals()
  await loadTaskNotes()
}
