<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import ParkMap from '../components/ParkMap.vue'
import PoiCard from '../components/PoiCard.vue'
import { POIS, withDistance } from '../data/pois'
import { userPoint } from '../stores/app'

const router = useRouter()
const filter = ref('attraction')
const selected = ref(null)
const here = computed(() => userPoint())
const list = computed(() => {
  const base = filter.value
    ? POIS.filter((p) => p.type === filter.value)
    : POIS.filter((p) => p.type === 'attraction' || p.type === 'exit')
  return withDistance(base, here.value)
})
const selectedFull = computed(() => {
  if (!selected.value) return null
  return list.value.find((p) => p.id === selected.value.id) || selected.value
})

function onSelect(poi) {
  selected.value = poi
}
function go(poi) {
  router.push({ name: 'navigate', params: { id: poi.id } })
}
function detail(poi) {
  router.push({ name: 'detail', params: { id: poi.id } })
}
</script>

<template>
  <main class="page map-page">
    <header class="page-head">
      <button class="icon-btn" aria-label="回到首页" @click="router.push({ name: 'home' })">‹</button>
      <h1>回到首页</h1>
      <span class="icon-btn" />
    </header>
    <div class="stage">
      <ParkMap
        :pois="list"
        :user="here"
        :active-filter="filter"
        :selected-id="selected?.id || ''"
        show-filters
        @select="onSelect"
        @filter="filter = $event"
      />
    </div>
    <div v-if="selectedFull" class="sheet">
      <PoiCard :poi="selectedFull" @go="go" @detail="detail" />
    </div>
  </main>
</template>

<style scoped>
.map-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  padding-bottom: 8px;
}
.page-head {
  flex: 0 0 auto;
}
.stage {
  flex: 1;
  min-height: 280px;
  margin: 0 12px;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: var(--shadow);
}
.sheet {
  padding: 10px 12px 12px;
}
</style>
