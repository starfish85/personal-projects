<script setup>
import { computed, onActivated, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  COMPLETION_MODES,
  TASK_COMPONENTS,
  TASK_COLORS,
  TASK_TEMPLATES,
  addTask,
  dayComplete,
  ensureToday,
  pieceProgress,
  hasJournal,
  loadDaysByTask,
  openTask,
  pinTask,
  practice,
  streakFor,
  quotaMessage,
  removeTask,
  restoreTask,
  subtaskDone,
  taskLineOnDate,
  taskTodayLine,
  taskDoneToday,
  taskOnDate,
  tasksForCalendarDate,
  tasksOnDate,
  toggleCheck,
  toggleSubtask,
  updateTask,
} from '../stores/practice'
import MonthCal from '../components/MonthCal.vue'
import SyncBar from '../components/SyncBar.vue'
import TimePicker from '../components/TimePicker.vue'
import { cloud } from '../stores/sync'
import { clearToast, confirmDialog, toast } from '../stores/ui'
import {
  backupFileName,
  backupNagNeeded,
  dismissBackupNag,
  exportAndDownload,
  importBackup,
} from '../utils/backup'
import {
  dateMode,
  formatCoverDate,
  formatDayTitle,
  formatPracticeTime,
  localDateKey,
  shiftDateKey,
} from '../utils/date'
import { ensureNotifyPermission } from '../utils/remind'

defineOptions({ name: 'Home' })

const ACTION_W = 192
const router = useRouter()
const route = useRoute()
const editor = ref(null)
const editorStep = ref('details')
const archiveOpen = ref(false)
const timeOpen = ref(false)
const openId = ref(null)
const expandedId = ref(null)
const saving = ref(false)
const fromCalendarDate = ref('')
const fromHomeDate = ref('')
const backupNag = ref(false)
const backupBusy = ref(false)
const importRef = ref(null)
const pickerOpen = ref(false)
const pickerDraft = ref('')
const dueCalOpen = ref(false)
const daysByTask = ref({})
const pageRef = ref(null)

const todayKey = computed(() => localDateKey())
const viewingDate = computed(() => practice.viewingDate || todayKey.value)
const viewMode = computed(() => dateMode(viewingDate.value, todayKey.value))
const yesterdayKey = computed(() => shiftDateKey(todayKey.value, -1))
const tomorrowKey = computed(() => shiftDateKey(todayKey.value, 1))
const pickerTitle = computed(() => formatDayTitle(pickerDraft.value || viewingDate.value))
const WEEKDAYS = [
  { value: 1, label: '一' },
  { value: 2, label: '二' },
  { value: 3, label: '三' },
  { value: 4, label: '四' },
  { value: 5, label: '五' },
  { value: 6, label: '六' },
  { value: 7, label: '日' },
]
const form = reactive({
  title: '',
  color: TASK_COLORS[0],
  completion: 'check',
  target: 10,
  reminder: '',
  sheet: false,
  notes: false,
  template: 'custom',
  components: [],
  subtasks: [],
  dueDate: localDateKey(),
  longTerm: false,
  repeatWeekdays: [],
  paused: false,
})
const drag = reactive({
  id: null,
  startX: 0,
  startY: 0,
  x: 0,
  axis: null,
  tracking: false,
})
let skipClick = false

function helperIds(list) {
  return [...(list || [])]
    .filter((id) => id && id !== 'check' && id !== 'counter')
    .sort()
    .join(',')
}

function applyTemplate(item) {
  const prev = TASK_TEMPLATES.find((t) => t.id === form.template)
  const keepCompletion = Boolean(prev && form.completion !== prev.completion)
  const keepComponents = Boolean(prev && helperIds(form.components) !== helperIds(prev.components))
  form.template = item.id
  if (!keepCompletion) {
    form.completion = item.completion
    if (item.completion === 'counter') form.target = 10
  }
  if (!keepComponents) {
    form.components = (item.components || []).filter((id) => id !== 'check' && id !== 'counter')
    form.sheet = form.components.includes('sheet')
    form.notes = form.components.includes('notes')
  }
  form.subtasks = []
  form.color = item.color || form.color
  form.longTerm = Boolean(item.longTerm)
  form.repeatWeekdays = []
  if (!form.title || TASK_TEMPLATES.some((t) => t.defaultTitle === form.title || t.title === form.title)) {
    form.title = item.defaultTitle || ''
  }
}

function chooseTemplate(item) {
  applyTemplate(item)
  editorStep.value = 'details'
}

function openAdd() {
  closeSwipe()
  form.title = ''
  form.reminder = ''
  const date = String(
    route.query.date || (viewMode.value === 'future' ? viewingDate.value : localDateKey()),
  )
  form.dueDate = date
  fromCalendarDate.value = route.query.from === 'calendar' ? date : ''
  fromHomeDate.value = !fromCalendarDate.value && viewMode.value === 'future' ? date : ''
  form.longTerm = false
  form.repeatWeekdays = []
  form.paused = false
  form.completion = 'check'
  form.target = 10
  form.components = []
  form.sheet = false
  form.notes = false
  form.template = 'custom'
  form.subtasks = []
  applyTemplate(TASK_TEMPLATES.find((item) => item.id === 'custom') || TASK_TEMPLATES[0])
  form.color = TASK_COLORS.find((c) => !practice.tasks.some((t) => t.color === c)) || form.color
  editorStep.value = 'template'
  editor.value = { mode: 'add' }
  dueCalOpen.value = false
}

