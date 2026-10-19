<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TYPE_META, getPoi, withDistance } from '../data/pois'
import { userPoint } from '../stores/app'
import { formatDistance } from '../utils/geo'
import VoicePlayer from '../components/VoicePlayer.vue'
import { clipForPoi } from '../utils/voice'

const route = useRoute()
const router = useRouter()
const base = import.meta.env.BASE_URL

const poi = computed(() => {
  const raw = getPoi(route.params.id)
  if (!raw) return null
  return withDistance([raw], userPoint())[0]
})
const meta = computed(() => (poi.value ? TYPE_META[poi.value.type] : null))

// 路线模式：query.ids 里带了一整条路线的景点 id（来自智能路线「详情」跳转）
const routePois = computed(() => {
  const ids = route.query.ids
  if (!ids) return []
  return String(ids)
    .split(',')
    .map((id) => getPoi(id))
    .filter(Boolean)
})
const isRoute = computed(() => routePois.value.length > 0)
</script>

<template>
  <!-- 路线模式：展示一条路线上的所有景点介绍 -->
  <main v-if="isRoute" class="page detail">
    <header class="page-head">
      <button class="icon-btn" aria-label="返回" @click="router.back()">‹</button>
      <h1>路线景点介绍</h1>
      <span class="icon-btn" />
    </header>
    <section class="pad">
      <article v-for="p in routePois" :key="p.id" class="card route-poi">
        <div class="route-poi-head">
          <span class="type" :style="{ background: TYPE_META[p.type].color, color: TYPE_META[p.type].ink }">
            {{ TYPE_META[p.type].icon }}
          </span>
          <h3>{{ p.name }}</h3>
        </div>
        <p class="route-poi-intro">{{ p.intro }}</p>
      </article>
    </section>
  </main>

  <main v-else-if="poi" class="page detail">
    <header class="page-head">
      <button class="icon-btn" aria-label="返回" @click="router.back()">‹</button>
      <h1>地点详情</h1>
      <span class="icon-btn" />
    </header>
    <section class="pad">
      <article class="card hero">
        <span class="type" :style="{ background: meta.color, color: meta.ink }">{{ meta.icon }}</span>
        <div>
          <p class="kicker">{{ meta.label }}</p>
          <h2>{{ poi.name }}</h2>
        </div>
      </article>
      <img
        v-if="poi.photo"
        class="photo"
        :src="`${base}${poi.photo}`"
        :alt="poi.name"
      />

      <article class="card facts">
        <p v-if="poi.distance != null"><b>直线</b>{{ formatDistance(poi.distance) }}</p>
        <p v-else><b>距离</b>开启定位后显示</p>
        <p v-if="poi.walkMin"><b>步行</b>大约 {{ poi.walkMin }} 分钟</p>
        <p v-if="poi.recommendMin"><b>建议</b>游览 {{ poi.recommendMin }} 分钟</p>
      </article>

      <article class="card body">
        <h3>介绍</h3>
        <p>{{ poi.intro }}</p>
      </article>

      <article class="card voice">
        <p class="voice-title">语音介绍</p>
        <VoicePlayer
          v-if="poi"
          :clip="clipForPoi(poi.id)"
          :text="poi.intro || poi.voice"
          label="播放语音介绍"
        />
      </article>

      <button class="primary-btn" @click="router.push({ name: 'navigate', params: { id: poi.id } })">
        去这里
      </button>
    </section>
  </main>
  <main v-else class="page pad">未找到该地点</main>
</template>

<style scoped>
.pad {
  padding: 4px 16px 24px;
  display: grid;
  gap: 12px;
}
.hero {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
}
.type {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  flex: none;
}
.kicker {
  margin: 0 0 4px;
  color: var(--muted);
  font-size: var(--fs-xs);
  font-weight: 800;
}
h2 {
  margin: 0;
  font-size: var(--fs-xl);
  color: var(--primary);
}
.facts {
  padding: 14px 16px;
}
.facts p {
  margin: 0 0 8px;
  font-size: var(--fs-md);
  font-weight: 700;
}
.facts p:last-child {
  margin: 0;
}
.facts b {
  display: inline-block;
  min-width: 3.2em;
  color: var(--muted);
  font-size: var(--fs-sm);
}
.body,
.voice {
  padding: 16px;
}
h3,
.voice-title {
  margin: 0 0 8px;
  font-size: var(--fs-md);
  font-weight: 800;
}
.body p {
  margin: 0;
  line-height: 1.6;
  font-weight: 500;
}
.photo {
  width: 100%;
  height: 180px;
  object-fit: cover;
  object-position: center 62%;
  border-radius: var(--radius);
  display: block;
}
</style>
