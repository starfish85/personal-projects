<script setup>
import { computed, ref } from 'vue'
import { PARK_INFO, POIS, withDistance } from '../data/pois'
import { userPoint } from '../stores/app'
import { formatDistance } from '../utils/geo'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { useGeolocation } from '../composables/useGeolocation'

const { restartWatch } = useGeolocation()
const here = computed(() => userPoint())
const nearest = computed(() => {
  if (!here.value) return null
  return withDistance(POIS, here.value)[0] || null
})
const placeText = computed(() => {
  if (!here.value) return '还没有定位。请先开启定位，或告诉工作人员您看到的景点名称。'
  if (nearest.value) {
    const d = nearest.value.distance != null ? `，距${nearest.value.name}约${formatDistance(nearest.value.distance)}` : ''
    return `您在大夫山森林公园${d}。`
  }
  return '已定位，在大夫山森林公园附近。'
})
const coordText = computed(() => {
  if (!here.value) return ''
  return `${here.value.lat.toFixed(5)}, ${here.value.lng.toFixed(5)}`
})

const pending = ref(null)
const numbers = {
  park: { name: '景区问询', tel: '02084801183', display: PARK_INFO.phone },
  police: { name: '报警电话', tel: '110', display: '110' },
  hospital: { name: '急救电话', tel: '120', display: '120' },
}

function askCall(key) {
  pending.value = numbers[key]
}
function callNow() {
  if (!pending.value) return
  window.location.href = `tel:${pending.value.tel}`
  pending.value = null
}
</script>

<template>
  <main class="page help">
    <header class="hero">
      <p class="eyebrow">遇到困难</p>
      <h1>求助</h1>
    </header>

    <section class="pad">
      <article class="card where">
        <p class="kicker">告诉对方您在哪</p>
        <strong>{{ placeText }}</strong>
        <small v-if="coordText">坐标 {{ coordText }}</small>
        <button v-if="!here" class="ghost-btn" @click="restartWatch">开启定位</button>
      </article>

      <button class="card call park" @click="askCall('park')">
        <span class="mark">园</span>
        <span class="txt">
          <strong>打给景区</strong>
          <em>{{ PARK_INFO.phone }}</em>
        </span>
      </button>

      <div class="row">
        <button class="card call warn" @click="askCall('police')">
          <span class="mark">警</span>
          <span class="txt">
            <strong>报警</strong>
            <em>110</em>
          </span>
        </button>
        <button class="card call warn" @click="askCall('hospital')">
          <span class="mark">医</span>
          <span class="txt">
            <strong>急救</strong>
            <em>120</em>
          </span>
        </button>
      </div>

      <p class="hint">先点按钮，确认后再拨号，避免误触。</p>
    </section>

    <ConfirmDialog
      v-if="pending"
      :title="`确定拨打${pending.name} ${pending.display}？`"
      cancel-text="取消"
      ok-text="拨打"
      @cancel="pending = null"
      @ok="callNow"
    />
  </main>
</template>

<style scoped>
.hero {
  padding: calc(18px + var(--safe-top)) 20px 8px;
}
.eyebrow {
  margin: 0 0 4px;
  color: #b42318;
  font-size: var(--fs-xs);
  font-weight: 800;
  letter-spacing: 0.08em;
}
.hero h1 {
  margin: 0;
  color: #b42318;
  font-size: var(--fs-xl);
  font-weight: 800;
}
.pad {
  padding: 12px 16px 24px;
  display: grid;
  gap: 12px;
}
.where {
  padding: 16px;
}
.kicker {
  margin: 0 0 6px;
  color: var(--muted);
  font-size: var(--fs-xs);
  font-weight: 800;
}
.where strong {
  display: block;
  font-size: var(--fs-md);
  line-height: 1.4;
}
.where small {
  display: block;
  margin-top: 8px;
  color: var(--muted);
  font-size: var(--fs-xs);
  font-weight: 700;
}
.where .ghost-btn {
  width: 100%;
  margin-top: 12px;
}
.call {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  text-align: left;
  width: 100%;
}
.mark {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  flex: none;
}
.park .mark {
  background: var(--primary);
  color: #fff;
}
.warn .mark {
  background: #b42318;
  color: #fff;
}
.txt {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.txt strong {
  font-size: var(--fs-lg);
}
.txt em {
  font-style: normal;
  color: var(--muted);
  font-weight: 700;
}
.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.row .call {
  min-width: 0;
}
.row .txt strong {
  font-size: var(--fs-md);
}
.hint {
  margin: 4px 4px 0;
  color: var(--muted);
  font-size: var(--fs-xs);
  font-weight: 700;
}
</style>
