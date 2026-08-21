<script setup>
import { computed, ref, watch } from 'vue'
import SheetViewer from './SheetViewer.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  photos: { type: Array, default: () => [] },
  startIndex: { type: Number, default: 0 },
  title: { type: String, default: '画作' },
})

const emit = defineEmits(['close', 'delete'])
const current = ref(0)
const photo = computed(() => props.photos[current.value] || null)

watch(
  () => [props.open, props.startIndex, props.photos.length],
  () => {
    if (!props.open) return
    const max = Math.max(0, props.photos.length - 1)
    current.value = Math.min(Math.max(0, props.startIndex || 0), max)
  },
)
</script>

<template>
  <div v-if="open" class="overlay">
    <header class="bar">
      <button type="button" class="text" @click="emit('close')">关闭</button>
      <strong>{{ title }}</strong>
      <button v-if="photo" type="button" class="text danger" @click="emit('delete', photo.id)">
        删除
      </button>
      <span v-else />
    </header>
    <div v-if="photo" class="stage">
      <SheetViewer
        :key="photo.id"
        :src="photo.url"
        :natural-width="photo.width"
        :natural-height="photo.height"
        :annotatable="false"
      />
    </div>
    <div v-if="photos.length > 1" class="film">
      <button
        v-for="(item, i) in photos"
        :key="item.id"
        type="button"
        class="thumb"
        :class="{ on: i === current }"
        @click="current = i"
      >
        <img :src="item.thumbUrl" alt="" />
      </button>
    </div>
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

.danger {
  color: var(--danger);
}

.stage {
  flex: 1;
  min-height: 0;
}

.film {
  display: flex;
  gap: 8px;
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
</style>
