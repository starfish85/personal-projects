<script setup>
import { computed, nextTick, onActivated, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PhotoViewer from '../components/PhotoViewer.vue'
import {
  addCheckins,
  assetDayKey,
  checkinsOn,
  dayComplete,
  ensureToday,
  hasJournal,
  journalPhotosOn,
  listDays,
  listTaskNoteEntries,
  loadCheckins,
  loadJournals,
  practice,
  reviewableNoteTasks,
  removeAsset,
  removeCheckin,
  removeJournalPhoto,
  subtaskDone,
  helperImagesForTask,
  taskHasGallery,
  taskLogsImages,
  skipTaskOnDate,
  tasksForCalendarDate,
  toggleCheckOnDate,
  toggleSubtask,
  unskipTaskOnDate,
} from '../stores/practice'
import { clearToast, confirmDialog } from '../stores/ui'
import {
  dateMode,
  formatClock,
  formatDayTitle,
  formatPracticeTime,
  localDateKey,
  monthGrid,
  shiftDateKey,
  weekGrid,
} from '../utils/date'

defineOptions({ name: 'Calendar' })

const router = useRouter()
const route = useRoute()
const today = computed(() => practice.date || localDateKey())
const cursor = ref(new Date())
const calView = ref('month')
const selected = ref(String(route.query.date || localDateKey()))
const daysByTask = ref({})
const viewerOpen = ref(false)
const startIndex = ref(0)
const viewerPhotos = ref([])
const fileRef = ref(null)
const uploadTaskId = ref('')
const viewerTaskId = ref(null)
const viewerKind = ref('checkin')

const year = computed(() => cursor.value.getFullYear())
const month = computed(() => cursor.value.getMonth())
const title = computed(() => {
  if (calView.value !== 'week') return `${year.value}年${month.value + 1}月`
  const days = weekGrid(selected.value)
  const a = days[0]
  const b = days[6]
  return `${Number(a.slice(5, 7))}月${Number(a.slice(8))}日 – ${Number(b.slice(5, 7))}月${Number(b.slice(8))}日`
})
const cells = computed(() =>
  calView.value === 'week' ? weekGrid(selected.value) : monthGrid(year.value, month.value),
)
const weekMeta = computed(() => {
  const days = weekGrid(selected.value)
  let due = 0
  let done = 0
  for (const day of days) {
    if (!tasksForCell(day).length) continue
    due += 1
    if (allDoneOn(day)) done += 1
  }
  if (!due) return '本周没有安排'
  return `本周完成 ${done} / ${due} 天`
})
const selectedTasks = computed(() => tasksForCalendarDate(selected.value, daysByTask.value))
const mode = computed(() => dateMode(selected.value, today.value))
const isFuture = computed(() => mode.value === 'future')
const isToday = computed(() => mode.value === 'today')
const canEditJournal = computed(() => mode.value !== 'future')
const canCompleteTasks = computed(() => mode.value === 'today')
const viewerDeletable = computed(() =>
  viewerKind.value === 'journal' ? canEditJournal.value : isToday.value,
)

function record(taskId, date) {
  return daysByTask.value[taskId]?.[date] || null
}

function status(dateKey, task) {
  return dayComplete(task, record(task.id, dateKey))
}

function subDone(taskId, subtaskId) {
  return Boolean(record(taskId, selected.value)?.subtasks?.[subtaskId])
}

function statusLine(task) {
  if ((task.skipDates || []).includes(selected.value)) return '已跳过'
  if (isFuture.value) return '已安排'
  if (task.subtasks?.length) {
    const rec = record(task.id, selected.value)
    const doneCount = task.subtasks.filter((item) => rec?.subtasks?.[item.id]).length
    if (doneCount === task.subtasks.length) return `已完成 · ${doneCount}/${task.subtasks.length}`
    if (doneCount > 0) return `${doneCount}/${task.subtasks.length}`
    return '未完成'
  }
  let line = '未完成'
  if (status(selected.value, task)) line = task.completion === 'photo-log' ? '已打卡' : '已完成'
  const time = formatPracticeTime(record(task.id, selected.value)?.seconds)
  if (time) line += ` · ${time}`
  return line
}

function tasksForCell(dateKey) {
  return tasksForCalendarDate(dateKey, daysByTask.value)
}

function allDoneOn(dateKey) {
  const rows = tasksForCell(dateKey)
  if (!rows.length) return false
  return rows.every((task) => status(dateKey, task))
}

const selectedAllDone = computed(() => allDoneOn(selected.value))
const detailRef = ref(null)
const summaryTitle = computed(() => {
  if (isFuture.value) return '这天要做的'
  if (isToday.value) return '这天的日课'
  return '这天做了什么'
})
const summaryMeta = computed(() => {
  const rows = selectedTasks.value
  if (!rows.length) return ''
  if (isFuture.value) return `${rows.length} 项`
  const done = rows.filter((task) => status(selected.value, task)).length
  return `${done}/${rows.length} 已完成`
})
const emptySummary = computed(() => {
  if (isFuture.value) return '这天还没有安排任务'
  if (isToday.value) return '今天没有安排的日课'
  return '这天没有任务记录'
})

function photosFor(taskId) {
  const checkins = checkinsOn(selected.value, taskId)
  const task = practice.tasks.find((item) => item.id === taskId)
  if (!taskLogsImages(task)) return checkins
  const extras = helperImagesForTask(taskId).filter((item) => assetDayKey(item) === selected.value)
  const seen = new Set(checkins.map((item) => item.id))
  return [...checkins, ...extras.filter((item) => !seen.has(item.id))]
}

function mapDays(rows) {
  const map = {}
  for (const day of rows) map[day.date] = day
  return map
}

const journalText = computed(() => practice.journalTexts[selected.value] || '')
const journalPhotos = computed(() => journalPhotosOn(selected.value))
const journalExists = computed(() => hasJournal(selected.value))

async function refresh() {
  await loadCheckins()
  await loadJournals()
  const next = {}
  await Promise.all(
    practice.tasks.map(async (task) => {
      next[task.id] = mapDays(await listDays(task.id))
    }),
  )
  daysByTask.value = next
}

function shiftMonth(delta) {
  if (calView.value === 'week') {
    const next = shiftDateKey(selected.value, delta * 7)
    selected.value = next
    armed.value = true
    const [y, m] = next.split('-').map(Number)
    cursor.value = new Date(y, m - 1, 1)
    router.replace({ path: '/calendar', query: { date: next } })
    return
  }
  cursor.value = new Date(year.value, month.value + delta, 1)
}

function setCalView(mode) {
  calView.value = mode
}

function skipped(task) {
  return (task.skipDates || []).includes(selected.value)
}

async function toggleSkip(task) {
  if (!task.longTerm) return
  if (skipped(task)) await unskipTaskOnDate(task.id, selected.value)
  else await skipTaskOnDate(task.id, selected.value)
}

const armed = ref(false)

function pick(dateKey) {
  if (!dateKey) return
  clearToast()
  const nextMode = dateMode(dateKey, today.value)
  if (dateKey === selected.value && armed.value) {
    if (nextMode === 'future') addTaskForSelected()
    else router.push(`/journal/${dateKey}`)
    return
  }
  selected.value = dateKey
  armed.value = true
  router.replace({ path: '/calendar', query: { date: dateKey } })
  nextTick(() => {
    detailRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function addTaskForSelected() {
  if (!isFuture.value) return
  router.push({ path: '/', query: { add: '1', date: selected.value, from: 'calendar' } })
}

function openGallery(taskId) {
  router.push(`/gallery/${taskId}`)
}

function openTask(taskId) {
  if (!isToday.value) return
  const task = practice.tasks.find((item) => item.id === taskId)
  if (task && skipped(task)) return
  router.push(`/task/${taskId}`)
}

function editTask(taskId) {
  router.push({ path: '/', query: { edit: taskId, date: selected.value, from: 'calendar' } })
}

const reviewOpen = ref(false)
const reviewFilter = ref('')
const reviewDetail = ref(null)

function canReviewNotes(task) {
  return reviewableNoteTasks().some((item) => item.id === task.id)
}

function openReview(taskId) {
  reviewFilter.value = taskId || ''
  reviewDetail.value = null
  reviewOpen.value = true
}

function closeReview() {
  reviewOpen.value = false
  reviewDetail.value = null
}

const reviewTasks = computed(() => reviewableNoteTasks())
const reviewChips = computed(() => reviewTasks.value.length > 1 || Boolean(reviewFilter.value))
const reviewEntries = computed(() => {
  const allowed = new Set(reviewTasks.value.map((task) => task.id))
  const rows = listTaskNoteEntries(reviewFilter.value ? { taskId: reviewFilter.value } : {})
  return rows.filter((row) => allowed.has(row.taskId))
})

function reviewTaskTitle(taskId) {
  return practice.tasks.find((item) => item.id === taskId)?.title || '任务'
}

function notePreview(text) {
  const line = String(text || '').trim().split('\n')[0] || ''
  return line.length > 42 ? `${line.slice(0, 42)}…` : line
}

function pickPhoto(taskId) {
  if (!canCompleteTasks.value) return
  const task = practice.tasks.find((item) => item.id === taskId)
  if (task && skipped(task)) return
  uploadTaskId.value = taskId
  fileRef.value?.click()
}

async function onFiles(event) {
  const files = event.target.files
  event.target.value = ''
  if (!files?.length || !uploadTaskId.value) return
  await addCheckins(files, selected.value, uploadTaskId.value)
  uploadTaskId.value = ''
  await refresh()
}

function openPhoto(taskId, index) {
  viewerKind.value = 'checkin'
  viewerTaskId.value = taskId
  viewerPhotos.value = photosFor(taskId)
  startIndex.value = index
  viewerOpen.value = true
}

function openJournalPhoto(index) {
  viewerKind.value = 'journal'
  viewerTaskId.value = null
  viewerPhotos.value = journalPhotos.value
  startIndex.value = index
  viewerOpen.value = true
}

async function onDelete(id) {
  if (viewerKind.value === 'checkin' && !isToday.value) return
  const ok = await confirmDialog({
    title: '删除这张图？',
    copy:
      viewerKind.value === 'journal'
        ? '从这天的日记里拿掉这张图。'
        : '删光之后这一天这项任务会变成未完成。',
    ok: '删除',
    danger: true,
  })
  if (!ok) return
  if (viewerKind.value === 'journal') await removeJournalPhoto(id)
  else if (viewerPhotos.value.find((item) => item.id === id)?.role === 'helper-image') await removeAsset(id)
  else await removeCheckin(id)
  await refresh()
  viewerPhotos.value =
    viewerKind.value === 'journal' ? journalPhotos.value : photosFor(viewerTaskId.value)
  if (!viewerPhotos.value.length) viewerOpen.value = false
}

async function toggleSubOnDate(task, subtask) {
  if (!canCompleteTasks.value || skipped(task)) return
  await toggleSubtask(task.id, subtask.id, selected.value)
  await refresh()
}

async function toggleCheckForSelected(task) {
  if (!canCompleteTasks.value || skipped(task)) return
  await toggleCheckOnDate(task.id, selected.value)
  await refresh()
}

async function boot() {
  await ensureToday()
  await refresh()
}

onMounted(boot)
onActivated(boot)

watch(
  () => route.query.date,
  (date) => {
    if (!date) return
    const next = String(date)
    if (next === selected.value) return
    selected.value = next
    armed.value = false
    const [y, m] = selected.value.split('-').map(Number)
    if (y && m) cursor.value = new Date(y, m - 1, 1)
  },
  { immediate: true },
)
</script>

<template>
  <main class="page" :class="{ locked: reviewOpen }">
    <header class="head">
      <p class="brand">日课</p>
      <h1>日历</h1>
      <button type="button" class="review-btn" @click="openReview('')">回溯</button>
    </header>

    <section class="cal">
      <div class="nav">
        <button type="button" @click="shiftMonth(-1)">{{ calView === 'week' ? '上一周' : '上个月' }}</button>
        <div class="nav-mid">
          <strong>{{ title }}</strong>
          <div class="view-switch">
            <button type="button" :class="{ on: calView === 'month' }" @click="setCalView('month')">月</button>
            <button type="button" :class="{ on: calView === 'week' }" @click="setCalView('week')">周</button>
          </div>
        </div>
        <button type="button" @click="shiftMonth(1)">{{ calView === 'week' ? '下一周' : '下个月' }}</button>
      </div>
      <p v-if="calView === 'week'" class="week-meta">{{ weekMeta }}</p>
      <div class="week">
        <span v-for="w in ['一', '二', '三', '四', '五', '六', '日']" :key="w">{{ w }}</span>
      </div>
      <div class="grid" :class="{ week: calView === 'week' }">
        <button
          v-for="(cell, i) in cells"
          :key="i"
          type="button"
          class="cell"
          :class="{ empty: !cell, today: cell === today, on: cell === selected }"
          :disabled="!cell"
          @click="pick(cell)"
        >
          <span v-if="cell">{{ Number(cell.slice(8)) }}</span>
          <div v-if="cell && tasksForCell(cell).length" class="bar" :class="{ full: allDoneOn(cell) }">
            <i
              v-for="task in tasksForCell(cell)"
              :key="task.id"
              class="seg"
              :style="{ background: status(cell, task) ? task.color : 'transparent' }"
            />
          </div>
        </button>
      </div>
    </section>

    <section ref="detailRef" class="detail">
      <h2>{{ formatDayTitle(selected) }}</h2>
      <div>
        <div class="day-actions">
          <button v-if="isFuture" type="button" class="open" @click="addTaskForSelected">安排任务</button>
          <button v-if="canEditJournal" type="button" class="open" @click="router.push(`/journal/${selected}`)">
            {{ journalExists ? '打开日记' : '写日记' }}
          </button>
        </div>
        <p v-if="isFuture" class="muted">点这一天来安排任务。到了那天再执行。</p>
        <p v-else-if="!isToday" class="muted">点这一天来写日记。下面是这天做了什么。</p>
        <p v-else class="muted">点今天来写日记。下面是今天要做的日课。</p>
        <div class="summary-head">
          <h3>{{ summaryTitle }}</h3>
          <span v-if="summaryMeta">{{ summaryMeta }}</span>
        </div>
        <p v-if="selectedAllDone && selectedTasks.length" class="ok">已完成</p>
        <p v-if="!selectedTasks.length" class="muted">{{ emptySummary }}</p>
        <div v-for="task in selectedTasks" :key="task.id" class="block">
          <div class="task-head">
            <p class="label">
              <i :style="{ background: task.color }" />
              {{ task.title }}
              <em v-if="task.archived">已归档</em>
              <em v-else-if="task.paused">已暂停</em>
            </p>
            <span :class="status(selected, task) ? 'mini-ok' : 'mini-muted'">{{ statusLine(task) }}</span>
          </div>

          <div v-if="task.subtasks?.length" class="subtasks">
            <template v-if="isToday && !skipped(task)">
              <button
                v-for="subtask in task.subtasks"
                :key="subtask.id"
                type="button"
                class="subtask"
                :class="{ on: subDone(task.id, subtask.id) }"
                @click="toggleSubOnDate(task, subtask)"
              >
                <span>{{ subtask.title }}</span>
                <i />
              </button>
            </template>
            <template v-else>
              <div
                v-for="subtask in task.subtasks"
                :key="subtask.id"
                class="subtask"
                :class="{ on: subDone(task.id, subtask.id) }"
              >
                <span>{{ subtask.title }}</span>
                <i />
              </div>
            </template>
          </div>

          <template v-if="photosFor(task.id).length">
            <p class="ok">已打卡 · {{ record(task.id, selected)?.count }} 张</p>
            <div class="thumbs">
              <button
                v-for="(item, i) in photosFor(task.id)"
                :key="item.id"
                type="button"
                class="thumb"
                @click="openPhoto(task.id, i)"
              >
                <img :src="item.thumbUrl" alt="" />
              </button>
            </div>
          </template>

          <template v-else-if="task.completion === 'counter' && record(task.id, selected)?.count">
            <p class="digits">
              {{ record(task.id, selected).count }}
              <span>/ {{ record(task.id, selected).target ?? task.target }} 遍</span>
            </p>
            <p v-if="status(selected, task)" class="ok">已完成</p>
            <p v-else class="muted">未到目标</p>
            <p v-if="record(task.id, selected).completedAt" class="muted">
              {{ formatClock(record(task.id, selected).completedAt) }}
            </p>
          </template>

          <button
            v-if="isToday && !skipped(task) && task.completion === 'check' && !task.subtasks?.length"
            class="day-check"
            type="button"
            :class="{ on: status(selected, task) }"
            @click="toggleCheckForSelected(task)"
          >
            <span>{{ status(selected, task) ? '取消完成' : '完成今天' }}</span>
            <i />
          </button>

          <div v-if="isToday || isFuture || taskHasGallery(task) || canReviewNotes(task)" class="task-actions">
            <button v-if="isToday && !skipped(task)" type="button" class="open" @click="openTask(task.id)">打开任务</button>
            <button
              v-if="isToday && !skipped(task) && task.completion === 'photo-log'"
              type="button"
              class="open"
              @click="pickPhoto(task.id)"
            >
              上传图片
            </button>
            <button v-if="isFuture" type="button" class="open" @click="editTask(task.id)">修改任务</button>
            <button
              v-if="task.longTerm && (isToday || isFuture)"
              type="button"
              class="open"
              @click="toggleSkip(task)"
            >
              {{ skipped(task) ? '取消跳过' : '今天不练' }}
            </button>
            <button v-if="taskHasGallery(task)" type="button" class="open" @click="openGallery(task.id)">
              查看作品墙
            </button>
            <button v-if="canReviewNotes(task)" type="button" class="open" @click="openReview(task.id)">
              批注回顾
            </button>
          </div>
        </div>

        <div v-if="canEditJournal" class="block">
          <p class="label">日记</p>
          <p v-if="journalText" class="entry">{{ journalText }}</p>
          <div v-if="journalPhotos.length" class="thumbs">
            <button
              v-for="(item, i) in journalPhotos"
              :key="item.id"
              type="button"
              class="thumb"
              @click="openJournalPhoto(i)"
            >
              <img :src="item.thumbUrl" alt="" />
            </button>
          </div>
          <p v-else-if="!journalExists" class="muted">未写</p>
        </div>
      </div>
    </section>

    <input ref="fileRef" class="hidden" type="file" accept="image/*" multiple @change="onFiles" />

    <PhotoViewer
      :open="viewerOpen"
      :photos="viewerPhotos"
      :start-index="startIndex"
      :deletable="viewerDeletable"
      title="那天的图"
      @close="viewerOpen = false"
      @delete="onDelete"
    />

    <div v-if="reviewOpen" class="modal-mask" @click.self="closeReview">
      <div class="modal-sheet review-sheet">
        <template v-if="!reviewDetail">
          <h2 class="modal-title">批注回顾</h2>
          <div v-if="reviewChips" class="review-chips">
            <button type="button" :class="{ on: !reviewFilter }" @click="reviewFilter = ''">全部</button>
            <button
              v-for="task in reviewTasks"
              :key="task.id"
              type="button"
              :class="{ on: reviewFilter === task.id }"
              @click="reviewFilter = task.id"
            >
              {{ task.title }}
            </button>
          </div>
          <p v-if="!reviewEntries.length" class="modal-copy">还没有批注可以回顾</p>
          <button
            v-for="entry in reviewEntries"
            :key="`${entry.taskId}-${entry.date}`"
            type="button"
            class="review-row"
            @click="reviewDetail = entry"
          >
            <strong>{{ formatDayTitle(entry.date) }}</strong>
            <em>{{ reviewTaskTitle(entry.taskId) }}</em>
            <span>{{ notePreview(entry.text) }}</span>
          </button>
        </template>
        <template v-else>
          <h2 class="modal-title">{{ formatDayTitle(reviewDetail.date) }}</h2>
          <p class="modal-copy">{{ reviewTaskTitle(reviewDetail.taskId) }}</p>
          <pre class="review-body">{{ reviewDetail.text }}</pre>
          <div class="modal-actions">
            <button class="btn btn-ghost" type="button" @click="reviewDetail = null">返回列表</button>
          </div>
        </template>
        <div class="modal-actions">
          <button class="btn btn-ghost" type="button" @click="closeReview">关闭</button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.page {
  height: 100%;
  overflow: auto;
  overflow-x: hidden;
  padding: calc(12px + var(--safe-top)) 16px calc(var(--tab-h) + 16px);
  max-width: var(--page-max);
  margin: 0 auto;
}

.page.locked {
  overflow: hidden;
}

.review-btn {
  justify-self: end;
  min-height: 44px;
  padding: 0 4px;
  color: var(--amber);
  font-weight: 650;
}

.head {
  display: grid;
  grid-template-columns: minmax(0, 72px) 1fr minmax(0, 72px);
  align-items: center;
}

.head .brand {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  letter-spacing: 0.28em;
}

.head h1 {
  margin: 0;
  text-align: center;
  font-size: var(--fs-lg);
}

.back {
  min-height: 44px;
  color: var(--amber);
  font-weight: 650;
}

.cal {
  margin-top: 18px;
  padding: 14px 12px 16px;
  border-radius: var(--radius);
  background: var(--bg-elev);
}

.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.nav-mid {
  display: grid;
  justify-items: center;
  gap: 6px;
}

.view-switch {
  display: flex;
  gap: 4px;
}

.view-switch button {
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--bg-soft);
  color: var(--muted);
  font-size: 12px;
  font-weight: 650;
}

.view-switch button.on {
  background: var(--amber);
  color: var(--ink);
}

.week-meta {
  margin: 0 0 10px;
  text-align: center;
  color: var(--muted);
  font-size: 13px;
}

.nav button {
  color: var(--amber);
  min-height: 36px;
  font-size: 13px;
}

.week,
.grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.week span {
  text-align: center;
  color: var(--muted);
  font-size: 12px;
  padding: 6px 0;
}

.cell {
  position: relative;
  height: var(--cell);
  border-radius: 10px;
  color: var(--text);
}

.grid.week .cell {
  height: 72px;
}

.cell.empty,
.cell:disabled {
  opacity: 0;
}

.cell.today span {
  color: var(--amber);
  font-weight: 750;
}

.cell.on {
  background: rgba(226, 162, 58, 0.16);
}

.bar {
  position: absolute;
  left: 6px;
  right: 6px;
  bottom: 6px;
  height: 4px;
  border-radius: 99px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
}

.bar.full {
  box-shadow: 0 0 0 1px rgba(143, 191, 136, 0.35);
}

.seg {
  flex: 1;
}

.detail {
  margin-top: 16px;
  padding: 16px 18px 18px;
  border-radius: var(--radius);
  background: var(--bg-elev);
}

.detail h2 {
  margin: 0 0 10px;
  font-size: var(--fs-md);
}

.summary-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
}

.summary-head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}

.summary-head span {
  color: var(--muted);
  font-size: 13px;
  font-weight: 650;
}

.day-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 6px;
}

