<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { FONT_OPTIONS, app, finishOnboarding, setFontSize } from '../stores/app'
import { useGeolocation } from '../composables/useGeolocation'
import { unlockVoice } from '../utils/voice'

const router = useRouter()
const base = import.meta.env.BASE_URL
const { startWatch } = useGeolocation()
const picked = ref(app.fontSize || 'standard')

function start() {
  setFontSize(picked.value)
  unlockVoice()
  finishOnboarding()
  startWatch()
  router.replace({ name: 'home' })
}
</script>

<template>
  <main class="page no-tab welcome">
    <div class="card photo">
      <img class="hero" :src="`${base}images/welcome-hero.jpg?v=3`" alt="爱在大夫山" />
    </div>
    <p class="eyebrow">广州 · 番禺</p>
    <h1>大夫山森林公园<br />欢迎您</h1>
    <article class="card box">
      <p class="ask">请选择适合您的显示方式</p>
      <div class="choices" role="radiogroup" aria-label="字体大小">
        <label v-for="item in FONT_OPTIONS" :key="item.id" class="choice" :class="{ on: picked === item.id }">
          <input v-model="picked" type="radio" name="font" :value="item.id" />
          <span :class="item.id">{{ item.label }}</span>
        </label>
      </div>
    </article>
    <button class="primary-btn start" @click="start">开始使用</button>
  </main>
</template>

<style scoped>
.welcome {
  padding: calc(var(--safe-top) + 16px) 16px 32px;
  text-align: center;
}
.photo {
  overflow: hidden;
  margin-bottom: 20px;
}
.hero {
  width: 100%;
  height: 200px;
  object-fit: cover;
  object-position: center 62%;
}
.eyebrow {
  margin: 0 0 6px;
  color: var(--primary);
  font-size: var(--fs-xs);
  font-weight: 800;
  letter-spacing: 0.08em;
}
h1 {
  margin: 0 0 20px;
  font-size: var(--fs-hero);
  font-weight: 800;
  color: var(--primary);
  line-height: 1.25;
}
.box {
  padding: 18px 16px 12px;
  margin-bottom: 22px;
  text-align: left;
}
.ask {
  margin: 0 0 12px;
  font-size: var(--fs-md);
  font-weight: 800;
  text-align: center;
}
.choices {
  display: grid;
  gap: 8px;
}
.choice {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: var(--tap);
  padding: 0 12px;
  border-radius: 14px;
  font-weight: 700;
}
.choice.on {
  background: #e4f4e2;
}
.choice input {
  width: 22px;
  height: 22px;
  accent-color: var(--primary);
}
.standard {
  font-size: 20px;
}
.large {
  font-size: 26px;
}
.xlarge {
  font-size: 32px;
}
.start {
  max-width: 280px;
  margin: 0 auto;
}
</style>
