<script setup>
import { computed, onActivated, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PhotoViewer from '../components/PhotoViewer.vue'
import {
  addJournalPhotos,
  ensureToday,
  journalPhotosOn,
  practice,
  removeJournalPhoto,
  saveJournalText,
} from '../stores/practice'
import { confirmDialog } from '../stores/ui'
import { formatDayTitle, localDateKey } from '../utils/date'

defineOptions({ name: 'Journal' })

const route = useRoute()
const router = useRouter()
const today = computed(() => practice.date || localDateKey())
const fileRef = ref(null)
const text = ref('')
const viewerOpen = ref(false)
const startIndex = ref(0)
let timer = 0

const date = computed(() => String(route.params.date || practice.date || localDateKey()))
const photos = computed(() => journalPhotosOn(date.value))
const title = computed(() => formatDayTitle(date.value))
const isFuture = computed(() => date.value > today.value)

watch(
  date,
  (value) => {
    text.value = practice.journalTexts[value] || ''
  },
  { immediate: true },
)

watch(text, (value) => {
  if (isFuture.value) return
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    saveJournalText(date.value, value)
  }, 400)
})

onBeforeUnmount(() => {
  if (isFuture.value) return
  window.clearTimeout(timer)
  saveJournalText(date.value, text.value)
})

onMounted(() => {
  ensureToday()
})

onActivated(() => {
  ensureToday()
})

function pick() {
  if (isFuture.value) return
  fileRef.value?.click()
}

function backToCalendar() {
  router.push({ path: '/calendar', query: { date: date.value } })
}

async function onFiles(event) {
  await addJournalPhotos(event.target.files, date.value)
  event.target.value = ''
}

function openAt(index) {
  startIndex.value = index
  viewerOpen.value = true
}

async function onDelete(id) {
  const ok = await confirmDialog({
    title: '删除这张图？',
    copy: '从这篇日记里去掉。',
    ok: '删除',
    danger: true,
  })
  if (!ok) return
  await removeJournalPhoto(id)
  if (!photos.value.length) viewerOpen.value = false
}
</script>

<template>
  <main class="page">
    <header class="head">
      <button type="button" class="back" @click="backToCalendar">日历</button>
      <h1>日记</h1>
      <button v-if="!isFuture" type="button" class="add" @click="pick">图片</button>
      <span v-else />
    </header>
    <p class="when">{{ title }}</p>

    <p v-if="isFuture" class="future">未来日期不能写日记</p>
    <textarea v-else v-model="text" class="area" placeholder="今天想记下的话" />

    <section v-if="photos.length" class="grid">
      <button
        v-for="(item, i) in photos"
        :key="item.id"
        type="button"
        class="cell"
        @click="openAt(i)"
      >
        <img :src="item.thumbUrl" alt="" />
      </button>
    </section>

    <PhotoViewer
      :open="viewerOpen"
      :photos="photos"
      :start-index="startIndex"
      title="日记图片"
      @close="viewerOpen = false"
      @delete="onDelete"
    />
    <input ref="fileRef" class="hidden" type="file" accept="image/*" multiple @change="onFiles" />
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
  font-size: 18px;
}

.back {
  min-height: 44px;
  color: var(--amber);
  font-weight: 650;
  text-align: left;
}

.add {
  min-height: 44px;
  color: var(--amber);
  font-weight: 650;
}

.when {
  margin: 8px 0 14px;
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}

.future {
  margin: 40px 0;
  color: var(--muted);
  text-align: center;
  font-size: var(--fs-md);
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 14px;
}

.cell {
  aspect-ratio: 1;
  border-radius: 10px;
  overflow: hidden;
  background: var(--bg-elev);
}

.cell img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hidden {
  display: none;
}
</style>