function openEdit(task) {
  closeSwipe()
  form.title = task.title
  form.color = task.color
  form.completion = task.completion
  form.target = task.target || 10
  form.reminder = task.reminder || ''
  form.sheet = Boolean(task.sheet)
  form.notes = Boolean(task.notes)
  form.components = Array.isArray(task.components)
    ? task.components.filter((id) => id !== 'check' && id !== 'counter')
    : []
  form.subtasks = Array.isArray(task.subtasks) ? task.subtasks.map((item) => ({ ...item })) : []
  form.dueDate = task.dueDate || localDateKey()
  form.longTerm = Boolean(task.longTerm)
  form.repeatWeekdays = Array.isArray(task.repeatWeekdays) ? [...task.repeatWeekdays] : []
  form.paused = Boolean(task.paused)
  fromCalendarDate.value = route.query.from === 'calendar' ? String(route.query.date || task.dueDate || '') : ''
  fromHomeDate.value = ''
  form.template =
    TASK_TEMPLATES.find((item) => item.id === task.template)?.id ||
    TASK_TEMPLATES.find((item) => item.completion === task.completion)?.id ||
    'custom'
  editorStep.value = 'details'
  editor.value = { mode: 'edit', id: task.id }
  dueCalOpen.value = false
}

function addSubtaskField() {
  form.subtasks.push({ id: '', title: '' })
}

function removeSubtaskField(index) {
  form.subtasks.splice(index, 1)
}

function cleanSubtasks() {
  return form.subtasks
    .map((item) => ({ id: item.id, title: String(item.title || '').trim() }))
    .filter((item) => item.title)
}

function hasComponent(id) {
  return form.components.includes(id)
}

function toggleComponent(id) {
  const next = new Set(form.components)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  form.components = [...next]
  form.sheet = next.has('sheet')
  form.notes = next.has('notes')
}

function setCompletion(kind) {
  form.completion = kind
  if (kind === 'counter') {
    const n = Math.round(Number(form.target))
    if (!Number.isFinite(n) || n < 1) form.target = 10
  }
}

function componentsFromForm() {
  const ids = form.components.filter((id) => id !== 'check' && id !== 'counter')
  if (form.completion === 'counter') ids.unshift('counter')
  return [...new Set(ids)]
}

function repeatOn(day) {
  return form.repeatWeekdays.includes(day)
}

function toggleRepeat(day) {
  const next = new Set(form.repeatWeekdays)
  if (next.has(day)) next.delete(day)
  else next.add(day)
  form.repeatWeekdays = [...next].sort((a, b) => a - b)
}

function setLongTerm(on) {
  const was = form.longTerm
  form.longTerm = on
  if (!on && was) form.repeatWeekdays = []
}

function finishClose({ calendarDate } = {}) {
  editor.value = null
  editorStep.value = 'details'
  dueCalOpen.value = false
  saving.value = false
  fromCalendarDate.value = ''
  fromHomeDate.value = ''
  expandedId.value = null
  if (calendarDate) {
    return router.replace({ path: '/calendar', query: { date: calendarDate } })
  }
}

function requestClose() {
  if (saving.value) return
  const calendarDate = fromCalendarDate.value
  return finishClose({ calendarDate })
}

function openAddFromRoute() {
  if (route.query.add === '1') {
    openAdd()
    router.replace('/')
  }
  if (route.query.edit) {
    const id = Array.isArray(route.query.edit) ? route.query.edit[0] : route.query.edit
    const task = practice.tasks.find((item) => item.id === id)
    if (task) openEdit(task)
    router.replace('/')
  }
}

function refreshBackupNag() {
  backupNag.value = Boolean(practice.ready) && !cloud.user && backupNagNeeded()
}

async function exportBackupNow() {
  if (backupBusy.value) return
  backupBusy.value = true
  try {
    const data = await exportAndDownload()
    toast(`已导出 ${backupFileName(data)}`)
    refreshBackupNag()
  } catch {
    toast('导出失败')
  } finally {
    backupBusy.value = false
  }
}

async function askImport() {
  if (backupBusy.value) return
  const ok = await confirmDialog({
    title: '导入备份？',
    copy: '会覆盖本机现有的遍数、图片、标注和笔记。',
    ok: '导入',
    danger: true,
  })
  if (ok) importRef.value?.click()
}

async function onImport(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  backupBusy.value = true
  try {
    await importBackup(file)
    toast('备份已导入')
    refreshBackupNag()
  } catch (error) {
    toast(error.message || '导入失败')
  } finally {
    backupBusy.value = false
  }
}

function skipBackupNag() {
  dismissBackupNag()
  backupNag.value = false
}

onMounted(async () => {
  await ensureToday()
  openAddFromRoute()
  refreshBackupNag()
  daysByTask.value = await loadDaysByTask()
})
onActivated(async () => {
  await ensureToday()
  refreshBackupNag()
  daysByTask.value = await loadDaysByTask()
})
watch(() => [route.query.add, route.query.edit], openAddFromRoute)
watch(() => [practice.ready, practice.lastBackupAt, cloud.user], refreshBackupNag)

function backToTemplate() {
  if (saving.value) return
  editorStep.value = 'template'
}

function savePayload() {
  return {
    title: form.title,
    color: form.color,
    reminder: form.reminder,
    template: form.template,
    completion: form.completion,
    target: form.completion === 'counter' ? Math.round(Number(form.target)) || 10 : form.target,
    sheet: form.sheet,
    notes: form.notes,
    components: componentsFromForm(),
    subtasks: cleanSubtasks(),
    dueDate: form.dueDate,
    longTerm: form.longTerm,
    repeatWeekdays: form.longTerm ? form.repeatWeekdays : [],
    paused: form.paused,
  }
}

async function saveEditor() {
  if (saving.value) return
  saving.value = true
  try {
    const calendarDate = fromCalendarDate.value
    const today = localDateKey()
    if (editor.value?.mode === 'add') {
      const task = await addTask(savePayload())
      if (!task) return
      if (form.reminder) await ensureNotifyPermission()
      const homeDate = fromHomeDate.value
      if (homeDate) {
        practice.viewingDate = task.dueDate || homeDate
        await finishClose()
        toast(`已安排到 ${task.dueDate || form.dueDate}`)
        return
      }
      const visibleToday = taskOnDate(task, today)
      const goCalendar = calendarDate || (!visibleToday ? task.dueDate : '')
      const message = goCalendar ? `已安排到 ${task.dueDate || form.dueDate}` : '任务已创建'
      await finishClose({ calendarDate: goCalendar || undefined })
      if (!goCalendar && pageRef.value) pageRef.value.scrollTop = 0
      toast(message)
      return
    }
    const ok = await updateTask(editor.value.id, savePayload())
    if (!ok) return
    if (form.reminder) await ensureNotifyPermission()
    const message = calendarDate ? `已更新到 ${form.dueDate}` : '任务已保存'
    await finishClose({ calendarDate: calendarDate || undefined })
    toast(message)
  } catch (error) {
    toast(quotaMessage(error))
  } finally {
    saving.value = false
  }
}

