import { createApp } from 'vue'
import './styles/global.css'
import App from './App.vue'
import router from './router'
import { captureAuthHash } from './cloud/client'
import { bootPractice } from './stores/practice'
import { bootSync } from './stores/sync'

captureAuthHash()
bootPractice().then(() => bootSync())
createApp(App).use(router).mount('#app')
