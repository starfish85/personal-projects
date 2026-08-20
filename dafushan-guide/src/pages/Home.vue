<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { PARK_INFO, POIS, withDistance } from '../data/pois'
import { ROUTES } from '../data/routes'
import { app, userPoint } from '../stores/app'
import { formatDistance, isInsidePark } from '../utils/geo'
import { useGeolocation } from '../composables/useGeolocation'

const router = useRouter()
const base = import.meta.env.BASE_URL
const { restartWatch } = useGeolocation()
const keyword = ref('')
const here = computed(() => userPoint())
const locationTitle = computed(() => {
  if (app.gpsStatus === 'locating' && !here.value) return '正在定位…'
  if (!here.value) return '还没有您的位置'
  if (here.value.source === 'mock') return `演示中：${app.mockPoiId === 'visitor-center' ? '游客中心' : '自选点'}`
  const list = withDistance(POIS, here.value)
  const nearest = list[0]
  if (!nearest) return '已定位'
  if (!isInsidePark(here.value)) return '已定位，您不在园内'
  if (nearest.distance <= 80) return `${nearest.name}附近`
  return `园内，距${nearest.name}约${formatDistance(nearest.distance)}`
})
function search() {
  router.push({ name: 'nearby', query: { q: keyword.value } })
}
</script>

<template>
  <main class="page home">
    <header class="hero">
      <p class="eyebrow">广州 · 番禺</p>
      <h1>{{ PARK_INFO.name }}</h1>
    </header>

    <section class="pad">
      <article class="card loc">
        <span class="badge">位</span>
        <div class="loc-text">
          <p class="kicker">您当前位于</p>
          <strong>{{ locationTitle }}</strong>
        </div>
        <button
          v-if="!here || here.source !== 'gps'"
          class="loc-btn"
          @click="restartWatch"
        >
          {{ app.gpsStatus === 'locating' ? '定位中' : '开启定位' }}
        </button>
      </article>

      <div class="quick">
        <button class="card help-entry" @click="router.push({ name: 'help' })">
          <span class="help-mark">!</span>
          <strong>求助</strong>
        </button>
        <button class="card near-entry" @click="router.push({ name: 'nearby' })">
          <span class="near-mark">近</span>
          <strong>附近地点</strong>
        </button>
      </div>

      <form class="search-box home-search" @submit.prevent="search">
        <span class="search-ico" aria-hidden="true">⌕</span>
        <input v-model="keyword" type="search" placeholder="想去哪里？" enterkeyhint="search" />
      </form>

      <button class="card map-entry" @click="router.push({ name: 'map' })">
        <img :src="`${base}maps/park-thumb.jpg?v=3`" alt="" />
        <span class="map-cta">查看完整地图</span>
        <span class="map-go">去</span>
      </button>

      <h2 class="section-title">推荐路线</h2>
      <div class="routes">
        <button
          v-for="item in ROUTES"
          :key="item.id"
          class="card route"
          @click="router.push({ name: 'route', params: { id: item.id } })"
        >
          <strong>{{ item.name }}</strong>
          <em>约{{ item.minutes }}分钟</em>
        </button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.home {
  background: transparent;
}
.hero {
  padding: calc(10px + var(--safe-top)) 20px 2px;
  text-align: left;
}
.eyebrow {
  margin: 0 0 2px;
  color: var(--primary);
  font-size: var(--fs-xs);
  font-weight: 800;
  letter-spacing: 0.08em;
}
.hero h1 {
  margin: 0;
  color: var(--primary);
  font-size: var(--fs-lg);
  font-weight: 800;
  letter-spacing: 0.02em;
}
.pad {
  padding: 8px 16px 8px;
  display: grid;
  gap: 8px;
  min-width: 0;
  max-width: 100%;
}
.loc {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
}
.badge {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #e4f4e2;
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  flex: none;
}
.loc-text {
  flex: 1;
  min-width: 0;
}
.kicker {
  margin: 0 0 2px;
  font-size: var(--fs-xs);
  color: var(--muted);
  font-weight: 700;
}
.loc strong {
  display: block;
  font-size: var(--fs-md);
  line-height: 1.25;
}
.loc-btn {
  flex: none;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 999px;
  background: var(--primary);
  color: #fff;
  font-size: var(--fs-xs);
  font-weight: 800;
  white-space: nowrap;
}
.quick {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
  min-width: 0;
  max-width: 100%;
}
.help-entry,
.near-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  max-width: 100%;
  min-height: 56px;
  padding: 8px 10px;
  text-align: left;
  width: 100%;
}
.help-mark,
.near-mark {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 800;
  flex: none;
}
.help-mark {
  background: #b42318;
  color: #fff;
}
.near-mark {
  background: #e4f4e2;
  color: var(--primary);
}
.help-entry strong,
.near-entry strong {
  min-width: 0;
  font-size: var(--fs-md);
  line-height: 1.2;
  overflow-wrap: anywhere;
}
.help-entry strong {
  color: #b42318;
}
.near-entry strong {
  color: var(--primary);
}
.home-search {
  min-height: var(--tap);
}
.search-ico {
  color: var(--primary);
  font-size: 22px;
  font-weight: 700;
}
.map-entry {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px 8px 8px;
  text-align: left;
  width: 100%;
  min-width: 0;
  max-width: 100%;
}
.map-entry img {
  width: 72px;
  height: 56px;
  object-fit: cover;
  border-radius: 12px;
  flex: none;
}
.map-cta {
  flex: 1;
  min-width: 0;
  font-size: var(--fs-md);
  font-weight: 800;
  color: var(--primary);
  overflow-wrap: anywhere;
}
.map-go {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e4f4e2;
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  flex: none;
}
.section-title {
  margin: 6px 0 0;
  font-size: var(--fs-sm);
}
.routes {
  display: grid;
  gap: 8px;
}
.route {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px 10px;
  padding: 12px 14px;
  text-align: left;
  width: 100%;
  min-width: 0;
  max-width: 100%;
}
.route strong {
  flex: 1;
  min-width: 0;
  font-size: var(--fs-md);
  color: var(--primary);
}
.route em {
  flex: none;
  font-style: normal;
  color: var(--muted);
  font-size: var(--fs-xs);
  font-weight: 700;
}
</style>
