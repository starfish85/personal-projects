<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const active = computed(() => {
  if (route.name === 'mine') return 'mine'
  if (route.name === 'help') return 'help'
  return 'home'
})

function go(name) {
  router.push({ name })
}
</script>

<template>
  <nav class="tabbar" aria-label="底部导航">
    <button class="tab" :class="{ on: active === 'home' }" @click="go('home')">
      <span class="ico">⌂</span>
      <span>首页</span>
    </button>
    <button class="tab help" :class="{ on: active === 'help' }" @click="go('help')">
      <span class="ico">!</span>
      <span>求助</span>
    </button>
    <button class="tab" :class="{ on: active === 'mine' }" @click="go('mine')">
      <span class="ico">◎</span>
      <span>我的</span>
    </button>
  </nav>
</template>

<style scoped>
.tabbar {
  position: relative;
  flex: none;
  width: 100%;
  height: var(--tab-h);
  padding-bottom: var(--safe-bottom);
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  background: #fff;
  border-top: 1px solid #d7e6d4;
  box-shadow: 0 -8px 24px rgba(20, 51, 28, 0.06);
  z-index: 20;
}
/* 适老 Tab：文字≥16px 加粗，选中项变色+加粗双重提示（不只靠颜色） */
.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: #44564a;
  font-size: var(--fs-sm);
  font-weight: 700;
}
.tab.on {
  color: var(--primary);
  font-weight: 800;
}
.tab.on .ico {
  transform: scale(1.15);
}
.tab.help {
  color: #b42318;
}
.tab.help.on {
  color: #8b1a12;
}
.ico {
  font-size: 24px;
  line-height: 1;
}
</style>
