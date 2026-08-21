<script setup>
import { computed, onActivated, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import NotesOverlay from '../components/NotesOverlay.vue'
import PracticeCounter from '../components/PracticeCounter.vue'
import SheetViewer from '../components/SheetViewer.vue'
import * as db from '../db'
import { addFiles, ensureToday, practice, removeAsset, setInk, studio } from '../stores/practice'
import { confirmDialog, toast } from '../stores/ui'

defineOptions({ name: 'Sheet' })

const COLORS = ['#1c1410', '#c23b22', '#1f6feb', '#e6b800']
const WIDTHS = [
  { key: 'thin', value: 0.003, label: '细' },
  { key: 'mid', value: 0.007, label: '中' },
  { key: 'thick', value: 0.014, label: '粗' },
]

const router = useRouter()
const viewer = ref(null)
const fileRef = ref(null)
const strokes = ref([])
const toolsOpen = ref(false)

const page = computed(() => practice.sheets[studio.sheetIndex] || null)
const pageLabel = computed(() => {
  if (!practice.sheets.length) return '0/0'
  return `${studio.sheetIndex + 1}/${practice.sheets.length}`
})

async function loadStrokes() {
  if (!page.value) {
    strokes.value = []
    return
  }
  strokes.value = await db.strokesGet(page.value.id)
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
  const added = await addFiles('sheet', event.target.files)
  event.target.value = ''
  if (added.length) studio.sheetIndex = practice.sheets.length - added.length
}

async function commitStroke(stroke) {
  if (!page.value) return
  strokes.value = [...strokes.value, stroke]
  await db.strokesPut(page.value.id, strokes.value)
}

async function undo() {
  if (!page.value || !strokes.value.length) return
  strokes.value = strokes.value.slice(0, -1)
  await db.strokesPut(page.value.id, strokes.value)
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
  await db.strokesPut(page.value.id, [])
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
  router.push('/')
}

onActivated(() => {
  ensureToday()
})

onBeforeRouteLeave(() => {
  hideTools()
  studio.notesOpen = false
})
</script>

<template>
  <main class="sheet">
    <header class="hud top">
      <button type="button" class="hud-btn" @click="goHome">返回</button>
      <span class="page-no">{{ pageLabel }}</span>
      <PracticeCounter variant="pill" />
      <button type="button" class="hud-btn" @click="toolsOpen = !toolsOpen">
        {{ toolsOpen ? '收起' : '工具' }}
      </button>
      <button type="button" class="hud-btn accent" @click="studio.notesOpen = true">笔记</button>
    </header>

    <section v-if="!practice.sheets.length" class="empty">
      <p>还没有曲谱。拍一张谱或从相册选，练习时它会铺满屏幕。</p>
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
    />

    <footer v-if="practice.sheets.length && toolsOpen" class="hud bottom">
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
    </footer>

    <NotesOverlay :open="studio.notesOpen" @close="studio.notesOpen = false" />
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

.page-no {
  color: var(--paper);
  font-variant-numeric: tabular-nums;
  font-size: 13px;
}

.top :deep(.counter) {
  margin-left: auto;
}

.hud-btn {
  min-height: 40px;
  padding: 0 10px;
  color: var(--paper);
  font-weight: 650;
}

.hud-btn.accent {
  color: var(--amber);
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

.bottom {
  bottom: 0;
  padding: 8px 10px calc(8px + var(--safe-bottom));
  background: linear-gradient(to top, rgba(14, 12, 10, 0.88), transparent);
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
