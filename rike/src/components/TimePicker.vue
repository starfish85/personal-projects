<script setup>
import { nextTick, ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  modelValue: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'close'])

function itemH() {
  return window.matchMedia('(min-width: 700px)').matches ? 56 : 44
}
const hours = Array.from({ length: 24 }, (_, i) => i)
const minutes = Array.from({ length: 60 }, (_, i) => i)
const hourCol = ref(null)
const minuteCol = ref(null)
const hour = ref(18)
const minute = ref(0)

function pad(n) {
  return String(n).padStart(2, '0')
}

function parse() {
  const match = /^(\d{1,2}):(\d{2})$/.exec(props.modelValue || '')
  if (match) {
    hour.value = Math.min(23, Number(match[1]))
    minute.value = Math.min(59, Number(match[2]))
    return
  }
  const now = new Date()
  hour.value = now.getHours()
  minute.value = now.getMinutes()
}

function jump(el, index) {
  if (!el) return
  el.scrollTop = index * itemH()
}

function indexOf(el, max) {
  if (!el) return 0
  return Math.max(0, Math.min(max, Math.round(el.scrollTop / itemH())))
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    parse()
    await nextTick()
    jump(hourCol.value, hour.value)
    jump(minuteCol.value, minute.value)
  },
)

function onHour() {
  hour.value = indexOf(hourCol.value, 23)
}

function onMinute() {
  minute.value = indexOf(minuteCol.value, 59)
}

function confirm() {
  emit('update:modelValue', `${pad(hour.value)}:${pad(minute.value)}`)
  emit('close')
}
</script>

<template>
  <div v-if="open" class="mask" @click.self="emit('close')">
    <div class="sheet">
      <div class="bar">
        <button type="button" class="cancel" @click="emit('close')">取消</button>
        <button type="button" class="ok" @click="confirm">确定</button>
      </div>
      <div class="wheels">
        <div ref="hourCol" class="col" @scroll="onHour">
          <div class="pad" />
          <div v-for="h in hours" :key="'h' + h" class="item" :class="{ on: h === hour }">
            {{ pad(h) }}
          </div>
          <div class="pad" />
        </div>
        <div ref="minuteCol" class="col" @scroll="onMinute">
          <div class="pad" />
          <div v-for="m in minutes" :key="'m' + m" class="item" :class="{ on: m === minute }">
            {{ pad(m) }}
          </div>
          <div class="pad" />
        </div>
        <div class="indicator" />
        <div class="fade" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.sheet {
  width: min(100%, var(--page-max));
  background: var(--bg-elev);
  border-radius: 12px 12px 0 0;
  padding-bottom: var(--safe-bottom);
}

.bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  border-bottom: 1px solid var(--line);
}

.cancel,
.ok {
  min-height: 44px;
  padding: 0 14px;
  font-size: 16px;
  font-weight: 650;
}

.cancel {
  color: var(--muted);
}

.ok {
  color: var(--amber);
}

.wheels {
  position: relative;
  display: flex;
  height: 220px;
}

@media (min-width: 700px) {
  .wheels {
    height: 280px;
  }
}

.col {
  flex: 1;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  -webkit-overflow-scrolling: touch;
}

.col::-webkit-scrollbar {
  display: none;
}

.pad {
  height: 88px;
}

@media (min-width: 700px) {
  .pad {
    height: 112px;
  }
}

.item {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  scroll-snap-align: center;
  color: var(--muted);
  font-size: var(--fs-lg);
  font-variant-numeric: tabular-nums;
}

.item.on {
  color: var(--text);
  font-weight: 700;
  font-size: var(--fs-xl);
}

@media (min-width: 700px) {
  .item {
    height: 56px;
  }
}

.indicator {
  position: absolute;
  left: 20px;
  right: 20px;
  top: 88px;
  height: 44px;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  pointer-events: none;
}

@media (min-width: 700px) {
  .indicator {
    top: 112px;
    height: 56px;
  }
}

.fade {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    var(--bg-elev) 0%,
    transparent 28%,
    transparent 72%,
    var(--bg-elev) 100%
  );
}
</style>
