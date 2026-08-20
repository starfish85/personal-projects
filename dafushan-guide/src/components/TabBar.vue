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
.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: #6b8170;
  font-size: var(--fs-xs);
  font-weight: 700;
}
.tab.on {
  color: var(--primary);
}
.tab.help {
  color: #b42318;
}
.tab.help.on {
  color: #8b1a12;
}
.ico {
  font-size: 22px;
  line-height: 1;
}
</style>
