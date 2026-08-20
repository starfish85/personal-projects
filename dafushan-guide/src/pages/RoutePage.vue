<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getRoute } from '../data/routes'

const route = useRoute()
const router = useRouter()
const pack = computed(() => getRoute(route.params.id))

function openStop(poi, index) {
  if (poi.type === 'attraction' && index > 0 && index < (pack.value?.stops.length || 1) - 1) {
    router.push({ name: 'detail', params: { id: poi.id } })
    return
  }
  router.push({ name: 'navigate', params: { id: poi.id } })
}

function start() {
  const first = pack.value?.stops[0]
  if (first) router.push({ name: 'navigate', params: { id: first.id } })
}
</script>

<template>
  <main v-if="pack" class="page">
    <header class="page-head">
      <button class="icon-btn" aria-label="返回" @click="router.back()">‹</button>
      <h1>推荐路线</h1>
      <span class="icon-btn" />
    </header>
    <section class="pad">
      <article class="card head">
        <p class="eyebrow">游客常见走法 · 待景区核对</p>
        <h2>{{ pack.name }}</h2>
        <p class="meta">{{ pack.audience }} · 大约 {{ pack.minutes }} 分钟</p>
        <p class="src">{{ pack.source }}</p>
      </article>

      <ol class="steps">
        <li v-for="(stop, i) in pack.stops" :key="`${stop.id}-${i}`">
          <button class="card step" @click="openStop(stop, i)">
            <span class="num">{{ i + 1 }}</span>
            <span class="txt">
              <strong>{{ stop.name }}</strong>
              <em>{{ i === 0 ? '起点' : i === pack.stops.length - 1 ? '回到起点' : '途经' }}</em>
            </span>
            <span class="go">去</span>
          </button>
        </li>
      </ol>

      <button class="primary-btn" @click="start">从起点开始导航</button>
    </section>
  </main>
  <main v-else class="page pad">没有这条路线</main>
</template>

<style scoped>
.pad {
  padding: 4px 16px 24px;
  display: grid;
  gap: 12px;
}
.head {
  padding: 16px;
}
.eyebrow {
  margin: 0 0 6px;
  color: var(--primary);
  font-size: var(--fs-xs);
  font-weight: 800;
}
h2 {
  margin: 0 0 8px;
  font-size: var(--fs-xl);
  color: var(--primary);
}
.meta,
.src {
  margin: 0 0 6px;
  color: var(--muted);
  font-size: var(--fs-sm);
  font-weight: 700;
  line-height: 1.45;
}
.src {
  margin: 0;
}
.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.step {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  text-align: left;
}
.num {
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
.txt {
  flex: 1;
  min-width: 0;
}
.txt strong {
  display: block;
  font-size: var(--fs-md);
}
.txt em {
  font-style: normal;
  color: var(--muted);
  font-size: var(--fs-xs);
  font-weight: 700;
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
}
</style>
