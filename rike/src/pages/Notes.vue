<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import NotesOverlay from '../components/NotesOverlay.vue'
import { addFiles, practice } from '../stores/practice'

const router = useRouter()
const fileRef = ref(null)
const open = ref(false)
const startIndex = ref(0)

function openAt(index) {
  startIndex.value = index
  open.value = true
}

function pick() {
  fileRef.value?.click()
}

async function onFiles(event) {
  await addFiles('note', event.target.files)
  event.target.value = ''
}
</script>

<template>
  <main class="page">
    <header class="head">
      <button type="button" class="back" @click="router.push(`/task/${practice.task.id}`)">返回</button>
      <h1>乐理笔记</h1>
      <button type="button" class="add" @click="pick">添加</button>
    </header>

    <section v-if="!practice.notes.length" class="empty">
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

    <NotesOverlay :open="open" :start-index="startIndex" @close="open = false" />
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
  padding: 48px 0;
  display: flex;
  justify-content: center;
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
