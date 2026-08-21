<script setup>
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ensureToday, practice } from './stores/practice'
import { ui } from './stores/ui'

const route = useRoute()

onMounted(() => {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') ensureToday()
  })
})
</script>

<template>
  <div class="app" :data-page="route.name">
    <router-view v-slot="{ Component }">
      <keep-alive include="Sheet">
        <component :is="Component" />
      </keep-alive>
    </router-view>

    <div v-if="ui.toast" class="toast" role="status">{{ ui.toast }}</div>

    <div v-if="ui.confirm" class="modal-mask" @click.self="ui.confirm.settle(false)">
      <div class="modal-sheet">
        <h2 class="modal-title">{{ ui.confirm.title }}</h2>
        <p class="modal-copy">{{ ui.confirm.copy }}</p>
        <div class="modal-actions">
          <button class="btn btn-ghost" type="button" @click="ui.confirm.settle(false)">
            取消
          </button>
          <button
            class="btn"
            :class="ui.confirm.danger ? 'btn-danger' : 'btn-primary'"
            type="button"
            @click="ui.confirm.settle(true)"
          >
            {{ ui.confirm.ok }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="!practice.ready" class="boot">日课</div>
  </div>
</template>

<style scoped>
.app {
  height: 100%;
}

.boot {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  color: var(--paper);
  letter-spacing: 0.4em;
  font-size: 22px;
}

.modal-actions .btn {
  flex: 1;
}
</style>
