<script setup>
import { computed, onActivated, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import NotesOverlay from '../components/NotesOverlay.vue'
import PracticeCounter from '../components/PracticeCounter.vue'
import SheetViewer from '../components/SheetViewer.vue'
import * as db from '../db'
import {
  addFiles,
  addPiece,
  assignSheetPiece,
  currentPieceOf,
  notifyCloud,
  openTask,
  practice,
  removeAsset,
  setCurrentPiece,
  setInk,
  studio,
} from '../stores/practice'
import { confirmDialog, toast } from '../stores/ui'

defineOptions({ name: 'Sheet' })

const COLORS = ['#1c1410', '#c23b22', '#1f6feb', '#e6b800']
const WIDTHS = [
  { key: 'thin', value: 0.003, label: '细' },
  { key: 'mid', value: 0.007, label: '中' },
  { key: 'thick', value: 0.014, label: '粗' },
]

const router = useRouter()
const route = useRoute()
const viewer = ref(null)
const fileRef = ref(null)
const strokes = ref([])
const redoStack = ref([])
const toolsOpen = ref(false)
const pieceOpen = ref(false)
const pieceNaming = ref(false)
const pieceDraft = ref('')

const page = computed(() => practice.sheets[studio.sheetIndex] || null)
const pageLabel = computed(() => {
  if (!practice.sheets.length) return '0/0'
  return `${studio.sheetIndex + 1}/${practice.sheets.length}`
})
const hasSheets = computed(() => practice.sheets.length > 0)
const isCounter = computed(() => practice.task.completion === 'counter')
const currentPiece = computed(() => currentPieceOf(practice.task))
const pieceName = computed(() => currentPiece.value?.title || '未分组')
const pieceList = computed(() => [
  { id: '', title: '未分组' },
  ...(Array.isArray(practice.task.pieces) ? practice.task.pieces : []),
])
const emptyTitle = computed(() => practice.task.title || '曲谱')

function fallbackSheetPath() {
  const current = practice.tasks.find((item) => item.id === practice.task.id)
  if (!current) return '/'
  const components = Array.isArray(current.components) ? current.components : []
  if (current.sheet || components.includes('sheet')) return `/sheet/${current.id}`
  return '/'
}

async function syncTaskFromRoute() {
  if (!practice.ready) return false
  if (route.name !== 'sheet') return false
  const id = String(route.params.taskId || '')
  if (!id) {
    router.replace(fallbackSheetPath())
    return false
  }
  const ok = await openTask(id)
  if (!ok) {
    toast('没有找到这个任务')
    await router.replace({ path: '/' })
    return false
  }
  return true
}

async function loadStrokes() {
  if (!page.value) {
    strokes.value = []
    return
  }
  strokes.value = await db.strokesGet(page.value.id)
  redoStack.value = []
}

watch(
  () => [studio.sheetIndex, page.value?.id],
  () => {
    loadStrokes()
  },
  { immediate: true },
)

function pick() {
  fileRef.value?.click()
}

async function onFiles(event) {
  const files = event.target.files
  const id = String(route.params.taskId || practice.task.id)
  if (!(await syncTaskFromRoute())) {
    event.target.value = ''
    return
  }
  const added = await addFiles('sheet', files, id)
  event.target.value = ''
  if (added.length) studio.sheetIndex = practice.sheets.length - added.length
}

async function persistStrokes(next) {
  if (!page.value) return
  await db.strokesPut(page.value.id, next)
  notifyCloud()
}

async function commitStroke(stroke) {
  if (!page.value) return
  strokes.value = [...strokes.value, stroke]
  redoStack.value = []
  await persistStrokes(strokes.value)
}

async function undo() {
  if (!page.value || !strokes.value.length) return
  const last = strokes.value[strokes.value.length - 1]
  redoStack.value = [...redoStack.value, last]
  strokes.value = strokes.value.slice(0, -1)
  await persistStrokes(strokes.value)
}

async function redo() {
  if (!page.value || !redoStack.value.length) return
  const next = redoStack.value[redoStack.value.length - 1]
  redoStack.value = redoStack.value.slice(0, -1)
  strokes.value = [...strokes.value, next]
  await persistStrokes(strokes.value)
}

function onGesture(action) {
  if (action === 'redo') {
    redo()
    return
  }
  undo()
}

async function clearPage() {
  if (!page.value || !strokes.value.length) return
  const ok = await confirmDialog({
    title: '清掉这一页上的记号？',
    copy: '谱还在，只去掉涂写。',
    ok: '清空',
    danger: true,
  })
  if (!ok) return
  strokes.value = []
  redoStack.value = []
  await persistStrokes([])
}

async function removePage(index) {
  const item = practice.sheets[index]
  if (!item) return
  const ok = await confirmDialog({
    title: '删除这一页曲谱？',
    copy: '图片和这页上的记号都会删掉。',
    ok: '删除',
    danger: true,
  })
  if (!ok) return
  await removeAsset(item.id)
}

function setMode(mode) {
  studio.mode = mode
}

function hideTools() {
  toolsOpen.value = false
  pieceOpen.value = false
  pieceNaming.value = false
}

function openPieces() {
  if (!hasSheets.value) return
  pieceOpen.value = true
  pieceNaming.value = false
  pieceDraft.value = ''
}

async function choosePiece(id) {
  await setCurrentPiece(id)
  if (page.value) await assignSheetPiece(page.value.id, id)
  pieceOpen.value = false
  pieceNaming.value = false
}

function startNewPiece() {
  const n = (practice.task.pieces || []).length + 1
  pieceDraft.value = `第${n}首`
  pieceNaming.value = true
}

async function confirmNewPiece() {
  const piece = await addPiece(pieceDraft.value)
  if (piece && page.value) await assignSheetPiece(page.value.id, piece.id)
  pieceOpen.value = false
  pieceNaming.value = false
  pieceDraft.value = ''
}

function onPen() {
  if (studio.ink === 'pencil') return
  setInk('pencil')
  toast('已切换到笔模式：用 Apple Pencil 写，手掌和手指不会留下笔迹')
}

function useFinger() {
  setInk('finger')
  toast('手指绘画：单指画，双指缩放')
}

function usePencil() {
  setInk('pencil')
  toast('笔模式：Pencil 画画，手指只挪谱、缩放')
}

function onSheetTap() {
  if (studio.mode !== 'pan') return
  toolsOpen.value = !toolsOpen.value
}

function zoom(factor) {
  viewer.value?.zoom(factor)
}

function goHome() {
  hideTools()
  studio.notesOpen = false
  router.push(`/task/${practice.task.id}`)
}

onActivated(() => {
  syncTaskFromRoute()
})

watch(() => [route.params.taskId, practice.ready], syncTaskFromRoute, { immediate: true })

onBeforeRouteLeave(() => {
  hideTools()
  studio.notesOpen = false
})
</script>

<template>
  <main class="sheet">
    <header class="hud top">
      <button type="button" class="hud-btn" @click="goHome">返回</button>
      <button v-if="hasSheets" type="button" class="hud-now" @click="openPieces">
        <span v-if="currentPiece || (practice.task.pieces || []).length" class="now-name">{{ pieceName }}</span>
        <span class="page-no">{{ pageLabel }}</span>
      </button>
      <span v-else class="hud-title">{{ emptyTitle }}</span>
      <button type="button" class="hud-btn accent" @click="studio.notesOpen = true">笔记</button>
    </header>

    <section v-if="!practice.sheets.length" class="empty">
      <p>还没有曲谱。拍一张谱或从相册选，练习时它会铺满屏幕。</p>
      <p class="sub">这是「{{ practice.task.title }}」的曲谱墙</p>
      <button class="btn btn-primary" type="button" @click="pick">上传曲谱</button>
    </section>

    <SheetViewer
      v-else-if="page"
      :key="page.id"
      ref="viewer"
      :src="page.url"
      :natural-width="page.width"
      :natural-height="page.height"
      :strokes="strokes"
      :mode="studio.mode"
      :ink="studio.ink"
      :color="studio.color"
      :width="studio.width"
      @commit-stroke="commitStroke"
      @tap="onSheetTap"
      @pen="onPen"
      @gesture="onGesture"
    />

    <footer v-if="hasSheets" class="hud bottom">
      <div v-if="toolsOpen" class="tools-stack">
        <div class="modes">
          <button type="button" :class="{ on: studio.mode === 'pan' }" @click="setMode('pan')">浏览</button>
          <button type="button" :class="{ on: studio.mode === 'pen' }" @click="setMode('pen')">画笔</button>
          <button type="button" :class="{ on: studio.mode === 'eraser' }" @click="setMode('eraser')">橡皮</button>
          <button type="button" :class="{ on: studio.ink === 'finger' }" @click="useFinger">手指</button>
          <button type="button" :class="{ on: studio.ink === 'pencil' }" @click="usePencil">笔</button>
          <button type="button" @click="zoom(1 / 1.25)">−</button>
          <button type="button" @click="zoom(1.25)">+</button>
          <button type="button" @click="hideTools">收起</button>
        </div>

        <div class="tools">
          <button
            v-for="color in COLORS"
            :key="color"
            type="button"
            class="swatch"
            :class="{ on: studio.color === color }"
            :style="{ background: color }"
            @click="studio.color = color; studio.mode = 'pen'"
          />
          <button
            v-for="item in WIDTHS"
            :key="item.key"
            type="button"
            class="chip"
            :class="{ on: studio.width === item.value }"
            @click="studio.width = item.value"
          >
            {{ item.label }}
          </button>
          <button type="button" class="chip" @click="undo">撤销</button>
          <button type="button" class="chip" @click="redo">恢复</button>
          <button type="button" class="chip" @click="clearPage">清空</button>
          <button type="button" class="chip" @click="pick">加页</button>
        </div>

        <div class="thumbs">
          <button
            v-for="(item, i) in practice.sheets"
            :key="item.id"
            type="button"
            class="thumb"
            :class="{ on: i === studio.sheetIndex }"
            @click="studio.sheetIndex = i"
          >
            <img :src="item.thumbUrl" alt="" />
          </button>
          <button
            v-if="page"
            type="button"
            class="kill"
            @click="removePage(studio.sheetIndex)"
          >
            删页
          </button>
        </div>
      </div>

      <div class="dock">
        <PracticeCounter v-if="isCounter" variant="pill" />
        <button type="button" class="hud-btn dock-tools" @click="toolsOpen = !toolsOpen">
          {{ toolsOpen ? '收起' : '工具' }}
        </button>
      </div>
    </footer>

    <div v-if="pieceOpen" class="piece-mask" @click.self="pieceOpen = false">
      <div class="piece-sheet">
        <h2>当前曲</h2>
        <button
          v-for="item in pieceList"
          :key="item.id || 'ungrouped'"
          type="button"
          class="piece-row"
          :class="{ on: String(practice.task.currentPieceId || '') === String(item.id || '') }"
          @click="choosePiece(item.id)"
        >
          {{ item.title }}
        </button>
        <form v-if="pieceNaming" class="piece-form" @submit.prevent="confirmNewPiece">
          <input v-model="pieceDraft" maxlength="20" placeholder="曲名" />
          <button class="btn btn-primary" type="submit">添加</button>
        </form>
        <button v-else type="button" class="piece-row add" @click="startNewPiece">新的一首</button>
        <button type="button" class="piece-cancel" @click="pieceOpen = false">取消</button>
      </div>
    </div>

    <NotesOverlay
      :open="studio.notesOpen"
      :task-id="String(route.params.taskId || practice.task.id)"
      @close="studio.notesOpen = false"
    />
    <input ref="fileRef" class="hidden" type="file" accept="image/*" multiple @change="onFiles" />
  </main>
</template>

<style scoped>
.sheet {
  position: relative;
  height: 100%;
  overflow: hidden;
  background: #0e0c0a;
  overscroll-behavior: none;
  touch-action: manipulation;
}

.hud {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 5;
  pointer-events: none;
}

.hud > * ,
.hud button,
.hud :deep(.counter) {
  pointer-events: auto;
}

.top {
  top: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: calc(8px + var(--safe-top)) 10px 8px;
  background: linear-gradient(to bottom, rgba(14, 12, 10, 0.78), transparent);
}

.hud-title,
.hud-now {
  flex: 1;
  min-width: 0;
  color: var(--paper);
  text-align: center;
}

.hud-title {
  font-weight: 650;
  font-size: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hud-now {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-height: 40px;
  justify-content: center;
}

.now-name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 650;
  font-size: 14px;
}

.page-no {
  color: var(--paper);
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  opacity: 0.82;
}

.hud-btn {
  min-height: 40px;
  padding: 0 10px;
  color: var(--paper);
  font-weight: 650;
}

.hud-btn.accent {
  color: var(--amber);
  margin-left: 0;
}

.empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 24px;
  color: var(--muted);
  text-align: center;
  line-height: 1.6;
}

