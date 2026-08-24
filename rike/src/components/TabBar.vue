<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { checkinsForTask, practice } from '../stores/practice'

const route = useRoute()
const router = useRouter()

const active = computed(() => {
  if (route.name === 'journal') return 'journal'
  if (route.name === 'calendar') return 'calendar'
  if (route.name === 'gallery') return 'gallery'
  return 'home'
})

function goHome() {
  router.push('/')
}

function goJournal() {
  router.push(`/journal/${practice.date}`)
}

function goCalendar() {
  router.push('/calendar')
}

function goGallery() {
  const taskWithPhotos = practice.tasks.find((task) => checkinsForTask(task.id).length)
  const taskId = taskWithPhotos?.id || practice.task?.id || practice.tasks[0]?.id || ''
  router.push(taskId ? `/gallery/${taskId}` : '/gallery')
}
</script>

<template>
  <nav class="tabbar">
    <button type="button" class="tab" :class="{ on: active === 'home' }" @click="goHome">
      <span class="ico home" />
      <span>主页</span>
    </button>
    <button type="button" class="tab" :class="{ on: active === 'journal' }" @click="goJournal">
      <span class="ico note" />
      <span>日记</span>
    </button>
    <button type="button" class="tab" :class="{ on: active === 'calendar' }" @click="goCalendar">
      <span class="ico cal" />
      <span>日历</span>
    </button>
    <button type="button" class="tab" :class="{ on: active === 'gallery' }" @click="goGallery">
      <span class="ico pic" />
      <span>作品墙</span>
    </button>
  </nav>
</template>

<style scoped>
.tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
  height: var(--tab-h);
  padding-bottom: var(--safe-bottom);
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  background: var(--bg-elev);
  border-top: 1px solid var(--line);
}

.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 0;
  color: var(--muted);
  font-size: 12px;
}

.tab.on {
  color: var(--amber);
}

.ico {
  width: 22px;
  height: 22px;
  position: relative;
}

@media (min-width: 700px) {
  .tab {
    font-size: var(--fs-sm);
  }

  .ico {
    width: 26px;
    height: 26px;
  }
}

.home {
  border: 2px solid currentColor;
  width: 18px;
  height: 14px;
  margin-top: 6px;
  border-radius: 2px;
}

.home::before {
  content: '';
  position: absolute;
  left: -5px;
  top: -8px;
  width: 0;
  height: 0;
  border-left: 12px solid transparent;
  border-right: 12px solid transparent;
  border-bottom: 9px solid currentColor;
}

.note {
  border: 2px solid currentColor;
  border-radius: 2px;
}

.note::before,
.note::after {
  content: '';
  position: absolute;
  left: 4px;
  right: 4px;
  height: 2px;
  background: currentColor;
  border-radius: 1px;
}

.note::before {
  top: 6px;
}

.note::after {
  top: 12px;
}

.cal {
  border: 2px solid currentColor;
  border-radius: 3px;
}

.cal::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 5px;
  height: 2px;
  background: currentColor;
}

.pic {
  border: 2px solid currentColor;
  border-radius: 4px;
}

.pic::before {
  content: '';
  position: absolute;
  left: 4px;
  right: 4px;
  bottom: 4px;
  height: 6px;
  border-left: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: skew(-18deg);
}

.pic::after {
  content: '';
  position: absolute;
  right: 4px;
  top: 4px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
}
</style>
