import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import Task from '../pages/Task.vue'
import Sheet from '../pages/Sheet.vue'
import Notes from '../pages/Notes.vue'
import Calendar from '../pages/Calendar.vue'
import Journal from '../pages/Journal.vue'
import Gallery from '../pages/Gallery.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: Home, meta: { tab: true } },
    { path: '/task/:id', name: 'task', component: Task },
    { path: '/guitar', redirect: '/task/guitar' },
    { path: '/draw', redirect: '/task/drawing' },
    { path: '/sheet', name: 'sheet', component: Sheet, meta: { keep: true } },
    { path: '/notes', name: 'notes', component: Notes },
    { path: '/calendar', name: 'calendar', component: Calendar, meta: { tab: true, keep: true } },
    { path: '/gallery/:taskId?', name: 'gallery', component: Gallery, meta: { tab: true } },
    { path: '/journal/:date?', name: 'journal', component: Journal, meta: { tab: true, keep: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
