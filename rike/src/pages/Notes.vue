<script setup>
import { onActivated, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NotesOverlay from '../components/NotesOverlay.vue'
import { addFiles, openTask, practice } from '../stores/practice'
import { toast } from '../stores/ui'

const router = useRouter()
const route = useRoute()
const fileRef = ref(null)
const open = ref(false)
const startIndex = ref(0)

function fallbackNotesPath() {
  const current = practice.tasks.find((item) => item.id === practice.task.id)
  if (!current) return '/'
  const components = Array.isArray(current.components) ? current.components : []
  if (current.notes || components.includes('notes')) return `/notes/${current.id}`
  return '/'
}

async function syncTaskFromRoute() {
  if (!practice.ready) return false
  if (route.name !== 'notes') return false
  const id = String(route.params.taskId || '')
  if (!id) {
    router.replace(fallbackNotesPath())
    return false
  }
  const ok = await openTask(id)
  if (!ok) {
    toast('没有找到这个任务')
    await router.replace({ path: '/' })
    return false
  }
  return true
}

function openAt(index) {
  startIndex.value = index
  open.value = true
}

function pick() {
  fileRef.value?.click()
}

async function onFiles(event) {
  const files = event.target.files
  const id = String(route.params.taskId || practice.task.id)
  if (!(await syncTaskFromRoute())) {
    event.target.value = ''
    return
  }
  await addFiles('note', files, id)
  event.target.value = ''
}

onActivated(syncTaskFromRoute)
watch(() => [route.params.taskId, practice.ready], syncTaskFromRoute, { immediate: true })
</script>

<template>
  <main class="page">
    <header class="head">
      <button type="button" class="back" @click="router.push(`/task/${practice.task.id}`)">返回</button>
      <h1>乐理笔记</h1>
      <button type="button" class="add" @click="pick">添加</button>
    </header>

    <section v-if="!practice.notes.length" class="empty">
      <p>把要背的乐理拍下来。练谱时随时能翻，不用离开曲谱。</p>
      <p class="sub">这是「{{ practice.task.title }}」的笔记</p>
      <button class="btn btn-primary" type="button" @click="pick">上传笔记图片</button>
    </section>

    <section v-else class="grid">
      <button
        v-for="(item, i) in practice.notes"
        :key="item.id"
        type="button"
        class="cell"
        @click="openAt(i)"
      >
        <img :src="item.thumbUrl" alt="" />
      </button>
    </section>

    <NotesOverlay
      :open="open"
      :start-index="startIndex"
      :task-id="String(route.params.taskId || practice.task.id)"
      @close="open = false"
    />
    <input ref="fileRef" class="hidden" type="file" accept="image/*" multiple @change="onFiles" />
  </main>
</template>

<style scoped>
.page {
  height: 100%;
  overflow: auto;
  padding: calc(12px + var(--safe-top)) 16px calc(20px + var(--safe-bottom));
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

.back,
.add {
  min-height: 44px;
  color: var(--amber);
  font-weight: 650;
}

.empty {
  margin-top: 24px;
  padding: 48px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--muted);
  text-align: center;
  line-height: 1.6;
}

.empty p {
  margin: 0;
  max-width: 280px;
}

.empty .sub {
  color: var(--text);
  font-weight: 650;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
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
