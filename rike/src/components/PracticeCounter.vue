<script setup>
import { computed } from 'vue'
import { bump, done, pieceProgress, practice } from '../stores/practice'
import { tapPulse } from '../utils/date'

defineProps({
  variant: { type: String, default: 'hero' },
})
defineEmits(['edit-target'])

const progress = computed(() => pieceProgress(practice.task, practice.todayByTask[practice.task.id]))

const label = computed(() => {
  const { count, target } = progress.value
  if (!done.value) return `${count} / ${target}`
  return `已完成 · ${count}/${target}`
})

async function plus() {
  tapPulse()
  await bump(1)
}

async function minus() {
  if (progress.value.count <= 0) return
  await bump(-1)
}
</script>

<template>
  <div class="counter" :class="variant">
    <p v-if="variant === 'hero'" class="task">{{ practice.task.title }}</p>
    <p class="digits">{{ label }}</p>
    <p v-if="variant === 'hero' && done" class="done">今日{{ practice.task.title }}已完成</p>

    <button v-if="variant === 'hero'" class="plus" type="button" @click="plus">
      练完一遍
    </button>
    <div v-if="variant === 'hero'" class="row">
      <button class="ghost" type="button" :disabled="progress.count <= 0" @click="minus">
        −1
      </button>
      <button class="ghost" type="button" @click="$emit('edit-target')">改目标</button>
    </div>

    <button v-else class="pill-plus" type="button" @click="plus">+</button>
  </div>
</template>

<style scoped>
.hero .task {
  margin: 0 0 8px;
  color: var(--muted);
  letter-spacing: 0.12em;
  font-size: var(--fs-sm);
}

.hero .digits {
  margin: 0;
  font-size: var(--fs-hero);
  font-weight: 720;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
}

.hero .done {
  margin: 10px 0 0;
  color: var(--ok);
  font-size: var(--fs-md);
  font-weight: 650;
}

.plus {
  width: 100%;
  margin-top: 28px;
  min-height: var(--tap-lg, 64px);
  border-radius: 18px;
  background: var(--amber);
  color: var(--ink);
  font-size: var(--fs-lg);
  font-weight: 750;
}

.plus:active {
  background: var(--amber-press);
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 12px;
}

.ghost {
  min-height: 48px;
  border-radius: 14px;
  background: var(--bg-soft);
}

.ghost:disabled {
  opacity: 0.4;
}

.pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px 6px 12px;
  border-radius: 999px;
  background: rgba(22, 19, 16, 0.78);
  backdrop-filter: blur(10px);
  color: var(--paper);
}

.pill .digits {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.pill-plus {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--amber);
  color: var(--ink);
  font-size: 22px;
  font-weight: 750;
  line-height: 1;
}
</style>
