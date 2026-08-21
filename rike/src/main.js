import { createApp } from 'vue'
import './styles/global.css'
import App from './App.vue'
import router from './router'
import { bootPractice } from './stores/practice'

bootPractice()

createApp(App).use(router).mount('#app')