async function deleteCurrent() {
  if (saving.value) return
  const ok = await confirmDialog({
    title: '归档这个任务？',
    copy: '首页和日历里不再出现它。以前的记录和图片还在本机。',
    ok: '归档',
    danger: true,
  })
  if (!ok) return
  await removeTask(editor.value.id)
  finishClose()
}

function isDone(task) {
  if (viewMode.value !== 'today') return false
  return dayComplete(task, practice.todayByTask[task.id])
}

function sortVisible(a, b) {
  if (viewMode.value === 'today') {
    const ad = taskDoneToday(a) ? 1 : 0
    const bd = taskDoneToday(b) ? 1 : 0
    if (ad !== bd) return ad - bd
  }
  const ap = a.pinned ? 1 : 0
  const bp = b.pinned ? 1 : 0
  if (ap !== bp) return bp - ap
  if (ap && (a.pinnedAt || 0) !== (b.pinnedAt || 0)) return (b.pinnedAt || 0) - (a.pinnedAt || 0)
  return (a.order ?? 0) - (b.order ?? 0)
}

function visibleTasks() {
  const date = viewingDate.value
  if (viewMode.value === 'past') return tasksForCalendarDate(date, daysByTask.value)
  return [...tasksOnDate(date)].sort(sortVisible)
}

const cover = computed(() => formatCoverDate(viewingDate.value))

function remainingCount() {
  return visibleTasks().filter((task) => !isDone(task)).length
}

function remainingCopy() {
  const total = visibleTasks().length
  if (viewMode.value === 'past') return total ? '这天的记录' : '这天没有记录'
  if (viewMode.value === 'future') return total ? `已安排 ${total} 课` : '这天还没有安排'
  const left = remainingCount()
  if (!total) return '今天没有安排'
  if (left === 0) return '今日已课'
  return `还剩 ${left} 课`
}

function taskViewLine(task) {
  let line = ''
  if (viewMode.value === 'today') {
    line = `${taskTodayLine(task)}${task.reminder ? ` · ${task.reminder}` : ''}`
  } else if (viewMode.value === 'future') {
    line = '已安排'
  } else {
    const rec = daysByTask.value[task.id]?.[viewingDate.value]
    line = taskLineOnDate(task, viewingDate.value, rec)
  }
  const rec =
    viewMode.value === 'today'
      ? practice.todayByTask[task.id]
      : daysByTask.value[task.id]?.[viewingDate.value]
  const time = formatPracticeTime(rec?.seconds)
  if (time) line += ` · ${time}`
  if (viewMode.value === 'today' && task.longTerm) {
    const n = streakFor(task, todayKey.value, daysByTask.value)
    if (n >= 2) line += ` · 已连续 ${n} 天`
  }
  return line
}

function emptyCopy() {
  if (viewMode.value === 'future') return '这天还没有安排任务'
  if (viewMode.value === 'past') return '这天没有任务记录'
  return practice.tasks.length ? '今天没有安排的日课' : '今天还没有任务'
}

function modeHint() {
  if (viewMode.value === 'past') return '过去不能补打卡。下面是这天做了什么。'
  if (viewMode.value === 'future') return '还没到这一天。只能安排，不能打卡。'
  return ''
}

function journalPreview() {
  const text = (practice.journalTexts[viewingDate.value] || '').trim()
  if (text) return text.split('\n')[0]
  if (hasJournal(viewingDate.value)) return '有图片'
  return '未写'
}

function journalCta() {
  return hasJournal(viewingDate.value) ? '打开日记' : '写日记'
}

function openPicker() {
  pickerDraft.value = viewingDate.value
  pickerOpen.value = true
}

function closePicker() {
  pickerOpen.value = false
}

async function setViewingDate(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return
  clearToast()
  practice.viewingDate = dateKey
  pickerOpen.value = false
  closeSwipe()
  expandedId.value = null
  if (pageRef.value) pageRef.value.scrollTop = 0
  if (dateMode(dateKey) === 'past') daysByTask.value = await loadDaysByTask()
}

async function goToday() {
  await setViewingDate(todayKey.value)
}

function setDueDate(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return
  form.dueDate = dateKey
  dueCalOpen.value = false
}

function featuredTask() {
  const list = visibleTasks()
  if (!list.length) return null
  const open = list.filter((task) => !isDone(task))
  const pool = open.length ? open : list
  return pool.find((task) => task.pinned) || pool[0]
}

const featured = computed(() => featuredTask())

function restTasks() {
  return visibleTasks().filter((task) => task.id !== featured.value?.id)
}

function counterOf(task) {
  if (task.completion !== 'counter') return null
  if (viewMode.value === 'future') return { count: 0, target: task.target || 10 }
  const rec =
    viewMode.value === 'past'
      ? daysByTask.value[task.id]?.[viewingDate.value]
      : practice.todayByTask[task.id]
  const progress = pieceProgress(task, rec)
  return { count: progress.count, target: progress.target }
}

function featureKicker() {
  if (viewMode.value === 'past') return isDone(featured.value) ? '这天主课 · 已完成' : '这天主课'
  if (viewMode.value === 'future') return '将做'
  return isDone(featured.value) ? '今日主课 · 已完成' : '今日主课'
}

function featureCta(task) {
  if (!task) return '打开'
  if (viewMode.value === 'past') return hasSubtasks(task) ? '查看' : '只读'
  if (viewMode.value === 'future') return '还没到'
  if (isDone(task)) return '回看今天'
  if (task.completion === 'counter' && (task.sheet || task.components?.includes('sheet'))) {
    return '打开曲谱'
  }
  if (task.completion === 'counter') return '开始练习'
  if (task.completion === 'photo-log') return '去打卡'
  return '打开'
}

