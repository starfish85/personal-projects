<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { audioUrl, bindPlayer, speak, stopVoice, unbindPlayer } from '../utils/voice'

const props = defineProps({
  clip: { type: String, required: true },
  text: { type: String, default: '' },
  label: { type: String, default: '播放语音讲解' },
})

const el = ref(null)
const playing = ref(false)
const current = ref(0)
const duration = ref(0)

const percent = computed(() => {
  if (!duration.value) return 0
  return Math.min(100, (current.value / duration.value) * 100)
})

function fmt(sec) {
  const total = Math.max(0, Math.floor(Number(sec) || 0))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function onMeta() {
  const d = el.value?.duration
  duration.value = Number.isFinite(d) ? d : 0
}
function onTime() {
  if (el.value) current.value = el.value.currentTime || 0
}
function onDone() {
  playing.value = false
  current.value = 0
}

onMounted(() => {
  bindPlayer(el.value)
  if (el.value) {
    el.value.addEventListener('loadedmetadata', onMeta)
    el.value.addEventListener('durationchange', onMeta)
    el.value.addEventListener('timeupdate', onTime)
    el.value.addEventListener('ended', onDone)
  }
})
onBeforeUnmount(() => {
  if (el.value) {
    el.value.removeEventListener('loadedmetadata', onMeta)
    el.value.removeEventListener('durationchange', onMeta)
    el.value.removeEventListener('timeupdate', onTime)
    el.value.removeEventListener('ended', onDone)
  }
  stopVoice()
  unbindPlayer(el.value)
})

function tap() {
  if (playing.value) {
    stopVoice()
    playing.value = false
    return
  }
  const ok = speak(props.text, {
    force: true,
    clip: props.clip,
    onEnd: onDone,
  })
  playing.value = ok
}
</script>

<template>
  <div class="vp">
    <button class="player" type="button" @click="tap">
      <span class="orb">{{ playing ? '■' : '▶' }}</span>
      <span class="meta">
        <strong>{{ playing ? '正在播放，点一下停止' : label }}</strong>
        <i class="track"><b :style="{ width: percent + '%' }" /></i>
        <em>{{ fmt(current) }} / {{ fmt(duration) }}</em>
      </span>
    </button>
    <audio ref="el" class="raw" :src="audioUrl(clip)" preload="auto" playsinline />
  </div>
</template>

<style scoped>
.vp {
  position: relative;
}
.player {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: 10px 12px;
  border-radius: 16px;
  background: #2c2c2e;
  color: #fff;
  text-align: left;
}
.orb {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #fff;
  color: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex: none;
}
.meta {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 6px;
}
.meta strong {
  font-size: var(--fs-sm);
  font-weight: 800;
}
.track {
  display: block;
  height: 6px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.28);
  overflow: hidden;
}
.track b {
  display: block;
  height: 100%;
  background: #fff;
  border-radius: 99px;
}
.meta em {
  font-style: normal;
  font-size: 12px;
  font-weight: 700;
  opacity: 0.8;
}
.raw {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
</style>
