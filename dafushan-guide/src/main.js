import { createApp } from 'vue'
import 'leaflet/dist/leaflet.css'
import './styles/global.css'
import App from './App.vue'
import router from './router'
import { restoreSettings } from './stores/app'

restoreSettings()

createApp(App).use(router).mount('#app')
