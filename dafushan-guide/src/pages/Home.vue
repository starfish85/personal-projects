<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { PARK_INFO, POIS, getPoi, withDistance } from '../data/pois'
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
  if (here.value.source === 'mock') return `演示中：${getPoi(app.mockPoiId)?.name || '自选点'}`
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
      <!-- 定位卡片：适老上下布局——上面看位置，下面通宽大按钮（≥48px） -->
      <article class="card loc">
        <div class="loc-info">
          <span class="badge">位</span>
          <div class="loc-text">
            <p class="kicker">您当前位于</p>
            <strong>{{ locationTitle }}</strong>
          </div>
        </div>
        <button
          v-if="!here || here.source !== 'gps'"
          class="loc-btn"
          @click="restartWatch"
        >
          {{ app.gpsStatus === 'locating' ? '定位中…' : '开启定位' }}
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

      <!-- 功能入口卡：整张卡片可点击，不再单独放小圆"去"按钮（适老：消灭小控件） -->
      <button class="card ai-entry" @click="router.push({ name: 'recognize' })">
        <span class="ai-mark">花</span>
        <span class="ai-text">
          <strong>拍照识花</strong>
          <em>AI 辨认花草，还能讲给您听</em>
        </span>
      </button>

      <button class="card ai-entry smart-entry" @click="router.push({ name: 'smart-route' })">
        <span class="ai-mark">线</span>
        <span class="ai-text">
          <strong>智能路线</strong>
          <em>告诉我您想去哪，AI 帮您规划</em>
        </span>
      </button>

      <button class="card map-entry" @click="router.push({ name: 'map' })">
        <img :src="`${base}maps/park-thumb.jpg?v=3`" alt="" />
        <span class="map-cta">查看完整地图</span>
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
/* 定位卡片：上下布局，内部留白充足，按钮独立通宽 */
.loc {
  display: grid;
  gap: 12px;
  padding: 16px;
}
.loc-info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.badge {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: #e4f4e2;
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--fs-md);
  font-weight: 800;
  flex: none;
}
.loc-text {
  flex: 1;
  min-width: 0;
}
.kicker {
  margin: 0 0 2px;
  font-size: var(--fs-sm);
  color: var(--ink-3, #444);
  font-weight: 700;
}
.loc strong {
  display: block;
  font-size: var(--fs-md);
  line-height: 1.3;
}
/* 开启定位：通宽大按钮，高度取触控标准 */
.loc-btn {
  width: 100%;
  min-height: var(--tap);
  border-radius: 14px;
  background: var(--primary);
  color: #fff;
  font-size: var(--fs-sm);
  font-weight: 800;
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
/* 求助/附近：白底卡片 + 彩色图标 + 黑色粗体文字（警示色只留在图标上） */
.help-entry strong {
  color: var(--text);
}
.near-entry strong {
  color: var(--text);
}
.home-search {
  min-height: var(--tap-main);
}
.search-ico {
  color: var(--primary);
  font-size: 22px;
  font-weight: 700;
}
/* 功能入口卡：纯白底，颜色只留在图标上；整卡可点，高度充足 */
.ai-entry {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  text-align: left;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  min-height: var(--tap-main);
  background: var(--surface);
}
/* 图标：无填充色块，只保留主色图形（适老：减少彩色背景） */
.ai-mark {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: #e4f4e2;
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 800;
  flex: none;
}
.ai-text {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 4px;
}
.ai-text strong {
  font-size: var(--fs-md);
  color: var(--text);
  font-weight: 800;
}
.ai-text em {
  font-style: normal;
  font-size: var(--fs-sm);
  color: #444;
  font-weight: 700;
}
.map-entry {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px 10px 10px;
  text-align: left;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  min-height: var(--tap-main);
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
  color: var(--text);
  overflow-wrap: anywhere;
}
/* 推荐路线：每条独立大卡片，整行可点，高度≥48px，条目间留空隙 */
.section-title {
  margin: 6px 0 0;
  font-size: var(--fs-md);
  font-weight: 800;
}
.routes {
  display: grid;
  gap: 10px;
}
.route {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px 10px;
  min-height: var(--tap);
  padding: 14px 16px;
  text-align: left;
  width: 100%;
  min-width: 0;
  max-width: 100%;
}
.route strong {
  flex: 1;
  min-width: 0;
  font-size: var(--fs-md);
  color: var(--text);
}
.route em {
  flex: none;
  font-style: normal;
  color: #444;
  font-size: var(--fs-sm);
  font-weight: 700;
}
</style>
