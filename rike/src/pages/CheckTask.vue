<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import TaskHelpers from '../components/TaskHelpers.vue'
import { done, practice, subtaskDone, toggleCheck, toggleSubtask } from '../stores/practice'

const router = useRouter()
const title = computed(() => practice.task.title || '任务')
const subtasks = computed(() => (practice.task.subtasks || []))
</script>

<template>
  <main class="page">
    <header class="head">
      <button type="button" class="back" @click="router.push('/')">返回</button>
      <h1>{{ title }}</h1>
      <span />
    </header>

    <p v-if="done" class="ok">今日已完成</p>
    <p v-else class="idle">今日未完成</p>

    <section v-if="subtasks.length" class="subtasks">
      <button
        v-for="subtask in subtasks"
        :key="subtask.id"
        type="button"
        class="subtask"
        :class="{ on: subtaskDone(practice.task.id, subtask.id) }"
        @click="toggleSubtask(practice.task.id, subtask.id)"
      >
        <span>{{ subtask.title }}</span>
        <i />
      </button>
    </section>

    <button v-else class="main" type="button" :class="{ done }" @click="toggleCheck">
      {{ done ? '取消完成' : '完成今天' }}
    </button>

    <TaskHelpers />
  </main>
</template>

<style scoped>
.page {
  height: 100%;
  overflow: auto;
  padding: calc(12px + var(--safe-top)) 16px calc(24px + var(--safe-bottom));
  max-width: var(--page-max);
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

.ok,
.idle {
  margin: 36px 0 20px;
  text-align: center;
  font-size: var(--fs-xl);
  font-weight: 650;
}

.ok {
  color: var(--ok);
}

.idle {
  color: var(--muted);
}

.main {
  width: 100%;
  min-height: var(--tap-lg);
  border-radius: 16px;
  background: var(--amber);
  color: var(--ink);
  font-size: 18px;
  font-weight: 750;
}

.main.done {
  background: var(--bg-soft);
  color: var(--text);
}

.subtasks {
  display: grid;
  gap: 12px;
  margin-top: 24px;
}

.subtask {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-height: var(--tap-lg);
  padding: 0 18px;
  border-radius: var(--radius);
  background: var(--bg-elev);
  text-align: left;
  font-size: var(--fs-lg);
  font-weight: 650;
}

.subtask i {
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  border: 3px solid var(--muted);
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
</style>
