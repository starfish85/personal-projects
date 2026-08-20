import { createRouter, createWebHashHistory } from 'vue-router'
import { app } from '../stores/app'
import Welcome from '../pages/Welcome.vue'
import Home from '../pages/Home.vue'
import MapPage from '../pages/MapPage.vue'
import Nearby from '../pages/Nearby.vue'
import Detail from '../pages/Detail.vue'
import Navigate from '../pages/Navigate.vue'
import Mine from '../pages/Mine.vue'
import Help from '../pages/Help.vue'
import RoutePage from '../pages/RoutePage.vue'
import Fonts from '../pages/Fonts.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'welcome', component: Welcome, meta: { tab: false } },
    { path: '/fonts', name: 'fonts', component: Fonts, meta: { tab: false } },
    { path: '/home', name: 'home', component: Home },
    { path: '/map', name: 'map', component: MapPage },
    { path: '/nearby', name: 'nearby', component: Nearby },
    { path: '/poi/:id', name: 'detail', component: Detail },
    { path: '/navigate/:id', name: 'navigate', component: Navigate },
    { path: '/help', name: 'help', component: Help },
    { path: '/route/:id', name: 'route', component: RoutePage },
    { path: '/mine', name: 'mine', component: Mine },
    { path: '/:pathMatch(.*)*', redirect: '/home' },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  if (!app.onboarded && to.name !== 'welcome' && to.name !== 'fonts') {
    return { name: 'welcome' }
  }
  if (app.onboarded && to.name === 'welcome') {
    return { name: 'home' }
  }
  return true
})

export default router