function openTaskFromHome(task) {
  if (!task) return
  if (viewMode.value === 'past') {
    if (hasSubtasks(task)) expandedId.value = expandedId.value === task.id ? null : task.id
    return
  }
  if (viewMode.value === 'future') {
    toast('还没到这一天，不能打卡。')
    return
  }
  router.push(`/task/${task.id}`)
}

function onFeatureClick(task) {
  if (consumeSkip()) return
  if (openId.value === task.id) {
    closeSwipe()
    return
  }
  if (openId.value) {
    closeSwipe()
    return
  }
  openTaskFromHome(task)
}

function archivedTasks() {
  return practice.tasks.filter((task) => task.archived)
}

function pausedTasks() {
  return practice.tasks.filter((task) => !task.archived && task.paused)
}

function managedTasks() {
  return [...pausedTasks(), ...archivedTasks()]
}

function hasSubtasks(task) {
  return Array.isArray(task.subtasks) && task.subtasks.length > 0
}

function closeSwipe() {
  openId.value = null
  drag.id = null
  drag.tracking = false
  drag.axis = null
  drag.x = 0
}

function offsetOf(id) {
  if (drag.tracking && drag.id === id) return drag.x
  return openId.value === id ? -ACTION_W : 0
}

function dragging(id) {
  return drag.tracking && drag.id === id && drag.axis === 'x'
}

function onDown(event, task) {
  if (viewMode.value === 'past') return
  if (event.pointerType === 'mouse' && event.button !== 0) return
  if (openId.value && openId.value !== task.id) openId.value = null
  drag.id = task.id
  drag.startX = event.clientX
  drag.startY = event.clientY
  drag.x = openId.value === task.id ? -ACTION_W : 0
  drag.axis = null
  drag.tracking = true
}

