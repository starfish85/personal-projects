<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CheckTask from './CheckTask.vue'
import Draw from './Draw.vue'
import RichTask from './RichTask.vue'
import { openTask, practice } from '../stores/practice'

const route = useRoute()
const router = useRouter()

watch(
  () => route.params.id,
  async (id) => {
    const ok = await openTask(String(id || ''))
    if (!ok) router.replace('/')
  },
  { immediate: true },
)

const current = computed(
  () => practice.tasks.find((item) => item.id === route.params.id) || practice.task,
)
const kind = computed(() => current.value?.completion || 'check')
</script>

<template>
  <RichTask v-if="kind === 'counter'" />
  <Draw v-else-if="kind === 'photo-log'" />
  <CheckTask v-else />
</template>
