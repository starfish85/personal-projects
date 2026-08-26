<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PhotoViewer from '../components/PhotoViewer.vue'
import {
  assetDayKey,
  galleryListItem,
  galleryPhotosForTask,
  practice,
  toggleFeaturedCheckin,
} from '../stores/practice'

defineOptions({ name: 'Gallery' })

const route = useRoute()
const router = useRouter()
const viewerOpen = ref(false)
const startIndex = ref(0)

const taskId = computed(() => String(route.params.taskId || ''))
const task = computed(() => practice.tasks.find((item) => item.id === taskId.value) || null)
const rows = computed(() => galleryPhotosForTask(taskId.value))
const featuredCount = computed(() => rows.value.filter((item) => item.featured).length)
const listMode = computed(() => !taskId.value)

const taskCards = computed(() =>
  practice.tasks
    .map((item) => {
      const rowsForTask = galleryPhotosForTask(item.id)
      return {
        task: item,
        rows: rowsForTask,
        latest: rowsForTask[0] || null,
      }
    })
    .filter((item) => galleryListItem(item.task))
    .sort(
      (a, b) =>
        String(assetDayKey(b.latest) || '').localeCompare(String(assetDayKey(a.latest) || '')) ||
        (a.task.order ?? 0) - (b.task.order ?? 0),
    ),
)

const months = computed(() => {
  const groups = {}
  for (const item of rows.value) {
    const key = String(assetDayKey(item) || item.createdAt || '').slice(0, 7)
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
  if (listMode.value) {
    router.push('/')
    return
  }
  router.push('/gallery')
}

function shortDate(value) {
  const key = String(value || '').slice(0, 10)
  return key.length >= 10 ? key.slice(5) : key
}

function cardCopy(item) {
  const status = item.task.archived ? '已归档' : item.task.paused ? '已暂停' : ''
  if (!item.rows.length) return status || '还没有图片'
  const photos = `${item.rows.length} 张图片 · 最近 ${shortDate(assetDayKey(item.latest))}`
  return status ? `${status} · ${photos}` : photos
}

async function markFeatured(id) {
  await toggleFeaturedCheckin(id)
}

function openTaskWall(id) {
  router.push(`/gallery/${id}`)
}
</script>

<template>
  <main class="page">
    <header class="head">
      <button type="button" class="back" @click="back">返回</button>
      <h1>{{ task?.title || '作品墙' }}</h1>
      <span />
    </header>

    <template v-if="listMode">
      <p class="lead">这里会列出所有需要图片打卡的任务，每个任务都有自己独立的墙。</p>
      <div v-if="taskCards.length" class="task-list">
        <button
          v-for="item in taskCards"
          :key="item.task.id"
          type="button"
          class="task-card"
          @click="openTaskWall(item.task.id)"
        >
          <span class="task-preview" :style="{ background: item.task.color }">
            <img v-if="item.latest" :src="item.latest.thumbUrl" alt="" />
            <i v-else :style="{ background: item.task.color }" />
          </span>
          <span>
            <strong>{{ item.task.title }}</strong>
            <em>{{ cardCopy(item) }}</em>
          </span>
        </button>
      </div>
      <div v-else class="empty-state">
        <p>还没有可回看的图片墙。画画或健身的打卡图会出现在这里。</p>
        <button type="button" @click="router.push('/')">回首页</button>
      </div>
    </template>
    <template v-else>
      <p v-if="task && rows.length" class="lead">
        按任务回看所有图片，可以标记代表作。{{ featuredCount ? `已有 ${featuredCount} 张代表作。` : '' }}
      </p>
      <div v-else class="empty-state">
        <p>{{ task ? '这个任务还没有图片。' : '没有找到这个任务。' }}</p>
        <button type="button" @click="router.push('/gallery')">回列表</button>
      </div>

      <section v-for="[month, items] in months" :key="month" class="month">
        <h2>{{ month }}</h2>
        <div class="grid">
          <article v-for="(item, index) in items" :key="item.id" class="shot">
            <button type="button" class="thumb" @click="openAt(rows.indexOf(item))">
              <img :src="item.thumbUrl" alt="" />
            </button>
            <button
              v-if="item.role === 'checkin'"
              type="button"
              class="mark"
              :class="{ on: item.featured }"
              @click="markFeatured(item.id)"
            >
              {{ item.featured ? '代表作' : '标记代表作' }}
            </button>
            <p class="date">{{ shortDate(assetDayKey(item)) }}</p>
          </article>
        </div>
      </section>
    </template>

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
  overflow-x: hidden;
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

.task-list {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}

.task-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--bg-elev);
  text-align: left;
}

.task-preview {
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  overflow: hidden;
  border-radius: 10px;
  background: var(--bg-soft);
}

.task-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.task-preview i {
  width: 14px;
  height: 14px;
  border-radius: 99px;
  flex: 0 0 auto;
}

.task-card span {
  min-width: 0;
}

.task-card strong,
.task-card em {
  display: block;
  font-style: normal;
}

.task-card em {
  color: var(--muted);
  font-size: 12px;
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