function onMove(event) {
  if (!drag.tracking || drag.id == null) return
  const dx = event.clientX - drag.startX
  const dy = event.clientY - drag.startY
  if (!drag.axis) {
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
    drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    if (drag.axis === 'x') event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  if (drag.axis !== 'x') return
  event.preventDefault()
  const base = openId.value === drag.id ? -ACTION_W : 0
  drag.x = Math.min(0, Math.max(-ACTION_W, base + dx))
}

function onUp() {
  if (!drag.tracking) return
  const id = drag.id
  const x = drag.x
  const axis = drag.axis
  const opened = openId.value === id ? -ACTION_W : 0
  drag.tracking = false
  drag.id = null
  drag.axis = null
  if (axis === 'x') {
    skipClick = Math.abs(x - opened) > 8
    openId.value = x < -ACTION_W * 0.4 ? id : null
    drag.x = openId.value === id ? -ACTION_W : 0
    return
  }
  skipClick = false
}

function consumeSkip() {
  if (!skipClick) return false
  skipClick = false
  return true
}

function onPageClick(event) {
  if (!event.target.closest('.swipe')) closeSwipe()
}

function onCardClick(task) {
  if (consumeSkip()) return
  if (openId.value === task.id) {
    closeSwipe()
    return
  }
  if (openId.value) {
    closeSwipe()
    return
  }
  openTaskFromHome(task)
}

async function quickCheck(task) {
  if (viewMode.value !== 'today') return
  if (consumeSkip()) return
  closeSwipe()
  await openTask(task.id)
  await toggleCheck()
}

async function deleteFromList(task) {
  closeSwipe()
  const ok = await confirmDialog({
    title: '归档这个任务？',
    copy: '首页和日历里不再出现它。以前的记录和图片还在本机。',
    ok: '归档',
    danger: true,
  })
  if (!ok) return
  await removeTask(task.id)
}

async function pinFromList(task) {
  closeSwipe()
  await pinTask(task.id)
}

async function restoreFromArchive(task) {
  await restoreTask(task.id)
  if (!managedTasks().length) archiveOpen.value = false
}

function pastSubDone(task, subtask) {
  if (viewMode.value === 'today') return subtaskDone(task.id, subtask.id)
  return Boolean(daysByTask.value[task.id]?.[viewingDate.value]?.subtasks?.[subtask.id])
}

async function toggleSub(task, subtask) {
  if (viewMode.value !== 'today') return
  closeSwipe()
  await toggleSubtask(task.id, subtask.id)
}
</script>

<template>
  <main ref="pageRef" class="page" @click="onPageClick" @scroll="closeSwipe">
    <header class="cover">
      <div class="cover-top">
        <p class="brand">日课</p>
        <div class="head-actions">
          <button v-if="viewMode !== 'today'" type="button" class="archive-btn" @click="goToday">
            回今天
          </button>
          <button
            v-if="managedTasks().length"
            type="button"
            class="archive-btn"
            @click="archiveOpen = true"
          >
            归档箱
          </button>
        </div>
      </div>
      <button
        type="button"
        class="cover-date"
        :class="{ away: viewMode !== 'today' }"
        :aria-label="`切换查看日期，当前 ${viewingDate}`"
        @click="openPicker"
      >
        <span class="cover-kicker">{{ cover.month }}</span>
        <span class="cover-day">{{ cover.day }}</span>
        <span class="cover-cap">{{ cover.weekday }} · {{ remainingCopy() }}</span>
      </button>
    </header>

    <article v-if="backupNag" class="backup-nag">
      <p>曲谱和打卡图还没备份，清微信缓存会丢。</p>
      <div>
        <button type="button" :disabled="backupBusy" @click="exportBackupNow">导出</button>
        <button type="button" :disabled="backupBusy" @click="askImport">导入</button>
        <button type="button" class="later" @click="skipBackupNag">稍后</button>
      </div>
    </article>

    <p v-if="modeHint()" class="mode-hint">{{ modeHint() }}</p>

    <section class="links">
      <p v-if="!visibleTasks().length" class="empty">{{ emptyCopy() }}</p>
      <div
        v-if="featured"
        class="swipe feature-swipe"
        :class="{ done: isDone(featured), expanded: expandedId === featured.id, open: openId === featured.id }"
        :style="{ '--task': featured.color }"
      >
        <div class="actions" aria-hidden="true">
          <button type="button" class="act edit" @click.stop="openEdit(featured)">修改</button>
          <button type="button" class="act del" @click.stop="deleteFromList(featured)">归档</button>
          <button type="button" class="act pin" @click.stop="pinFromList(featured)">
            {{ featured.pinned ? '取消' : '置顶' }}
          </button>
        </div>
        <div
          class="card feature-card"
          :class="{ dragging: dragging(featured.id) }"
          :style="{ transform: `translateX(${offsetOf(featured.id)}px)` }"
          @pointerdown="onDown($event, featured)"
          @pointermove="onMove"
          @pointerup="onUp"
          @pointercancel="onUp"
          @click="onFeatureClick(featured)"
        >
          <em>{{ featureKicker() }}</em>
          <b v-if="isDone(featured)" class="seal">印</b>
          <strong>
            {{ featured.title }}
            <span v-if="featured.pinned" class="pin-mark">置顶</span>
          </strong>
          <p v-if="counterOf(featured)" class="feature-count">
            {{ counterOf(featured).count }} / {{ counterOf(featured).target }}
          </p>
          <span class="feature-line">{{ taskViewLine(featured) }}</span>
          <div class="feature-go">{{ featureCta(featured) }}</div>
        </div>
      </div>
      <p v-if="restTasks().length" class="list-kicker">其余日课</p>
      <div
        v-for="task in restTasks()"
        :key="task.id"
        class="swipe"
        :class="{ done: isDone(task), expanded: expandedId === task.id, open: openId === task.id }"
        :style="{ '--task': task.color }"
      >
        <div class="actions" aria-hidden="true">
          <button type="button" class="act edit" @click.stop="openEdit(task)">修改</button>
          <button type="button" class="act del" @click.stop="deleteFromList(task)">归档</button>
          <button type="button" class="act pin" @click.stop="pinFromList(task)">
            {{ task.pinned ? '取消' : '置顶' }}
          </button>
        </div>
        <div
          class="card"
          :class="{ dragging: dragging(task.id) }"
          :style="{ transform: `translateX(${offsetOf(task.id)}px)` }"
          @pointerdown="onDown($event, task)"
          @pointermove="onMove"
          @pointerup="onUp"
          @pointercancel="onUp"
          @click="onCardClick(task)"
        >
          <i class="dot" :style="{ background: task.color }" />
          <div class="body">
            <strong>
              {{ task.title }}
              <span v-if="task.pinned" class="pin-mark">置顶</span>
            </strong>
            <span>{{ taskViewLine(task) }}</span>
          </div>
          <button
            v-if="hasSubtasks(task)"
            class="expand"
            type="button"
            :aria-label="expandedId === task.id ? '收起子任务' : '展开子任务'"
            @click.stop="expandedId = expandedId === task.id ? null : task.id"
          >
            {{ expandedId === task.id ? '收起' : '展开' }}
          </button>
          <button
            v-if="viewMode === 'today' && task.completion === 'check'"
            class="tick"
            :class="{ on: isDone(task) }"
            type="button"
            :aria-label="isDone(task) ? '取消完成' : '完成今天'"
            @click.stop="quickCheck(task)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M5.5 12.5l4.2 4.2 8.8-10"
                fill="none"
                stroke="currentColor"
                stroke-width="2.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
        <div v-if="expandedId === task.id && hasSubtasks(task)" class="subtasks">
          <button
            v-for="subtask in task.subtasks"
            :key="subtask.id"
            type="button"
            class="subtask"
            :class="{ on: pastSubDone(task, subtask) }"
            @click="toggleSub(task, subtask)"
          >
            <i />
            <span>{{ subtask.title }}</span>
          </button>
        </div>
      </div>
    </section>

    <button
      v-if="viewMode !== 'future'"
      type="button"
      class="journal-row"
      @click="router.push(`/journal/${viewingDate}`)"
    >
      <span>
        <strong>日记</strong>
        <em>{{ journalPreview() }}</em>
      </span>
      <i>{{ journalCta() }}</i>
    </button>

    <SyncBar />

    <button
      v-if="viewMode !== 'past'"
      type="button"
      class="fab"
      :aria-label="viewMode === 'future' ? '安排任务' : '添加任务'"
      @click="openAdd"
    >
      <span>+</span>
    </button>

    <div v-if="editor" class="modal-mask" @click.self="requestClose">
      <div class="modal-sheet editor-sheet">
        <div v-if="editorStep === 'template'" class="modal-scroll">
          <h2 class="modal-title">选择模板</h2>
          <p class="modal-copy">模板只预设类型和组件，子任务之后自己添加。</p>
          <div class="template-list">
            <button
              v-for="item in TASK_TEMPLATES"
              :key="item.id"
              type="button"
              class="template-card"
              :disabled="saving"
              @click="chooseTemplate(item)"
            >
              <i :style="{ background: item.color }" />
              <span>
                <strong>{{ item.title }}</strong>
                <em>{{ item.summary }}</em>
              </span>
            </button>
          </div>
        </div>
        <div v-else class="modal-scroll">
          <div class="modal-head">
            <button
              v-if="editor.mode === 'add'"
              type="button"
              class="back-step"
              :disabled="saving"
              @click="backToTemplate"
            >
              模板
            </button>
            <h2 class="modal-title">{{ editor.mode === 'add' ? '新任务' : '改任务' }}</h2>
            <span />
          </div>
          <p v-if="editor.mode === 'add' && form.dueDate !== practice.date" class="modal-copy">
            安排到 {{ form.dueDate }}
          </p>
          <p v-if="(fromCalendarDate || viewMode === 'future') && editor.mode === 'edit'" class="modal-copy">
            这里改的是整条任务，不是只改这一天。
          </p>
          <input v-model="form.title" class="field" type="text" maxlength="20" placeholder="名称" />
          <div class="colors">
            <button
              v-for="color in TASK_COLORS"
              :key="color"
              type="button"
              class="swatch"
              :class="{ on: form.color === color }"
              :style="{ background: color }"
              @click="form.color = color"
            />
          </div>
          <div class="time-row">
            <span>提醒</span>
            <button type="button" class="time" @click="timeOpen = true">
              {{ form.reminder || '选择时间' }}
            </button>
            <button v-if="form.reminder" type="button" class="off" @click="form.reminder = ''">关</button>
          </div>
          <div class="date-row">
            <div class="due-cal">
              <div class="time-row">
                <span>完成日期</span>
                <button type="button" class="time" @click="dueCalOpen = !dueCalOpen">
                  {{ formatDayTitle(form.dueDate) }}
                </button>
              </div>
              <MonthCal v-if="dueCalOpen" :selected="form.dueDate" :today="todayKey" @pick="setDueDate" />
            </div>
            <label class="toggle">
              <input
                type="checkbox"
                :checked="form.longTerm"
                :disabled="saving"
                @change="setLongTerm($event.target.checked)"
              />
              <span>长期任务</span>
            </label>
            <label class="toggle">
              <input v-model="form.paused" type="checkbox" />
              <span>暂停任务</span>
            </label>
          </div>
          <div v-if="form.longTerm" class="repeat-row">
            <span>重复</span>
            <div class="weekday-picks">
              <button
                v-for="day in WEEKDAYS"
                :key="day.value"
                type="button"
                :class="{ on: repeatOn(day.value) }"
                @click="toggleRepeat(day.value)"
              >
                {{ day.label }}
              </button>
            </div>
            <em>{{ form.repeatWeekdays.length ? '按选中的周几出现' : '不选则每天出现' }}</em>
          </div>
          <div class="component-block">
            <p>完成方式</p>
            <div class="kinds">
              <button
                v-for="item in COMPLETION_MODES"
                :key="item.id"
                type="button"
                :class="{ on: form.completion === item.id }"
                @click="setCompletion(item.id)"
              >
                {{ item.title }}
              </button>
            </div>
            <label v-if="form.completion === 'counter'" class="target-field">
              <span>目标遍数</span>
              <input v-model="form.target" type="number" min="1" max="999" inputmode="numeric" />
            </label>
          </div>
          <div class="component-block">
            <p>组件</p>
            <div class="kinds">
              <button
                v-for="item in TASK_COMPONENTS"
                :key="item.id"
                type="button"
                :class="{ on: hasComponent(item.id) }"
                @click="toggleComponent(item.id)"
              >
                {{ item.title }}
              </button>
            </div>
          </div>
          <div class="subtask-editor">
            <div class="subtask-title">
              <span>子任务</span>
              <button type="button" @click="addSubtaskField">添加</button>
            </div>
            <div v-if="form.subtasks.length" class="subtask-fields">
              <label v-for="(subtask, index) in form.subtasks" :key="index" class="subtask-field">
                <input v-model="subtask.title" type="text" maxlength="28" placeholder="子任务名称" />
                <button type="button" @click="removeSubtaskField(index)">删</button>
              </label>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <template v-if="editorStep === 'template'">
            <button class="btn btn-ghost" type="button" @click="requestClose">取消</button>
          </template>
          <template v-else>
            <button
              v-if="editor.mode === 'edit'"
              class="btn btn-danger"
              type="button"
              :disabled="saving"
              @click="deleteCurrent"
            >
              归档
            </button>
            <button class="btn btn-ghost" type="button" @click="requestClose">取消</button>
            <button class="btn btn-primary" type="button" :disabled="saving" @click="saveEditor">
              {{ saving ? '保存中' : '保存' }}
            </button>
          </template>
        </div>
      </div>
    </div>

    <div v-if="archiveOpen" class="modal-mask" @click.self="archiveOpen = false">
      <div class="modal-sheet">
        <h2 class="modal-title">归档箱</h2>
        <p class="modal-copy">恢复后会重新按完成日期或长期任务规则显示，过去日期的单次任务可在日历里回看。</p>
        <div class="archive-list">
          <article v-for="task in managedTasks()" :key="task.id" class="archive-item">
            <i :style="{ background: task.color }" />
            <span>
              <strong>{{ task.title }}</strong>
              <em>{{ task.archived ? '已归档' : '已暂停' }}</em>
            </span>
            <button type="button" @click="restoreFromArchive(task)">恢复</button>
          </article>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" type="button" @click="archiveOpen = false">关闭</button>
        </div>
      </div>
    </div>

    <div v-if="pickerOpen" class="modal-mask" @click.self="closePicker">
      <div class="modal-sheet">
        <h2 class="modal-title">看哪一天</h2>
        <div class="picker-chips">
          <button type="button" :class="{ on: viewingDate === yesterdayKey }" @click="setViewingDate(yesterdayKey)">
            昨天
          </button>
          <button type="button" :class="{ on: viewingDate === todayKey }" @click="setViewingDate(todayKey)">
            今天
          </button>
          <button type="button" :class="{ on: viewingDate === tomorrowKey }" @click="setViewingDate(tomorrowKey)">
            明天
          </button>
        </div>
        <MonthCal :selected="viewingDate" :today="todayKey" @pick="setViewingDate" />
        <p class="modal-copy">{{ pickerTitle }}</p>
      </div>
    </div>

    <TimePicker v-model="form.reminder" :open="timeOpen" @close="timeOpen = false" />
    <input ref="importRef" class="hidden" type="file" accept="application/json" @change="onImport" />
  </main>
</template>

<style scoped>
.page {
  height: 100%;
  overflow: auto;
  overflow-x: hidden;
  padding: calc(18px + var(--safe-top)) 22px calc(var(--tab-h) + 88px);
  max-width: var(--page-max);
  margin: 0 auto;
}

.cover-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.brand {
  margin: 4px 0 0;
  font-size: 15px;
  letter-spacing: 0.36em;
  font-weight: 650;
  color: var(--paper);
}

.cover-date {
  display: block;
  width: 100%;
  margin-top: 22px;
  padding: 0;
  text-align: left;
  background: transparent;
  color: inherit;
}

.cover-kicker {
  display: block;
  color: var(--muted);
  font-size: var(--fs-sm);
  letter-spacing: 0.22em;
}

.cover-day {
  display: block;
  margin: 2px 0 0;
  font-size: 76px;
  line-height: 0.88;
  font-weight: 500;
  letter-spacing: 0.06em;
}

.cover-date.away .cover-day {
  color: var(--amber);
}

.cover-cap {
  display: block;
  margin: 10px 0 0;
  color: var(--muted);
  font-size: var(--fs-sm);
}

.mode-hint {
  margin: 16px 2px 0;
  color: var(--muted);
  font-size: var(--fs-sm);
  line-height: 1.55;
}

.journal-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  margin-top: 18px;
  padding: 14px 16px;
  border-radius: var(--radius);
  background: var(--bg-elev);
  text-align: left;
}

