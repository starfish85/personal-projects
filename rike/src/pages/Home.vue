<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  DEFAULT_RICH_COMPONENTS,
  TASK_COMPONENTS,
  TASK_COLORS,
  TASK_TEMPLATES,
  addTask,
  dayComplete,
  openTask,
  pinTask,
  practice,
  removeTask,
  restoreTask,
  subtaskDone,
  taskTodayLine,
  taskDoneToday,
  tasksOnDate,
  toggleCheck,
  toggleSubtask,
  updateTask,
} from '../stores/practice'
import SyncBar from '../components/SyncBar.vue'
import TimePicker from '../components/TimePicker.vue'
import { confirmDialog } from '../stores/ui'
import { localDateKey } from '../utils/date'
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
const form = reactive({
  title: '',
  color: TASK_COLORS[0],
  completion: 'check',
  reminder: '',
  sheet: false,
  notes: false,
  template: 'check',
  components: [],
  subtasks: [],
  dueDate: localDateKey(),
  longTerm: false,
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

function applyTemplate(item) {
  form.template = item.id
  form.completion = item.completion
  form.sheet = item.sheet
  form.notes = item.notes
  form.components = [...(item.components || [])]
  form.subtasks = []
  form.color = item.color || form.color
  if (!form.title || TASK_TEMPLATES.some((t) => t.defaultTitle === form.title || t.title === form.title)) {
    form.title = item.defaultTitle || item.title
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
  form.dueDate = String(route.query.date || localDateKey())
  form.longTerm = false
  form.paused = false
  applyTemplate(TASK_TEMPLATES.find((item) => item.id === 'custom') || TASK_TEMPLATES[0])
  form.color = TASK_COLORS.find((c) => !practice.tasks.some((t) => t.color === c)) || form.color
  editorStep.value = 'template'
  editor.value = { mode: 'add' }
}

function openEdit(task) {
  closeSwipe()
  form.title = task.title
  form.color = task.color
  form.completion = task.completion
  form.reminder = task.reminder || ''
  form.sheet = Boolean(task.sheet)
  form.notes = Boolean(task.notes)
  form.components = Array.isArray(task.components) ? [...task.components] : []
  form.subtasks = Array.isArray(task.subtasks) ? task.subtasks.map((item) => ({ ...item })) : []
  form.dueDate = task.dueDate || localDateKey()
  form.longTerm = Boolean(task.longTerm)
  form.paused = Boolean(task.paused)
  form.template =
    TASK_TEMPLATES.find((item) => item.id === task.template)?.id ||
    TASK_TEMPLATES.find((item) => item.completion === task.completion)?.id ||
    'custom'
  editorStep.value = 'details'
  editor.value = { mode: 'edit', id: task.id }
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

function ensureRichComponents() {
  if (form.completion !== 'counter') return form.components.length ? [...form.components] : []
  return form.components.length ? form.components : [...DEFAULT_RICH_COMPONENTS]
}

function goHomeAfterSave() {
  closeEditor()
  expandedId.value = null
  if (location.hash !== '#/') location.hash = '#/'
  router.replace('/')
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

onMounted(openAddFromRoute)
watch(() => [route.query.add, route.query.edit], openAddFromRoute)

function closeEditor() {
  editor.value = null
  editorStep.value = 'details'
}

function backToTemplate() {
  editorStep.value = 'template'
}

async function saveEditor() {
  if (editor.value?.mode === 'add') {
    const task = await addTask({
      title: form.title,
      color: form.color,
      completion: form.completion,
      target: 10,
      reminder: form.reminder,
      template: form.template,
      sheet: form.sheet,
      notes: form.notes,
      components: ensureRichComponents(),
      subtasks: cleanSubtasks(),
      dueDate: form.dueDate,
      longTerm: form.longTerm,
      paused: form.paused,
    })
    if (task) {
      if (form.reminder) await ensureNotifyPermission()
      goHomeAfterSave()
    }
    return
  }
  const ok = await updateTask(editor.value.id, {
    title: form.title,
    color: form.color,
    reminder: form.reminder,
    template: form.template,
    sheet: form.sheet,
    notes: form.notes,
    components: ensureRichComponents(),
    subtasks: cleanSubtasks(),
    dueDate: form.dueDate,
    longTerm: form.longTerm,
    paused: form.paused,
  })
  if (ok) {
    if (form.reminder) await ensureNotifyPermission()
    goHomeAfterSave()
  }
}

async function deleteCurrent() {
  const ok = await confirmDialog({
    title: '归档这个任务？',
    copy: '首页和日历里不再出现它。以前的记录和图片还在本机。',
    ok: '归档',
    danger: true,
  })
  if (!ok) return
  await removeTask(editor.value.id)
  closeEditor()
}

function isDone(task) {
  return dayComplete(task, practice.todayByTask[task.id])
}

function visibleTasks() {
  return tasksOnDate(practice.date).sort((a, b) => {
    const ad = taskDoneToday(a) ? 1 : 0
    const bd = taskDoneToday(b) ? 1 : 0
    if (ad !== bd) return ad - bd
    const ap = a.pinned ? 1 : 0
    const bp = b.pinned ? 1 : 0
    if (ap !== bp) return bp - ap
    if (ap && (a.pinnedAt || 0) !== (b.pinnedAt || 0)) return (b.pinnedAt || 0) - (a.pinnedAt || 0)
    return (a.order ?? 0) - (b.order ?? 0)
  })
}

function emptyCopy() {
  return practice.tasks.length ? '今天没有安排的日课' : '今天还没有任务'
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
  if (hasSubtasks(task)) {
    expandedId.value = expandedId.value === task.id ? null : task.id
    return
  }
  router.push(`/task/${task.id}`)
}

async function quickCheck(task) {
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

async function toggleSub(task, subtask) {
  closeSwipe()
  await toggleSubtask(task.id, subtask.id)
}
</script>

<template>
  <main class="page" @click="onPageClick" @scroll="closeSwipe">
    <header class="head">
      <p class="brand">日课</p>
      <div class="head-actions">
        <p class="date">{{ practice.date }}</p>
        <button
          v-if="managedTasks().length"
          type="button"
          class="archive-btn"
          @click="archiveOpen = true"
        >
          归档箱
        </button>
      </div>
    </header>
    <SyncBar />

    <section class="links">
      <p v-if="!visibleTasks().length" class="empty">{{ emptyCopy() }}</p>
      <div
        v-for="task in visibleTasks()"
        :key="task.id"
        class="swipe"
        :class="{ done: isDone(task), expanded: expandedId === task.id }"
      >
        <div class="actions" aria-hidden="true">
          <button type="button" class="act edit" @click="openEdit(task)">修改</button>
          <button type="button" class="act del" @click="deleteFromList(task)">归档</button>
          <button type="button" class="act pin" @click="pinFromList(task)">
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
            <span>{{ taskTodayLine(task) }}{{ task.reminder ? ` · ${task.reminder}` : '' }}</span>
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
            v-if="task.completion === 'check'"
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
            :class="{ on: subtaskDone(task.id, subtask.id) }"
            @click="toggleSub(task, subtask)"
          >
            <i />
            <span>{{ subtask.title }}</span>
          </button>
        </div>
      </div>
    </section>

    <button type="button" class="fab" aria-label="添加任务" @click="openAdd">
      <span>+</span>
    </button>

    <div v-if="editor" class="modal-mask" @click.self="closeEditor">
      <div class="modal-sheet">
        <template v-if="editorStep === 'template'">
          <h2 class="modal-title">选择模板</h2>
          <p class="modal-copy">模板只预设类型和组件，子任务之后自己添加。</p>
          <div class="template-list">
            <button
              v-for="item in TASK_TEMPLATES"
              :key="item.id"
              type="button"
              class="template-card"
              @click="chooseTemplate(item)"
            >
              <i :style="{ background: item.color }" />
              <span>
                <strong>{{ item.title }}</strong>
                <em>{{ item.summary }}</em>
              </span>
            </button>
          </div>
          <div class="modal-actions">
            <button class="btn btn-ghost" type="button" @click="closeEditor">取消</button>
          </div>
        </template>
        <template v-else>
          <div class="modal-head">
            <button v-if="editor.mode === 'add'" type="button" class="back-step" @click="backToTemplate">
              模板
            </button>
            <h2 class="modal-title">{{ editor.mode === 'add' ? '新任务' : '改任务' }}</h2>
            <span />
          </div>
          <p v-if="editor.mode === 'add' && form.dueDate !== practice.date" class="modal-copy">
            安排到 {{ form.dueDate }}
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
            <label>
              <span>完成日期</span>
              <input v-model="form.dueDate" type="date" />
            </label>
            <label class="toggle">
              <input v-model="form.longTerm" type="checkbox" />
              <span>长期任务</span>
            </label>
            <label class="toggle">
              <input v-model="form.paused" type="checkbox" />
              <span>暂停任务</span>
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
          <div class="modal-actions">
            <button v-if="editor.mode === 'edit'" class="btn btn-danger" type="button" @click="deleteCurrent">
              归档
            </button>
            <button class="btn btn-ghost" type="button" @click="closeEditor">取消</button>
            <button class="btn btn-primary" type="button" @click="saveEditor">保存</button>
          </div>
        </template>
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

    <TimePicker v-model="form.reminder" :open="timeOpen" @close="timeOpen = false" />
  </main>
</template>

<style scoped>
.page {
  height: 100%;
  overflow: auto;
  padding: calc(18px + var(--safe-top)) 22px calc(var(--tab-h) + 88px);
  max-width: var(--page-max);
  margin: 0 auto;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
}

.brand {
  margin: 0;
  font-size: var(--fs-xl);
  letter-spacing: 0.42em;
  font-weight: 650;
}

.date {
  margin: 0;
  color: var(--muted);
  font-size: var(--fs-sm);
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
  margin-top: 28px;
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

.swipe.done .card strong,
.swipe.done .card span {
  color: var(--muted);
}

.actions {
  position: absolute;
  inset: 0 0 0 auto;
  display: flex;
  width: 192px;
}

.act {
  width: 64px;
  height: 100%;
  color: #fff;
  font-size: 13px;
  font-weight: 650;
}

.act.edit {
  background: #6b8498;
}

.act.del {
  background: var(--danger);
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

.date-row label {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--muted);
}

.date-row label:first-child span {
  flex: 0 0 auto;
}

.date-row input[type='date'] {
  flex: 1;
  min-width: 0;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--bg);
  color: var(--text);
  font-size: 16px;
}

.date-row .toggle {
  min-height: 42px;
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
