<script setup>
import { computed, ref, watch } from 'vue'
import { localDateKey, monthGrid } from '../utils/date'

const props = defineProps({
  selected: { type: String, default: '' },
  today: { type: String, default: '' },
})

const emit = defineEmits(['pick'])

const todayKey = computed(() => props.today || localDateKey())
const WEEK = ['一', '二', '三', '四', '五', '六', '日']

function monthFrom(key) {
  const [y, m] = String(key || todayKey.value).split('-').map(Number)
  return new Date(y || new Date().getFullYear(), (m || 1) - 1, 1)
}

const cursor = ref(monthFrom(props.selected))

watch(
  () => props.selected,
  (key) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key || '')) return
    const next = monthFrom(key)
    if (next.getFullYear() !== cursor.value.getFullYear() || next.getMonth() !== cursor.value.getMonth()) {
      cursor.value = next
    }
  },
)

const year = computed(() => cursor.value.getFullYear())
const month = computed(() => cursor.value.getMonth())
const title = computed(() => `${year.value}年${month.value + 1}月`)
const cells = computed(() => monthGrid(year.value, month.value))

function shiftMonth(delta) {
  cursor.value = new Date(year.value, month.value + delta, 1)
}

function pick(cell) {
  if (!cell) return
  emit('pick', cell)
}
</script>

<template>
  <div class="month-cal">
    <div class="nav">
      <button type="button" @click="shiftMonth(-1)">上个月</button>
      <strong>{{ title }}</strong>
      <button type="button" @click="shiftMonth(1)">下个月</button>
    </div>
    <div class="week">
      <span v-for="w in WEEK" :key="w">{{ w }}</span>
    </div>
    <div class="grid">
      <button
        v-for="(cell, i) in cells"
        :key="i"
        type="button"
        class="cell"
        :class="{ empty: !cell, today: cell === todayKey, on: cell === selected }"
        :disabled="!cell"
        @click="pick(cell)"
      >
        <span v-if="cell">{{ Number(cell.slice(8)) }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.month-cal {
  padding: 4px 0 2px;
}

.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.nav strong {
  color: var(--text);
  font-size: 15px;
  font-weight: 650;
}

.nav button {
  min-height: 36px;
  padding: 0 6px;
  color: var(--amber);
  font-size: 13px;
  font-weight: 650;
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
  height: var(--cell);
  border-radius: 10px;
  color: var(--text);
  font-variant-numeric: tabular-nums;
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

.cell.on.today span {
  color: var(--amber);
}
</style>
