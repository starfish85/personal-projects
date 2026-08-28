<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  addCheckins,
  addHelperImages,
  addPracticeSeconds,
  checkinsOn,
  helperImagesForTask,
  practice,
  removeAsset,
  removeCheckin,
  saveTaskNote,
  taskNoteOn,
  taskHasComponent,
  taskHasGallery,
  taskLogsImages,
} from '../stores/practice'
import { confirmDialog, toast } from '../stores/ui'

const router = useRouter()
const fileRef = ref(null)
const noteDraft = ref('')
const timerMode = ref('down')
const timerMinutes = ref(25)
const timerSeconds = ref(25 * 60)
const timerOn = ref(false)
const timerFull = ref(false)
let timer = 0
let sessionAnchor = 0

async function settleSegment() {
  let elapsed = 0
  if (timerMode.value === 'down') elapsed = Math.max(0, sessionAnchor - timerSeconds.value)
  else elapsed = Math.max(0, timerSeconds.value - sessionAnchor)
  sessionAnchor = timerSeconds.value
  if (elapsed > 0) await addPracticeSeconds(elapsed)
}

const components = computed(() => ({
  sheet: taskHasComponent('sheet'),
  notes: taskHasComponent('notes'),
  pomodoro: taskHasComponent('pomodoro'),
  images: taskHasComponent('images') && practice.task.completion !== 'photo-log',
  annotation: taskHasComponent('annotation'),
}))
const imageCheckin = computed(() => taskLogsImages(practice.task))
const panelImages = computed(() => {
  if (!imageCheckin.value) return practice.helperImages
  const today = checkinsOn(practice.date, practice.task.id)
  const leftovers = helperImagesForTask(practice.task.id)
  const seen = new Set(today.map((item) => item.id))
  return [...today, ...leftovers.filter((item) => !seen.has(item.id))]
})

const timerLabel = computed(() => {
  const mins = Math.floor(timerSeconds.value / 60)
  const secs = timerSeconds.value % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
})

const timerStateLabel = computed(() => {
  if (timerOn.value) return timerMode.value === 'down' ? '倒计时中' : '正计时中'
  if (timerMode.value === 'down' && timerSeconds.value === 0) return '已结束'
  if (timerSeconds.value > 0) return '已暂停'
  return '准备开始'
})

watch(
  () => [practice.task.id, practice.date],
  ([id, date], prev) => {
    if (prev?.[0] && prev[0] !== id && timerOn.value) settleSegment()
    noteDraft.value = taskNoteOn(id, date)
    if (!prev || prev[0] !== id) {
      window.clearInterval(timer)
      timerOn.value = false
      timerSeconds.value = timerMode.value === 'down' ? timerMinutes.value * 60 : 0
      sessionAnchor = timerSeconds.value
    }
  },
  { immediate: true },
)

function pick() {
  fileRef.value?.click()
}

async function onFiles(event) {
  const files = event.target.files
  const added = imageCheckin.value
    ? await addCheckins(files, null, practice.task.id)
    : await addHelperImages(files, practice.task.id)
  event.target.value = ''
  if (added.length && !imageCheckin.value) toast('图片已插入')
}

async function deleteImage(item) {
  const ok = await confirmDialog({
    title: '删除这张图片？',
    copy: item.role === 'checkin' ? '删掉后日历和作品墙里也会少一张。' : '这只会删掉本机图片，不影响已同步的文字和任务记录。',
    ok: '删除',
    danger: true,
  })
  if (!ok) return
  if (item.role === 'checkin') await removeCheckin(item.id)
  else await removeAsset(item.id)
}

function tick() {
  if (timerMode.value === 'up') {
    timerSeconds.value += 1
    return
  }
  if (timerSeconds.value <= 1) {
    timerSeconds.value = 0
    timerOn.value = false
    window.clearInterval(timer)
    settleSegment()
    toast('番茄钟结束')
    return
  }
  timerSeconds.value -= 1
}

function startTimer() {
  const minutes = Math.max(1, Math.min(180, Math.round(Number(timerMinutes.value) || 25)))
  timerMinutes.value = minutes
  if (timerMode.value === 'down' && (timerSeconds.value <= 0 || timerSeconds.value > minutes * 60)) {
    timerSeconds.value = minutes * 60
  }
  sessionAnchor = timerSeconds.value
  timerOn.value = true
  timerFull.value = true
  window.clearInterval(timer)
  timer = window.setInterval(tick, 1000)
}

