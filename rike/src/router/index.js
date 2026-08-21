import { createRouter, createWebHashHistory } from 'vue-router'
import Today from '../pages/Today.vue'
import Sheet from '../pages/Sheet.vue'
import Notes from '../pages/Notes.vue'
import Calendar from '../pages/Calendar.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'today', component: Today },
    { path: '/sheet', name: 'sheet', component: Sheet, meta: { keep: true } },
    { path: '/notes', name: 'notes', component: Notes },
    { path: '/calendar', name: 'calendar', component: Calendar },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
