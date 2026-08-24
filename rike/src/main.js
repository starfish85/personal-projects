import { createApp } from 'vue'
import './styles/global.css'
import App from './App.vue'
import router from './router'
import { bootPractice } from './stores/practice'
import { bootSync } from './stores/sync'

bootPractice().then(() => bootSync())

createApp(App).use(router).mount('#app')
