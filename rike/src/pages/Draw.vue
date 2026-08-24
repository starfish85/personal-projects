<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PhotoViewer from '../components/PhotoViewer.vue'
import {
  addCheckins,
  checkinsOn,
  dayComplete,
  practice,
  removeCheckin,
  subtaskDone,
  toggleSubtask,
} from '../stores/practice'
import { confirmDialog, toast } from '../stores/ui'

const router = useRouter()
const fileRef = ref(null)
const viewerOpen = ref(false)
const startIndex = ref(0)

const todayPhotos = computed(() => checkinsOn(practice.date, practice.task.id))
const subtasks = computed(() => practice.task.subtasks || [])
const doneToday = computed(() => {
  const rec = practice.todayByTask[practice.task.id]
  if (subtasks.value.length) return dayComplete(practice.task, rec)
  return (rec?.count || 0) > 0 || todayPhotos.value.length > 0
})
const doneLabel = computed(() => {
  if (subtasks.value.length) return doneToday.value ? '今日已完成' : ''
  const rec = practice.todayByTask[practice.task.id]
  const n = rec?.count || todayPhotos.value.length
  return n ? `今日已完成 · ${n} 张` : ''
})

function pick() {
  fileRef.value?.click()
}

async function onFiles(event) {
  const added = await addCheckins(event.target.files, practice.date)
  event.target.value = ''
  if (added.length) toast('已记下')
}

function openAt(index) {
  startIndex.value = index
  viewerOpen.value = true
}

async function onDelete(id) {
  const ok = await confirmDialog({
    title: '删除这张画？',
    copy: '删掉后日历里这一天也会少一张。如果是今天最后一张，今日打卡会取消。',
    ok: '删除',
    danger: true,
  })
  if (!ok) return
  await removeCheckin(id)
  if (!todayPhotos.value.length) viewerOpen.value = false
}
</script>

<template>
  <main class="page">
    <header class="head">
      <button type="button" class="back" @click="router.push('/')">返回</button>
      <h1>{{ practice.task.title }}</h1>
      <button v-if="!subtasks.length" type="button" class="add" @click="pick">上传</button>
      <span v-else />
    </header>

    <p v-if="doneToday" class="ok">{{ doneLabel }}</p>

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

    <button v-else class="upload" type="button" @click="pick">上传图片打卡</button>

    <section v-if="todayPhotos.length" class="grid">
      <button
        v-for="(item, i) in todayPhotos"
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
      :photos="todayPhotos"
      :start-index="startIndex"
      title="打卡图片"
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

.back,
.add {
  min-height: 44px;
  color: var(--amber);
  font-weight: 650;
}

.ok {
  margin: 14px 0 18px;
  color: var(--ok);
  font-weight: 650;
}

.upload {
  width: 100%;
  margin-top: 16px;
  min-height: var(--tap-lg);
  border-radius: 16px;
  background: var(--draw);
  color: var(--ink);
  font-size: 17px;
  font-weight: 750;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 16px;
}

.subtasks {
  display: grid;
  gap: 12px;
  margin-top: 22px;
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