function pauseTimer() {
  if (timerOn.value) settleSegment()
  timerOn.value = false
  window.clearInterval(timer)
}

function toggleTimer() {
  if (timerOn.value) pauseTimer()
  else startTimer()
}

function resetTimer(minutes) {
  if (timerOn.value) settleSegment()
  window.clearInterval(timer)
  timerOn.value = false
  if (minutes) timerMinutes.value = minutes
  timerSeconds.value = timerMode.value === 'down' ? timerMinutes.value * 60 : 0
  sessionAnchor = timerSeconds.value
}

function onMinuteInput() {
  const minutes = Math.max(1, Math.min(180, Math.round(Number(timerMinutes.value) || 25)))
  timerMinutes.value = minutes
  if (!timerOn.value && timerMode.value === 'down') timerSeconds.value = minutes * 60
}

function closeFullTimer() {
  timerFull.value = false
}

function setTimerMode(mode) {
  if (timerMode.value === mode) return
  pauseTimer()
  timerMode.value = mode
  timerSeconds.value = mode === 'down' ? timerMinutes.value * 60 : 0
}

function openFullTimer() {
  timerFull.value = true
}

async function saveNote() {
  await saveTaskNote(practice.task.id, noteDraft.value)
  toast('批注已保存')
}

onBeforeUnmount(() => {
  if (timerOn.value) settleSegment()
  window.clearInterval(timer)
})
</script>

<template>
  <section v-if="Object.values(components).some(Boolean)" class="helpers">
    <button v-if="components.sheet" class="panel link-card" type="button" @click="router.push(`/sheet/${practice.task.id}`)">
      <strong>曲谱</strong>
      <span>{{ practice.sheets.length ? `${practice.sheets.length} 页` : '还没有谱' }}</span>
    </button>

    <button v-if="components.notes" class="panel link-card" type="button" @click="router.push(`/notes/${practice.task.id}`)">
      <strong>笔记</strong>
      <span>{{ practice.notes.length ? `${practice.notes.length} 张` : '还没有笔记' }}</span>
    </button>

    <article v-if="components.pomodoro" class="panel timer">
      <div class="panel-head">
        <div>
          <strong>番茄钟</strong>
          <span>{{ timerStateLabel }}</span>
        </div>
        <button type="button" class="mini" @click="openFullTimer">全屏</button>
      </div>
      <div class="timer-tabs">
        <button type="button" :class="{ on: timerMode === 'down' }" @click="setTimerMode('down')">
          倒计时
        </button>
        <button type="button" :class="{ on: timerMode === 'up' }" @click="setTimerMode('up')">
          正计时
        </button>
      </div>
      <p>{{ timerLabel }}</p>
      <label v-if="timerMode === 'down'" class="duration">
        <span>分钟</span>
        <input v-model="timerMinutes" type="number" min="1" max="180" inputmode="numeric" @change="onMinuteInput" />
      </label>
      <div class="row" :class="{ compact: timerMode === 'up' }">
        <button type="button" class="btn btn-primary" @click="toggleTimer">
          {{ timerOn ? '暂停' : '开始' }}
        </button>
        <button type="button" class="btn btn-ghost" @click="resetTimer()">重置</button>
        <button v-if="timerMode === 'down'" type="button" class="btn btn-ghost" @click="resetTimer(25)">25</button>
      </div>
    </article>

    <article v-if="components.images" class="panel">
      <div class="panel-head">
        <div>
          <strong>{{ imageCheckin ? '图片打卡' : '插入图片' }}</strong>
          <span>
            {{
              panelImages.length
                ? `${panelImages.length} 张`
                : imageCheckin
                  ? '拍一张当今天的打卡'
                  : '本机保存'
            }}
          </span>
        </div>
        <button type="button" class="mini" @click="pick">添加</button>
      </div>
      <div v-if="panelImages.length" class="image-grid">
        <button
          v-for="item in panelImages"
          :key="item.id"
          type="button"
          class="thumb"
          @click="deleteImage(item)"
        >
          <img :src="item.thumbUrl" alt="" />
        </button>
      </div>
      <button
        v-if="imageCheckin && taskHasGallery(practice.task)"
        type="button"
        class="mini wall"
        @click="router.push(`/gallery/${practice.task.id}`)"
      >
        查看作品墙
      </button>
      <input ref="fileRef" class="hidden" type="file" accept="image/*" multiple @change="onFiles" />
    </article>

    <article v-if="components.annotation" class="panel">
      <div class="panel-head">
        <div>
          <strong>批注</strong>
          <span>今天 · {{ practice.date }}</span>
        </div>
        <button type="button" class="mini" @click="saveNote">保存</button>
      </div>
      <textarea v-model="noteDraft" class="note" rows="5" placeholder="写下这次任务的要点、提醒或复盘" />
    </article>

    <div v-if="timerFull" class="timer-full">
      <button type="button" class="timer-close" @click="closeFullTimer">收起</button>
      <div class="timer-stage">
        <p class="timer-kicker">{{ practice.task.title }}</p>
        <strong>{{ timerLabel }}</strong>
        <span>{{ timerOn ? (timerMode === 'down' ? '倒计时中' : '正计时中') : '已暂停' }}</span>
      </div>
      <div class="full-actions">
        <button type="button" class="btn btn-primary" @click="toggleTimer">
          {{ timerOn ? '暂停' : '继续' }}
        </button>
        <button type="button" class="btn btn-ghost" @click="resetTimer()">重置</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.helpers {
  display: grid;
  gap: 12px;
  margin-top: 24px;
}

