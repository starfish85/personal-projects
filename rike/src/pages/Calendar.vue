<script setup>
import { computed, onActivated, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PhotoViewer from '../components/PhotoViewer.vue'
import {
  DRAW_ID,
  TASK_ID,
  TASK_META,
  checkinsOn,
  dayComplete,
  listDays,
  loadCheckins,
  practice,
  removeCheckin,
} from '../stores/practice'
import { confirmDialog } from '../stores/ui'
import { formatClock, formatDayTitle, localDateKey, monthGrid } from '../utils/date'

const router = useRouter()
const today = localDateKey()
const cursor = ref(new Date())
const selected = ref(today)
const guitarDays = ref({})
const drawDays = ref({})
const viewerOpen = ref(false)
const startIndex = ref(0)

const year = computed(() => cursor.value.getFullYear())
const month = computed(() => cursor.value.getMonth())
const title = computed(() => `${year.value}年${month.value + 1}月`)
const cells = computed(() => monthGrid(year.value, month.value))

const guitar = computed(() => guitarDays.value[selected.value] || null)
const drawing = computed(() => drawDays.value[selected.value] || null)
const guitarDone = computed(() => dayComplete(TASK_ID, guitar.value))
const drawDone = computed(() => dayComplete(DRAW_ID, drawing.value))
const photos = computed(() => checkinsOn(selected.value))
const allDone = computed(() => guitarDone.value && drawDone.value)
const anyDone = computed(() => guitarDone.value || drawDone.value)

function mapDays(rows) {
  const map = {}
  for (const day of rows) map[day.date] = day
  return map
}

async function refresh() {
  const [g, d] = await Promise.all([listDays(TASK_ID), listDays(DRAW_ID), loadCheckins()])
  guitarDays.value = mapDays(g)
  drawDays.value = mapDays(d)
}

function shiftMonth(delta) {
  cursor.value = new Date(year.value, month.value + delta, 1)
}

function pick(dateKey) {
  if (dateKey) selected.value = dateKey
}

function status(dateKey, taskId) {
  const record = taskId === TASK_ID ? guitarDays.value[dateKey] : drawDays.value[dateKey]
  return dayComplete(taskId, record)
}

function openPhoto(index) {
  startIndex.value = index
  viewerOpen.value = true
}

async function onDelete(id) {
  const ok = await confirmDialog({
    title: '删除这张画？',
    copy: '这一天的画画进度会少一张；若删光，蓝色那一段会灭掉。',
    ok: '删除',
    danger: true,
  })
  if (!ok) return
  await removeCheckin(id)
  await refresh()
  if (!photos.value.length) viewerOpen.value = false
}

onMounted(refresh)
onActivated(refresh)
</script>

<template>
  <main class="page">
    <header class="head">
      <button type="button" class="back" @click="router.push('/')">返回</button>
      <h1>练习日历</h1>
      <span />
    </header>

    <section class="cal">
      <div class="nav">
        <button type="button" @click="shiftMonth(-1)">上个月</button>
        <strong>{{ title }}</strong>
        <button type="button" @click="shiftMonth(1)">下个月</button>
      </div>
      <div class="week">
        <span v-for="w in ['一', '二', '三', '四', '五', '六', '日']" :key="w">{{ w }}</span>
      </div>
      <div class="grid">
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
          <div v-if="cell" class="bar" :class="{ full: status(cell, TASK_ID) && status(cell, DRAW_ID) }">
            <i
              v-for="task in TASK_META"
              :key="task.id"
              class="seg"
              :class="[task.color, { on: status(cell, task.id) }]"
            />
          </div>
        </button>
      </div>
      <p class="legend">
        <span><i class="guitar" />吉他</span>
        <span><i class="draw" />画画</span>
        <span>满条 = 当天两项都完成</span>
      </p>
    </section>

    <section class="detail">
      <h2>{{ formatDayTitle(selected) }}</h2>
      <p v-if="selected > today" class="muted">这一天还没到。</p>
      <template v-else>
        <p v-if="allDone" class="ok">这一天的日课都完成了。</p>
        <p v-else-if="anyDone" class="muted">完成了一部分，进度条还没满。</p>
        <p v-else class="muted">这天还没有完成任何一项。</p>

        <div class="block">
          <p class="label"><i class="guitar" />练习吉他</p>
          <template v-if="guitar && guitar.count > 0">
            <p class="digits">
              {{ guitar.count }}
              <span>/ {{ guitar.target ?? practice.task.target }} 遍</span>
            </p>
            <p v-if="guitarDone" class="ok">已完成</p>
            <p v-else class="muted">练了，还没到目标。</p>
            <p v-if="guitar.completedAt" class="muted">完成于 {{ formatClock(guitar.completedAt) }}</p>
          </template>
          <p v-else class="muted">这天没有吉他练习。</p>
        </div>

        <div class="block">
          <p class="label"><i class="draw" />画画</p>
          <template v-if="photos.length">
            <p class="ok">已打卡 · {{ photos.length }} 张</p>
            <div class="thumbs">
              <button
                v-for="(item, i) in photos"
                :key="item.id"
                type="button"
                class="thumb"
                @click="openPhoto(i)"
              >
                <img :src="item.thumbUrl" alt="" />
              </button>
            </div>
          </template>
          <p v-else class="muted">这天没有画画打卡。</p>
        </div>
      </template>
    </section>

    <PhotoViewer
      :open="viewerOpen"
      :photos="photos"
      :start-index="startIndex"
      title="那天的画"
      @close="viewerOpen = false"
      @delete="onDelete"
    />
  </main>
</template>

<style scoped>
.page {
  height: 100%;
  overflow: auto;
  padding: calc(12px + var(--safe-top)) 16px calc(24px + var(--safe-bottom));
  max-width: 480px;
  margin: 0 auto;
}

.head {
  display: grid;
  grid-template-columns: 64px 1fr 64px;
  align-items: center;
}

.head h1 {
  margin: 0;
  text-align: center;
  font-size: 18px;
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
  margin-bottom: 12px;
}

.nav button {
  color: var(--amber);
  min-height: 36px;
  font-size: 13px;
}

.week,
.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.week span {
  text-align: center;
  color: var(--muted);
  font-size: 12px;
  padding: 6px 0;
}

.cell {
  position: relative;
  height: 48px;
  border-radius: 10px;
  color: var(--text);
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
  background: var(--bg-soft);
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
  background: transparent;
}

.seg.guitar.on {
  background: var(--amber);
}

.seg.draw.on {
  background: var(--draw);
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 12px 0 0;
  color: var(--muted);
  font-size: 12px;
}

.legend span,
.label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend i,
.label i {
  width: 10px;
  height: 6px;
  border-radius: 99px;
  display: inline-block;
}

.legend i.guitar,
.label i.guitar {
  background: var(--amber);
}

.legend i.draw,
.label i.draw {
  background: var(--draw);
}

.detail {
  margin-top: 16px;
  padding: 16px 18px 18px;
  border-radius: var(--radius);
  background: var(--bg-elev);
}

.detail h2 {
  margin: 0 0 10px;
  font-size: 16px;
}

.block {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.label {
  margin: 0 0 8px;
  font-weight: 650;
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
</style>
