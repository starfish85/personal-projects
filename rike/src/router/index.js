import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import Today from '../pages/Today.vue'
import Sheet from '../pages/Sheet.vue'
import Notes from '../pages/Notes.vue'
import Draw from '../pages/Draw.vue'
import Calendar from '../pages/Calendar.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/guitar', name: 'today', component: Today },
    { path: '/sheet', name: 'sheet', component: Sheet, meta: { keep: true } },
    { path: '/notes', name: 'notes', component: Notes },
    { path: '/draw', name: 'draw', component: Draw },
    { path: '/calendar', name: 'calendar', component: Calendar },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
