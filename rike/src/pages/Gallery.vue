<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PhotoViewer from '../components/PhotoViewer.vue'
import { checkinsForTask, practice, toggleFeaturedCheckin } from '../stores/practice'

defineOptions({ name: 'Gallery' })

const route = useRoute()
const router = useRouter()
const viewerOpen = ref(false)
const startIndex = ref(0)

const taskId = computed(() => String(route.params.taskId || ''))
const task = computed(() => practice.tasks.find((item) => item.id === taskId.value) || null)
const rows = computed(() => checkinsForTask(taskId.value))
const featuredCount = computed(() => rows.value.filter((item) => item.featured).length)

const months = computed(() => {
  const groups = {}
  for (const item of rows.value) {
    const key = String(item.date || '').slice(0, 7)
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
  }
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
})

const viewerPhotos = computed(() => rows.value)

function openAt(index) {
  startIndex.value = index
  viewerOpen.value = true
}

function back() {
  router.back()
}

function shortDate(date) {
  return String(date || '').slice(5)
}

async function markFeatured(id) {
  await toggleFeaturedCheckin(id)
}
</script>

<template>
  <main class="page">
    <header class="head">
      <button type="button" class="back" @click="back">返回</button>
      <h1>{{ task?.title || '作品墙' }}</h1>
      <span />
    </header>

    <p v-if="task && rows.length" class="lead">
      按任务回看所有图片，可以标记代表作。{{ featuredCount ? `已有 ${featuredCount} 张代表作。` : '' }}
    </p>
    <div v-else class="empty-state">
      <p>{{ task ? '这个任务还没有图片。' : '没有找到这个任务。' }}</p>
      <button type="button" @click="router.push('/')">回首页</button>
    </div>

    <section v-for="[month, items] in months" :key="month" class="month">
      <h2>{{ month }}</h2>
      <div class="grid">
        <article v-for="(item, index) in items" :key="item.id" class="shot">
          <button type="button" class="thumb" @click="openAt(rows.indexOf(item))">
            <img :src="item.thumbUrl" alt="" />
          </button>
          <button type="button" class="mark" :class="{ on: item.featured }" @click="markFeatured(item.id)">
            {{ item.featured ? '代表作' : '标记代表作' }}
          </button>
          <p class="date">{{ shortDate(item.date) }}</p>
        </article>
      </div>
    </section>

    <PhotoViewer
      :open="viewerOpen"
      :photos="viewerPhotos"
      :start-index="startIndex"
      title="作品墙"
      :deletable="false"
      @close="viewerOpen = false"
    />
  </main>
</template>

<style scoped>
.page {
  height: 100%;
  overflow: auto;
  padding: calc(12px + var(--safe-top)) 16px calc(var(--tab-h) + 16px);
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
  font-size: var(--fs-lg);
  overflow-wrap: anywhere;
}

.back {
  min-height: 44px;
  color: var(--amber);
  font-weight: 650;
  text-align: left;
}

.lead {
  margin: 14px 0 18px;
  color: var(--muted);
  font-size: var(--fs-sm);
  line-height: 1.55;
}

.empty-state {
  display: grid;
  gap: 12px;
  margin-top: 28px;
  color: var(--muted);
  text-align: center;
}

.empty-state p {
  margin: 0;
}

.empty-state button {
  justify-self: center;
  min-height: 42px;
  padding: 0 16px;
  color: var(--amber);
  font-weight: 650;
}

.month {
  margin-top: 20px;
}

.month h2 {
  margin: 0 0 10px;
  font-size: var(--fs-md);
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

@media (min-width: 700px) {
  .grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.shot {
  display: grid;
  gap: 8px;
}

.thumb {
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 12px;
  background: var(--bg-elev);
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mark {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  background: var(--bg-soft);
  color: var(--muted);
  font-size: var(--fs-sm);
  font-weight: 650;
}

.mark.on {
  background: var(--amber);
  color: var(--ink);
}

.date {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
}
</style>
