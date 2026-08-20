<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import TabBar from './components/TabBar.vue'
import ForestBackdrop from './components/ForestBackdrop.vue'
import { app, applyFontToDocument } from './stores/app'
import { useGeolocation } from './composables/useGeolocation'
import { useProximityGuide } from './composables/useProximityGuide'
import { unlockVoice } from './utils/voice'

const route = useRoute()
const showTab = computed(() => route.meta.tab !== false)
const { startWatch } = useGeolocation()

useProximityGuide()

onMounted(() => {
  applyFontToDocument()
  if (app.onboarded) startWatch()
  unlockVoice()
})
</script>

<template>
  <div class="app-shell" :data-font="app.fontSize">
    <ForestBackdrop />
    <div class="app-main">
      <router-view />
    </div>
    <TabBar v-if="showTab" />
    <div v-if="app.toast" class="toast" role="status">{{ app.toast }}</div>
  </div>
</template>