.journal-row strong,
.journal-row em {
  display: block;
}

.journal-row em {
  margin-top: 4px;
  color: var(--muted);
  font-style: normal;
  font-size: var(--fs-sm);
}

.journal-row i {
  font-style: normal;
  color: var(--amber);
  font-weight: 650;
}

.picker-chips {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  margin: 0 0 16px;
}

.picker-chips button {
  min-height: var(--tap);
  border-radius: 999px;
  background: var(--bg-soft);
  color: var(--muted);
  font-weight: 650;
}

.picker-chips button.on {
  background: var(--amber);
  color: var(--ink);
}

.feature-card {
  position: relative;
}

.head-actions {
  display: grid;
  justify-items: end;
  gap: 4px;
}

.archive-btn {
  min-height: 32px;
  color: var(--amber);
  font-size: var(--fs-sm);
  font-weight: 650;
}

.links {
  display: grid;
  gap: 12px;
  margin-top: 26px;
}

.list-kicker {
  margin: 8px 2px 0;
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 0.16em;
}

.empty {
  margin: 22px 0 0;
  color: var(--muted);
  text-align: center;
  font-size: var(--fs-sm);
}

@media (min-width: 700px) {
  .links {
    gap: 16px;
  }
}

.swipe {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius);
  background: var(--bg-elev);
}

