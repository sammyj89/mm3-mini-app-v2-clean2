import { createApp } from 'vue'
import App from './App.vue'
import './tma'   // ← our safe initialisation (no top-level SDK call)

const app = createApp(App)
app.mount('#app')