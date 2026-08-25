<script setup>
import { computed, ref, watch } from 'vue'
import SheetViewer from './SheetViewer.vue'
import { addFiles, openTask, practice, removeAsset } from '../stores/practice'
import { confirmDialog } from '../stores/ui'

const props = defineProps({
  open: { type: Boolean, default: false },
  startIndex: { type: Number, default: 0 },
  taskId: { type: String, default: '' },
})

const emit = defineEmits(['close'])
const fileRef = ref(null)
const current = ref(0)

const note = computed(() => practice.notes[current.value] || null)

watch(
  () => practice.notes.length,
  (len) => {
    if (current.value >= len) current.value = Math.max(0, len - 1)
  },
)

watch(
  () => props.open,
  (open) => {
    if (open) current.value = Math.max(0, props.startIndex || 0)
  },
)

function pick() {
  fileRef.value?.click()
}

async function onFiles(event) {
  const files = event.target.files
  const id = props.taskId || practice.task.id
  if (id && id !== practice.task.id) {
    const ok = await openTask(id)
    if (!ok) {
      event.target.value = ''
      return
    }
  }
  const added = await addFiles('note', files, id)
  event.target.value = ''
  if (added.length) current.value = practice.notes.length - 1
}

async function remove() {
  if (!note.value) return
  const ok = await confirmDialog({
    title: '删除这张笔记？',
    copy: '删除后练谱时就翻不到它了。',
    ok: '删除',
    danger: true,
  })
  if (!ok) return
  await removeAsset(note.value.id)
}
</script>

<template>
  <div v-if="open" class="overlay">
    <header class="bar">
      <button type="button" class="text" @click="emit('close')">关闭</button>
      <strong>乐理笔记</strong>
      <button type="button" class="text" @click="pick">添加</button>
    </header>

    <div v-if="!practice.notes.length" class="empty">
      <p>把要背的乐理拍下来。练谱时随时能翻，不用离开曲谱。</p>
      <p>这是「{{ practice.task.title }}」的笔记</p>
      <button class="btn btn-primary" type="button" @click="pick">上传笔记图片</button>
    </div>

    <template v-else>
      <div class="stage">
        <SheetViewer
          :key="note.id"
          :src="note.url"
          :natural-width="note.width"
          :natural-height="note.height"
          :annotatable="false"
        />
      </div>
      <div class="film">
        <button
          v-for="(item, i) in practice.notes"
          :key="item.id"
          type="button"
          class="thumb"
          :class="{ on: i === current }"
          @click="current = i"
        >
          <img :src="item.thumbUrl" alt="" />
        </button>
        <button type="button" class="kill" @click="remove">删除这张</button>
      </div>
    </template>

    <input
      ref="fileRef"
      class="hidden"
      type="file"
      accept="image/*"
      multiple
      @change="onFiles"
    />
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  background: #120f0c;
}

.bar {
  display: grid;
  grid-template-columns: 64px 1fr 64px;
  align-items: center;
  padding: calc(10px + var(--safe-top)) 8px 10px;
}

.bar strong {
  text-align: center;
}

.text {
  min-height: 44px;
  color: var(--amber);
  font-weight: 650;
}

.stage {
  flex: 1;
  min-height: 0;
}

.empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px;
  color: var(--muted);
  text-align: center;
  line-height: 1.6;
}

.empty p {
  margin: 0;
  max-width: 280px;
}

.film {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px 12px calc(12px + var(--safe-bottom));
  overflow-x: auto;
  background: rgba(0, 0, 0, 0.35);
}

.thumb {
  flex: 0 0 56px;
  height: 56px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid transparent;
  background: #000;
}

.thumb.on {
  border-color: var(--amber);
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.kill {
  margin-left: auto;
  color: var(--danger);
  font-size: 13px;
  white-space: nowrap;
}

.hidden {
  display: none;
}
</style>
