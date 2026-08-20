<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { FILTERS, TYPE_META, searchPois, withDistance } from '../data/pois'
import { userPoint } from '../stores/app'
import { formatDistance } from '../utils/geo'

const route = useRoute()
const router = useRouter()
const here = computed(() => userPoint())
const filter = ref(route.query.type || 'attraction')
const list = computed(() => {
  const found = searchPois(route.query.q).filter((p) => p.type === filter.value)
  return withDistance(found, here.value)
})

function setFilter(id) {
  filter.value = id
}

function open(poi) {
  if (poi.type === 'attraction') router.push({ name: 'detail', params: { id: poi.id } })
  else router.push({ name: 'navigate', params: { id: poi.id } })
}

function meta(poi) {
  return TYPE_META[poi.type]
}
</script>

<template>
  <main class="page">
    <header class="page-head">
      <button class="icon-btn" aria-label="返回" @click="router.back()">‹</button>
      <h1>{{ route.query.q ? `搜索：${route.query.q}` : '附近地点' }}</h1>
      <span class="icon-btn" />
    </header>
    <div class="tabs" role="tablist" aria-label="地点分类">
      <button
        v-for="item in FILTERS"
        :key="item.id"
        class="tab"
        :class="{ on: filter === item.id }"
        @click="setFilter(item.id)"
      >
        {{ item.label }}
      </button>
    </div>
    <p v-if="!list.length" class="empty">这一类暂时没有地点</p>
    <div class="list">
      <button v-for="poi in list" :key="poi.id" class="card near" @click="open(poi)">
        <span class="type" :style="{ background: meta(poi).color, color: meta(poi).ink }">{{ meta(poi).icon }}</span>
        <span class="main">
          <strong>{{ poi.name }}</strong>
          <em v-if="poi.distance != null">直线 {{ formatDistance(poi.distance) }} · 约{{ poi.walkMin }}分钟</em>
          <em v-else>定位后显示距离</em>
          <small v-if="poi.intro" class="intro">{{ poi.intro }}</small>
        </span>
        <span class="go">去</span>
      </button>
    </div>
  </main>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 8px;
  padding: 0 16px 12px;
  overflow-x: auto;
}
.tab {
  flex: 1 0 auto;
  min-height: 44px;
  padding: 0 16px;
  border-radius: 999px;
  background: #fff;
  color: var(--primary);
  font-weight: 800;
  box-shadow: var(--shadow);
}
.tab.on {
  background: var(--primary);
  color: #fff;
}
.empty {
  margin: 8px 20px 0;
  color: var(--muted);
  font-weight: 700;
}
.list {
  padding: 4px 16px 20px;
  display: grid;
  gap: 10px;
}
.near {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  text-align: left;
}
.type {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  flex: none;
}
.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.main strong {
  font-size: var(--fs-md);
}
.main em {
  font-style: normal;
  color: var(--muted);
  font-size: var(--fs-xs);
  font-weight: 700;
}
.intro {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  color: #3d4a3c;
  font-size: var(--fs-xs);
  font-weight: 600;
  line-height: 1.4;
}
.go {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e4f4e2;
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  flex: none;
}
</style>
