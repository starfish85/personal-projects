<script setup>
import { computed } from 'vue'
import { FONT_OPTIONS, app, persistSettings, setFontSize } from '../stores/app'
import { PARK_INFO, POIS } from '../data/pois'
import { useGeolocation } from '../composables/useGeolocation'

const { restartWatch } = useGeolocation()
const gpsLabel = computed(() => {
  if (app.useMockLocation) return '演示定位（自选地点，不是真实 GPS）'
  if (app.locationSource === 'gps' && app.userLat != null) {
    const acc = app.gpsAccuracy ? `，精度约${Math.round(app.gpsAccuracy)}米` : ''
    return `真实定位：${app.userLat.toFixed(5)}, ${app.userLng.toFixed(5)}${acc}`
  }
  if (app.gpsStatus === 'locating') return '正在获取真实定位…'
  if (app.gpsStatus === 'error') return `定位失败：${app.gpsError}`
  return '尚未拿到真实定位，不会假装您在游客中心'
})

function onMockChange() {
  persistSettings()
  restartWatch()
}
</script>

<template>
  <main class="page mine">
    <header class="hero">
      <p class="eyebrow">设置</p>
      <h1>我的</h1>
    </header>

    <section class="pad">
      <article class="card box">
        <p class="label">字体大小</p>
        <div class="fonts" role="radiogroup">
          <button
            v-for="item in FONT_OPTIONS"
            :key="item.id"
            class="font-chip"
            :class="[{ on: app.fontSize === item.id }, item.id]"
            @click="setFontSize(item.id)"
          >
            {{ item.label.replace('字体', '') }}
          </button>
        </div>
      </article>

      <article class="card box">
        <div class="line">
          <span>语言</span>
          <select v-model="app.language" @change="persistSettings()">
            <option value="zh">中文</option>
            <option value="yue">粤语（若手机有粤语语音）</option>
          </select>
        </div>
        <div class="line">
          <span>语音播报</span>
          <button class="switch" :class="{ on: app.voiceEnabled }" @click="app.voiceEnabled = !app.voiceEnabled; persistSettings()">
            {{ app.voiceEnabled ? '开' : '关' }}
          </button>
        </div>
        <p class="label">音量</p>
        <input
          v-model.number="app.volume"
          class="vol"
          type="range"
          min="0.2"
          max="1"
          step="0.05"
          @change="persistSettings()"
        />
      </article>

      <article class="card box">
        <p class="label">定位方式</p>
        <label class="check">
          <input v-model="app.useMockLocation" type="checkbox" @change="onMockChange" />
          室内演示：不用手机 GPS，自选所在地点
        </label>
        <select
          v-if="app.useMockLocation"
          v-model="app.mockPoiId"
          class="full"
          @change="onMockChange"
        >
          <option v-for="poi in POIS" :key="poi.id" :value="poi.id">{{ poi.name }}</option>
        </select>
        <p class="gps">{{ gpsLabel }}</p>
        <button v-if="!app.useMockLocation" class="ghost-btn retry" @click="restartWatch">
          重新定位
        </button>
      </article>

      <article class="card box info">
        <p>开放时间：{{ PARK_INFO.hours }}</p>
        <p>咨询电话：{{ PARK_INFO.phone }}</p>
        <p>{{ PARK_INFO.note }}</p>
      </article>
    </section>
  </main>
</template>

<style scoped>
.hero {
  padding: calc(18px + var(--safe-top)) 20px 8px;
}
.eyebrow {
  margin: 0 0 4px;
  color: var(--primary);
  font-size: var(--fs-xs);
  font-weight: 800;
  letter-spacing: 0.08em;
}
.hero h1 {
  margin: 0;
  color: var(--primary);
  font-size: var(--fs-xl);
  font-weight: 800;
}
.pad {
  padding: 12px 16px 24px;
  display: grid;
  gap: 12px;
}
.box {
  padding: 16px;
}
.label {
  margin: 0 0 10px;
  font-size: var(--fs-md);
  font-weight: 800;
}
.fonts {
  display: flex;
  gap: 8px;
}
.font-chip {
  flex: 1;
  min-width: 0;
  min-height: 48px;
  padding: 6px 4px;
  border-radius: 14px;
  background: #e4f4e2;
  color: var(--primary);
  font-weight: 800;
  line-height: 1.2;
}
.font-chip.on {
  background: var(--primary);
  color: #fff;
}
.standard {
  font-size: 16px;
}
.large {
  font-size: 20px;
}
.xlarge {
  font-size: 24px;
}
.line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 52px;
  font-size: var(--fs-md);
  font-weight: 800;
}
.line span {
  min-width: 0;
  flex: 1;
}
.line select,
.switch {
  flex: none;
  max-width: 58%;
}
.line select {
  font-size: var(--fs-sm);
  font-weight: 700;
  min-height: 40px;
  border: 0;
  background: #e4f4e2;
  color: var(--primary);
  border-radius: 12px;
  padding: 0 10px;
}
.switch {
  min-width: 56px;
  min-height: 36px;
  border-radius: 999px;
  background: #d7e0d6;
  color: #4a5d4c;
  font-weight: 800;
}
.switch.on {
  background: var(--primary);
  color: #fff;
}
.vol {
  width: 100%;
  height: 36px;
  accent-color: var(--primary);
}
.extra {
  margin-top: 14px;
}
.check {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: var(--fs-sm);
  font-weight: 700;
  line-height: 1.4;
}
.check input {
  width: 22px;
  height: 22px;
  margin-top: 2px;
  accent-color: var(--primary);
}
.full {
  width: 100%;
  min-height: var(--tap);
  margin-top: 10px;
  font-size: var(--fs-sm);
  border: 0;
  background: #e4f4e2;
  border-radius: 12px;
  padding: 0 10px;
}
.gps {
  margin: 12px 0 0;
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--muted);
}
.retry {
  width: 100%;
  margin-top: 12px;
}
.info {
  font-size: var(--fs-sm);
  color: var(--muted);
}
.info p {
  margin: 0 0 8px;
}
.info p:last-child {
  margin: 0;
}
</style>