.swipe.done {
  opacity: 0.58;
}

.feature-swipe.done {
  opacity: 1;
}

.swipe.done .card strong,
.swipe.done .card span {
  color: var(--muted);
}

.actions {
  position: absolute;
  inset: 0 0 0 auto;
  display: flex;
  width: 192px;
  pointer-events: none;
}

.swipe.open .actions,
.swipe:has(.card.dragging) .actions {
  pointer-events: auto;
}

.act {
  width: 64px;
  height: 100%;
  color: #fff;
  font-size: 13px;
  font-weight: 650;
}

.act.edit {
  background: var(--bg-soft);
  color: var(--paper);
}

.act.del {
  background: var(--seal);
}

.act.pin {
  background: var(--amber);
  color: var(--ink);
}

.card {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 14px;
  text-align: left;
  padding: var(--card-pad);
  background: var(--bg-elev);
  touch-action: pan-y;
  transition: transform 0.22s ease;
  user-select: none;
}

.feature-card {
  display: block;
  padding: 18px 18px 16px;
  background: var(--paper);
  color: var(--ink);
  border-radius: 6px 22px 22px 22px;
  box-shadow: none;
}

.feature-card em {
  display: block;
  font-style: normal;
  font-size: 11px;
  letter-spacing: 0.18em;
  color: #7a5a20;
}

.feature-card strong {
  display: block;
  margin: 6px 0 0;
  color: var(--ink);
  font-size: 22px;
}

.feature-count {
  margin: 8px 0 0;
  font-size: 36px;
  font-weight: 650;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
}

.feature-card .feature-line {
  display: block;
  margin-top: 6px;
  color: #7a6a58;
  font-size: var(--fs-sm);
}

.feature-card .pin-mark {
  display: inline;
  color: #a56b14;
}

.feature-go {
  margin-top: 16px;
  min-height: 44px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: var(--ink);
  color: var(--paper);
  font-size: var(--fs-md);
  font-weight: 650;
}

.feature-swipe.open .feature-card em,
.feature-swipe.open .feature-count,
.feature-swipe.open .feature-line,
.feature-swipe.open .feature-go,
.feature-swipe.open .seal,
.feature-swipe:has(.card.dragging) .feature-card em,
.feature-swipe:has(.card.dragging) .feature-count,
.feature-swipe:has(.card.dragging) .feature-line,
.feature-swipe:has(.card.dragging) .feature-go,
.feature-swipe:has(.card.dragging) .seal {
  display: none;
}

.feature-swipe.open .feature-card,
.feature-swipe:has(.card.dragging) .feature-card {
  display: flex;
  align-items: center;
  min-height: 72px;
  padding: 16px 12px;
}

.feature-swipe.open .feature-card strong,
.feature-swipe:has(.card.dragging) .feature-card strong {
  margin: 0;
  font-size: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.feature-swipe.done .feature-card {
  background: #e8dcc4;
}

.feature-card .seal {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border: 1.5px solid var(--seal);
  color: var(--seal);
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 650;
  transform: rotate(-12deg);
}

@media (min-width: 700px) {
  .cover-day {
    font-size: 96px;
  }

  .feature-count {
    font-size: 44px;
  }
}

.swipe.expanded .card {
  border-bottom: 1px solid var(--line);
}

.card.dragging {
  transition: none;
}

.body {
  flex: 1;
  min-width: 0;
}

.card strong {
  display: block;
  font-size: var(--fs-lg);
}

.card span {
  display: block;
  margin-top: 6px;
  color: var(--muted);
  font-size: var(--fs-sm);
}

.card .pin-mark {
  display: inline;
  margin: 0 0 0 8px;
  color: var(--amber);
  font-size: 12px;
  font-weight: 650;
  letter-spacing: 0.08em;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex: 0 0 auto;
}

.tick {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border: 2px solid var(--muted);
  color: transparent;
}

.tick svg {
  width: 18px;
  height: 18px;
}

.tick.on {
  border-color: var(--ok);
  background: var(--ok);
  color: var(--ink);
}

.expand {
  min-height: 34px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--bg-soft);
  color: var(--amber);
  font-size: 12px;
  font-weight: 650;
}

