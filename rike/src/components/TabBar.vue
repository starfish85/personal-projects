<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { practice } from '../stores/practice'

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
  router.push('/gallery')
}
</script>

<template>
  <nav class="tabbar">
    <button type="button" class="tab" :class="{ on: active === 'home' }" @click="goHome">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4.5 11.2L12 4.8l7.5 6.4V19a1.2 1.2 0 0 1-1.2 1.2H5.7A1.2 1.2 0 0 1 4.5 19z" />
        <path d="M10 20.2v-6h4v6" />
      </svg>
      <span>主页</span>
    </button>
    <button type="button" class="tab" :class="{ on: active === 'journal' }" @click="goJournal">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5.5" y="4.5" width="13" height="15" rx="1.6" />
        <path d="M8.5 9h7M8.5 12.5h7M8.5 16h4.5" />
      </svg>
      <span>日记</span>
    </button>
    <button type="button" class="tab" :class="{ on: active === 'calendar' }" @click="goCalendar">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4.5" y="5.5" width="15" height="14" rx="2" />
        <path d="M4.5 10h15M8 4.5v2.5M16 4.5v2.5" />
      </svg>
      <span>日历</span>
    </button>
    <button type="button" class="tab" :class="{ on: active === 'gallery' }" @click="goGallery">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4.5" y="5.5" width="15" height="13" rx="2" />
        <path d="M4.8 16.2l4.2-4.2 3.2 3.2 2.2-2.2 4.9 3.4" />
        <circle cx="9" cy="9.2" r="1.2" />
      </svg>
      <span>作品墙</span>
    </button>
  </nav>
</template>

<style scoped>
.tabbar {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: calc(10px + var(--safe-bottom));
  z-index: 30;
  width: auto;
  max-width: var(--page-max);
  height: 58px;
  margin-inline: auto;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
  background: rgba(34, 28, 22, 0.92);
  border: 1px solid var(--line);
  border-radius: 20px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(16px);
}

.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-width: 0;
  overflow: hidden;
  color: var(--muted);
  font-size: 11px;
}

.tab span {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab.on {
  color: var(--amber);
}

.tab svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@media (min-width: 700px) {
  .tabbar {
    left: 50%;
    right: auto;
    width: var(--page-max);
    height: 64px;
    transform: translateX(-50%);
  }

  .tab {
    font-size: var(--fs-sm);
  }

  .tab svg {
    width: 24px;
    height: 24px;
  }
}
</style>