.panel {
  width: 100%;
  text-align: left;
  padding: var(--card-pad);
  border-radius: var(--radius);
  background: var(--bg-elev);
}

.panel strong,
.link-card strong {
  display: block;
  font-size: var(--fs-lg);
}

.panel span,
.link-card span {
  display: block;
  margin-top: 6px;
  color: var(--muted);
  font-size: var(--fs-sm);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.mini {
  min-height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  background: var(--bg-soft);
  color: var(--amber);
  font-weight: 650;
}

.wall {
  margin-top: 12px;
}

.timer-tabs {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}

.timer-tabs button {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  background: var(--bg-soft);
  color: var(--muted);
  font-weight: 650;
}

.timer-tabs button.on {
  background: var(--amber);
  color: var(--ink);
}

.timer p {
  margin: 18px 0 14px;
  font-size: var(--fs-hero);
  font-weight: 720;
  font-variant-numeric: tabular-nums;
}

.duration {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  color: var(--muted);
}

.duration input {
  width: 92px;
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--bg);
  color: var(--text);
}

.row {
  display: grid;
  grid-template-columns: 1fr 72px 72px;
  gap: 10px;
}

.row.compact {
  grid-template-columns: 1fr 96px;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 14px;
}

.thumb {
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 10px;
  background: var(--bg-soft);
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.note {
  width: 100%;
  min-height: 120px;
  margin-top: 14px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--bg);
  color: var(--text);
  font: inherit;
  line-height: 1.6;
  resize: vertical;
}

.link-card {
  display: block;
}

.hidden {
  display: none;
}

.timer-full {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px;
  background: var(--bg);
  color: var(--text);
  text-align: center;
}

.timer-stage {
  display: grid;
  gap: 8px;
  place-items: center;
  width: min(100%, 560px);
}

.timer-full strong {
  font-size: clamp(72px, 20vw, 180px);
  font-weight: 760;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.timer-full span,
.timer-kicker {
  color: var(--muted);
  font-size: var(--fs-lg);
}

.timer-close {
  position: absolute;
  top: calc(16px + var(--safe-top));
  right: 18px;
  min-height: 44px;
  color: var(--amber);
  font-weight: 650;
}

.full-actions {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) minmax(120px, 1fr);
  gap: 12px;
  width: min(420px, 100%);
  margin-top: 36px;
}

@media (orientation: landscape) and (max-height: 600px) {
  .timer-full {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 24px 32px;
  }

  .timer-stage {
    width: auto;
    justify-items: start;
    text-align: left;
  }

  .timer-full strong {
    font-size: clamp(64px, 16vw, 150px);
  }

  .full-actions {
    width: min(360px, 100%);
    margin-top: 0;
  }
}
</style>