.block {
  margin-top: 12px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.summary-head + .ok,
.summary-head + .muted,
.summary-head + .block {
  margin-top: 8px;
}

.task-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 8px;
  font-weight: 650;
  min-width: 0;
  overflow-wrap: anywhere;
}

.label i {
  width: 10px;
  height: 6px;
  border-radius: 99px;
  display: inline-block;
}

.label em {
  color: var(--muted);
  font-style: normal;
  font-size: 12px;
  font-weight: 650;
}

.mini-ok,
.mini-muted {
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 650;
}

.mini-ok {
  color: var(--ok);
}

.mini-muted {
  color: var(--muted);
}

.digits {
  margin: 0;
  font-size: 32px;
  font-weight: 720;
  font-variant-numeric: tabular-nums;
}

.digits span {
  margin-left: 6px;
  font-size: 15px;
  color: var(--muted);
  font-weight: 500;
}

.ok {
  margin: 8px 0 0;
  color: var(--ok);
  font-weight: 650;
}

.muted {
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.55;
}

.thumbs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.thumb {
  width: 72px;
  height: 72px;
  border-radius: 8px;
  overflow: hidden;
  background: #000;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.entry {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.7;
  font-size: 15px;
}

.open {
  margin-top: 12px;
  color: var(--amber);
  font-weight: 650;
  min-height: 40px;
  overflow-wrap: anywhere;
}