.empty p {
  margin: 0;
  max-width: 280px;
}

.empty .sub {
  color: var(--paper);
  font-weight: 650;
}

.bottom {
  bottom: 0;
  padding: 8px 10px calc(8px + var(--safe-bottom));
  background: linear-gradient(to top, rgba(14, 12, 10, 0.88), transparent);
}

.dock {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dock :deep(.counter) {
  margin-right: auto;
}

.dock-tools {
  margin-left: auto;
}

.tools-stack {
  margin-bottom: 10px;
}

.piece-mask {
  position: absolute;
  inset: 0;
  z-index: 8;
  background: rgba(8, 6, 5, 0.46);
  display: flex;
  align-items: flex-end;
  pointer-events: auto;
}

.piece-sheet {
  width: 100%;
  padding: 18px 16px calc(16px + var(--safe-bottom));
  border-radius: 22px 22px 0 0;
  background: var(--bg-elev);
  color: var(--text);
}

.piece-sheet h2 {
  margin: 0 0 12px;
  font-size: 18px;
}

.piece-row,
.piece-cancel {
  width: 100%;
  min-height: 48px;
  padding: 0 14px;
  border-radius: 14px;
  text-align: left;
  font-weight: 650;
}

.piece-row {
  margin-bottom: 8px;
  background: var(--bg-soft);
  color: var(--text);
}

.piece-row.on {
  background: var(--amber);
  color: var(--ink);
}

.piece-row.add {
  background: transparent;
  border: 1px dashed var(--line);
  color: var(--muted);
}

.piece-form {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.piece-form input {
  flex: 1;
  min-height: 48px;
  padding: 0 14px;
  border-radius: 14px;
  background: var(--bg-soft);
  color: var(--text);
}

.piece-cancel {
  margin-top: 4px;
  text-align: center;
  color: var(--muted);
}

.modes,
.tools,
.thumbs {
  display: flex;
  gap: 8px;
  align-items: center;
  overflow-x: auto;
}

.modes {
  margin-bottom: 8px;
}

.modes button,
.chip {
  flex: 0 0 auto;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--paper);
  font-size: 13px;
}

@media (min-width: 700px) {
  .modes button,
  .chip {
    min-height: 44px;
    font-size: 16px;
    padding: 0 16px;
  }
}

.modes button.on,
.chip.on {
  background: var(--amber);
  color: var(--ink);
}

.tools {
  margin-bottom: 8px;
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

.thumbs {
  padding-top: 4px;
}

.thumb {
  flex: 0 0 48px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  border: 2px solid transparent;
  background: #000;
}

.thumb.on {
  border-color: var(--amber);
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.kill {
  margin-left: auto;
  color: var(--danger);
  font-size: 13px;
}

.hidden {
  display: none;
}
</style>
