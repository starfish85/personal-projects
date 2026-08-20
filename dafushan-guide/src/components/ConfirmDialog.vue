<script setup>
defineProps({
  title: { type: String, required: true },
  cancelText: { type: String, default: '取消' },
  okText: { type: String, default: '确定' },
})
const emit = defineEmits(['cancel', 'ok'])
</script>

<template>
  <Teleport to="body">
    <div class="mask" role="dialog" aria-modal="true" @touchmove.prevent>
      <div class="box">
        <button class="x" aria-label="关闭" @click="emit('cancel')">×</button>
        <p class="title">{{ title }}</p>
        <div class="actions">
          <button class="ghost-btn" @click="emit('cancel')">{{ cancelText }}</button>
          <button class="ghost-btn danger" @click="emit('ok')">{{ okText }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  background: rgba(16, 40, 22, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 4000;
  padding: 24px;
  pointer-events: auto;
}
.box {
  width: min(360px, 100%);
  background: #fff;
  border-radius: 20px;
  padding: 28px 20px 20px;
  position: relative;
  box-shadow: var(--shadow);
}
.x {
  position: absolute;
  right: 8px;
  top: 4px;
  width: var(--tap);
  height: var(--tap);
  font-size: 32px;
  line-height: 1;
}
.title {
  margin: 8px 8px 24px;
  text-align: center;
  font-size: var(--fs-lg);
  font-weight: 800;
}
.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.danger {
  border-color: var(--danger);
  color: var(--danger);
}
</style>