.day-actions .open {
  margin-top: 0;
}

.task-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  column-gap: 20px;
  row-gap: 4px;
  margin-top: 10px;
}

.task-actions .open {
  margin-top: 0;
  min-height: 44px;
  padding: 0 2px;
}

.subtasks {
  display: grid;
  gap: 8px;
}

.subtask {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 42px;
  color: var(--text);
  text-align: left;
}

div.subtask {
  cursor: default;
}

.subtask i {
  width: 26px;
  height: 26px;
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

.day-check {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 42px;
  color: var(--text);
  text-align: left;
}

.day-check:disabled {
  color: var(--muted);
}

.day-check i {
  width: 26px;
  height: 26px;
  flex: 0 0 auto;
  border: 2px solid var(--muted);
  border-radius: 50%;
}

.day-check.on {
  color: var(--muted);
  text-decoration: line-through;
}

.day-check.on i {
  border-color: var(--ok);
  background: var(--ok);
}

.hidden {
  display: none;
}

.page :deep(.modal-mask) {
  z-index: 80;
}

.review-sheet {
  max-height: min(86dvh, 720px);
}

.review-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 14px;
}

.review-chips button {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  background: var(--bg-soft);
  color: var(--muted);
  font-weight: 650;
}

.review-chips button.on {
  background: var(--amber);
  color: var(--ink);
}

.review-row {
  display: grid;
  gap: 4px;
  width: 100%;
  margin: 0 0 10px;
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--bg-soft);
  text-align: left;
  color: var(--text);
}

.review-row strong,
.review-row em,
.review-row span {
  display: block;
}

.review-row em {
  color: var(--muted);
  font-style: normal;
  font-size: var(--fs-sm);
}

.review-row span {
  color: var(--muted);
  font-size: var(--fs-sm);
  line-height: 1.45;
}

.review-body {
  margin: 0 0 16px;
  white-space: pre-wrap;
  word-break: break-word;
  font: inherit;
  color: var(--text);
  line-height: 1.55;
}
</style>
