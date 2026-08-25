<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PracticeCounter from '../components/PracticeCounter.vue'
import TaskHelpers from '../components/TaskHelpers.vue'
import {
  done,
  practice,
  setTarget,
  subtaskDone,
  taskHasComponent,
  taskHasGallery,
  toggleSubtask,
} from '../stores/practice'
import { confirmDialog, toast } from '../stores/ui'
import { downloadBackup, exportBackup, importBackup } from '../utils/backup'

const router = useRouter()
const showTarget = ref(false)
const draft = ref('10')
const importRef = ref(null)
const subtasks = computed(() => practice.task.subtasks || [])

function openTarget() {
  draft.value = String(practice.task.target)
  showTarget.value = true
}

async function saveTarget() {
  const ok = await setTarget(draft.value)
  if (ok) showTarget.value = false
}

async function doExport() {
  try {
    const data = await exportBackup()
    downloadBackup(data)
    toast('备份已下载，换机或清缓存前留好这份文件')
  } catch {
    toast('导出失败')
  }
}

async function askImport() {
  const ok = await confirmDialog({
    title: '导入备份？',
    copy: '会覆盖本机现有的遍数、图片、标注和笔记。',
    ok: '导入',
    danger: true,
  })
  if (ok) importRef.value?.click()
}

async function onImport(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    await importBackup(file)
    toast('备份已导入')
  } catch (error) {
    toast(error.message || '导入失败')
  }
}
</script>

<template>
  <main class="page">
    <header class="head">
      <button type="button" class="back" @click="router.push('/')">返回</button>
      <p class="brand">{{ practice.task.title }}</p>
      <p class="date">{{ practice.date }}</p>
    </header>

    <template v-if="subtasks.length">
      <p v-if="done" class="ok">今日已完成</p>
      <p v-else class="idle">今日未完成</p>
      <section class="subtasks">
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
    </template>

    <PracticeCounter v-else-if="taskHasComponent('counter')" variant="hero" @edit-target="openTarget" />

    <button
      v-if="taskHasGallery(practice.task)"
      type="button"
      class="gallery-link"
      @click="router.push(`/gallery/${practice.task.id}`)"
    >
      查看作品墙
    </button>

    <TaskHelpers />

    <footer class="foot">
      <button type="button" @click="doExport">导出备份</button>
      <button type="button" @click="askImport">导入备份</button>
    </footer>

    <input ref="importRef" class="hidden" type="file" accept="application/json" @change="onImport" />

    <div v-if="showTarget" class="modal-mask" @click.self="showTarget = false">
      <div class="modal-sheet">
        <h2 class="modal-title">今日目标遍数</h2>
        <p class="modal-copy">改完立刻按新目标判断是否完成。</p>
        <input v-model="draft" class="field" type="number" min="1" max="999" inputmode="numeric" />
        <div class="modal-actions">
          <button class="btn btn-ghost" type="button" @click="showTarget = false">取消</button>
          <button class="btn btn-primary" type="button" @click="saveTarget">保存</button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.page {
  height: 100%;
  overflow: auto;
  padding: calc(18px + var(--safe-top)) 22px calc(24px + var(--safe-bottom));
  max-width: var(--page-max);
  margin: 0 auto;
}

.head {
  display: grid;
  grid-template-columns: 64px 1fr auto;
  align-items: center;
  margin-bottom: 28px;
}

.back {
  min-height: 44px;
  color: var(--amber);
  font-weight: 650;
  text-align: left;
}

.brand {
  margin: 0;
  text-align: center;
  font-size: 18px;
  font-weight: 650;
}

.date {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.foot {
  margin-top: 28px;
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.foot button {
  color: var(--amber);
}

.ok,
.idle {
  margin: 14px 0 18px;
  text-align: center;
  font-size: var(--fs-xl);
  font-weight: 650;
}

.ok {
  color: var(--ok);
}

.idle {
  color: var(--muted);
}

.gallery-link {
  display: block;
  margin: 8px 0 4px;
  color: var(--amber);
  font-weight: 650;
  min-height: 40px;
}

.subtasks {
  display: grid;
  gap: 12px;
  margin: 22px 0;
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

.hidden {
  display: none;
}

.modal-actions .btn {
  flex: 1;
}
</style>