.subtasks {
  position: relative;
  z-index: 2;
  display: grid;
  gap: 8px;
  padding: 10px 16px 14px 40px;
  background: var(--bg-elev);
}

.subtask {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  text-align: left;
  color: var(--text);
}

.subtask i {
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
  border: 2px solid var(--muted);
  border-radius: 50%;
}

.subtask.on {
  color: var(--muted);
  text-decoration: line-through;
}

.subtask.on i {
  border-color: var(--ok);
  background: var(--ok);
}

@media (min-width: 700px) {
  .tick {
    width: 36px;
    height: 36px;
  }

  .tick svg {
    width: 22px;
    height: 22px;
  }
}

.colors,
.kinds {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 16px;
}

.component-block p {
  margin: 0 0 8px;
  color: var(--muted);
  font-size: var(--fs-sm);
}

.target-field {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: -8px 0 16px;
  color: var(--muted);
  font-size: var(--fs-sm);
}

.target-field input {
  width: 92px;
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--bg);
  color: var(--text);
}

.subtask-editor {
  margin: 0 0 16px;
}

.subtask-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: var(--muted);
  font-size: var(--fs-sm);
}

.subtask-title button {
  min-height: 36px;
  color: var(--amber);
  font-weight: 650;
}

.subtask-fields {
  display: grid;
  gap: 8px;
}

.subtask-field {
  display: grid;
  grid-template-columns: 1fr 44px;
  gap: 8px;
  align-items: center;
}

.subtask-field input {
  min-width: 0;
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--bg);
  color: var(--text);
}

.subtask-field button {
  min-height: 42px;
  color: var(--danger);
  font-weight: 650;
}

.swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
}

.swatch.on {
  border-color: #fff;
}

.kinds button {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  background: var(--bg-soft);
  font-size: 13px;
}

.kinds button.on {
  background: var(--amber);
  color: var(--ink);
}

.time-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 16px;
  color: var(--muted);
}

.date-row {
  display: grid;
  gap: 10px;
  margin: 0 0 16px;
}

.date-row .due-cal {
  display: grid;
  gap: 4px;
}

.date-row .due-cal .time-row {
  margin: 0;
}

.date-row label {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--muted);
}

.date-row .toggle {
  min-height: 42px;
}

.repeat-row {
  display: grid;
  gap: 8px;
  margin: 0 0 16px;
}

.repeat-row > span,
.repeat-row em {
  color: var(--muted);
  font-size: var(--fs-sm);
  font-style: normal;
}

.weekday-picks {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
}

.weekday-picks button {
  min-width: 0;
  min-height: 38px;
  border-radius: 999px;
  background: var(--bg-soft);
  color: var(--muted);
  font-weight: 650;
}

.weekday-picks button.on {
  background: var(--amber);
  color: var(--ink);
}

.toggle input {
  width: 22px;
  height: 22px;
  accent-color: var(--amber);
}

.time {
  flex: 1;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--bg);
  color: var(--text);
  font-size: 16px;
  text-align: left;
}

.off {
  color: var(--amber);
  min-height: 44px;
  font-weight: 650;
}

.backup-nag {
  display: grid;
  gap: 10px;
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--bg-elev);
}

.backup-nag p {
  margin: 0;
  color: var(--text);
  font-size: var(--fs-sm);
  line-height: 1.5;
}

.backup-nag div {
  display: flex;
  gap: 10px;
}

.backup-nag button {
  min-height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  background: var(--amber);
  color: var(--ink);
  font-weight: 650;
}

.backup-nag .later {
  background: var(--bg-soft);
  color: var(--amber);
}

.backup-nag button:disabled {
  opacity: 0.5;
}

.hidden {
  display: none;
}

.editor-sheet {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-bottom: 0;
}

.editor-sheet .modal-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.editor-sheet .modal-actions {
  position: sticky;
  bottom: 0;
  flex: 0 0 auto;
  margin: 0 -20px;
  padding: 12px 20px calc(12px + var(--safe-bottom));
  background: var(--bg-elev);
  border-top: 1px solid var(--line);
}

.modal-actions .btn {
  flex: 1;
  min-width: 0;
}

.modal-head {
  display: grid;
  grid-template-columns: 64px 1fr 64px;
  align-items: center;
}

.back-step {
  min-height: 40px;
  color: var(--amber);
  font-weight: 650;
  text-align: left;
}

.template-list {
  display: grid;
  gap: 10px;
  margin: 14px 0 18px;
}

.template-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 60px;
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--bg);
  text-align: left;
}

.template-card i {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  flex: 0 0 auto;
}

.template-card strong {
  display: block;
  font-size: var(--fs-md);
  overflow-wrap: anywhere;
}

.template-card em {
  display: block;
  margin-top: 4px;
  color: var(--muted);
  font-style: normal;
  font-size: var(--fs-sm);
  line-height: 1.45;
}

.archive-list {
  display: grid;
  gap: 10px;
  margin: 14px 0 18px;
}

.archive-item {
  display: grid;
  grid-template-columns: 12px 1fr auto;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--bg);
}

.archive-item i {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.archive-item strong,
.archive-item em {
  display: block;
  overflow-wrap: anywhere;
}

.archive-item em {
  margin-top: 4px;
  color: var(--muted);
  font-style: normal;
  font-size: var(--fs-sm);
}

.archive-item button {
  min-height: 40px;
  padding: 0 12px;
  color: var(--amber);
  font-weight: 650;
}

.fab {
  position: fixed;
  right: 20px;
  bottom: calc(var(--tab-h) + 16px);
  z-index: 40;
  width: var(--fab);
  height: var(--fab);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--amber);
  color: var(--ink);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
}

.fab span {
  font-size: calc(var(--fab) * 0.5);
  line-height: 1;
  font-weight: 400;
}
</style>
