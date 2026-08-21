<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PhotoViewer from '../components/PhotoViewer.vue'
import { addCheckins, checkinsOn, practice, removeCheckin } from '../stores/practice'
import { confirmDialog, toast } from '../stores/ui'

const router = useRouter()
const fileRef = ref(null)
const viewerOpen = ref(false)
const startIndex = ref(0)

const todayPhotos = computed(() => checkinsOn(practice.date))
const doneToday = computed(() => todayPhotos.value.length > 0)

function pick() {
  fileRef.value?.click()
}

async function onFiles(event) {
  const added = await addCheckins(event.target.files, practice.date)
  event.target.value = ''
  if (added.length) toast('已记下今天的画')
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
      <h1>画画</h1>
      <button type="button" class="add" @click="pick">上传</button>
    </header>

    <p v-if="doneToday" class="ok">今日画画已完成 · {{ todayPhotos.length }} 张</p>
    <p v-else class="lead">把今天画的拍下来。有一张就算今天画过，日历进度会亮一段蓝色。</p>

    <button class="upload" type="button" @click="pick">上传今天的画</button>

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

    <p class="hint">以前的画在「练习日历」里按天回看。</p>

    <PhotoViewer
      :open="viewerOpen"
      :photos="todayPhotos"
      :start-index="startIndex"
      title="今天的画"
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
  max-width: 480px;
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

.lead,
.hint {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
}

.lead {
  margin: 14px 0 18px;
}

.ok {
  margin: 14px 0 18px;
  color: var(--ok);
  font-weight: 650;
}

.upload {
  width: 100%;
  min-height: 56px;
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

.hint {
  margin-top: 18px;
}

.hidden {
  display: none;
}
</style>
