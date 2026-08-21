<script setup>
import { computed, onActivated, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listDays, practice } from '../stores/practice'
import { formatClock, formatDayTitle, localDateKey, monthGrid } from '../utils/date'

const router = useRouter()
const today = localDateKey()
const cursor = ref(new Date())
const selected = ref(today)
const byDate = ref({})

const year = computed(() => cursor.value.getFullYear())
const month = computed(() => cursor.value.getMonth())
const title = computed(() => `${year.value}年${month.value + 1}月`)
const cells = computed(() => monthGrid(year.value, month.value))
const record = computed(() => byDate.value[selected.value] || null)
const practiced = computed(() => (record.value?.count || 0) > 0)
const completed = computed(() => Boolean(record.value?.completedAt))

async function refresh() {
  const days = await listDays()
  const map = {}
  for (const day of days) map[day.date] = day
  byDate.value = map
}

function shiftMonth(delta) {
  cursor.value = new Date(year.value, month.value + delta, 1)
}

function pick(dateKey) {
  if (dateKey) selected.value = dateKey
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
          :class="{
            empty: !cell,
            today: cell === today,
            on: cell === selected,
            did: cell && byDate[cell]?.count > 0,
            done: cell && byDate[cell]?.completedAt,
          }"
          :disabled="!cell"
          @click="pick(cell)"
        >
          <span v-if="cell">{{ Number(cell.slice(8)) }}</span>
          <i v-if="cell && byDate[cell]?.count > 0" />
        </button>
      </div>
    </section>

    <section class="detail">
      <h2>{{ formatDayTitle(selected) }}</h2>
      <p v-if="selected > today" class="muted">这一天还没到。</p>
      <p v-else-if="!practiced" class="muted">这天还没有练习记录。练完一遍就会在日历上留下标记。</p>
      <template v-else>
        <p class="digits">
          {{ record.count }}
          <span>/ {{ record.target ?? practice.task.target }} 遍</span>
        </p>
        <p v-if="completed" class="ok">今日练习吉他已完成</p>
        <p v-else class="muted">练了，但还没到达当天目标。</p>
        <p v-if="record.completedAt" class="muted">完成于 {{ formatClock(record.completedAt) }}</p>
        <p v-else-if="record.updatedAt" class="muted">最后一次点计数 {{ formatClock(record.updatedAt) }}</p>
      </template>
    </section>
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
  height: 44px;
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

.cell i {
  position: absolute;
  left: 50%;
  bottom: 6px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--amber);
  transform: translateX(-50%);
}

.cell.done i {
  background: var(--ok);
}

.detail {
  margin-top: 16px;
  padding: 16px 18px;
  border-radius: var(--radius);
  background: var(--bg-elev);
}

.detail h2 {
  margin: 0 0 10px;
  font-size: 16px;
}

.digits {
  margin: 0;
  font-size: 36px;
  font-weight: 720;
  font-variant-numeric: tabular-nums;
}

.digits span {
  margin-left: 6px;
  font-size: 16px;
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
</style>
