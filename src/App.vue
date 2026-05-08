<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import HomeView from './components/HomeView.vue'
import SlotCard from './components/SlotCard.vue'
import ScannerView from './components/ScannerView.vue'
import TradeHistory from './components/TradeHistory.vue'
import ChartView from './components/ChartView.vue'
import SettingsView from './components/SettingsView.vue'
import BottomControls from './components/BottomControls.vue'
import { apiGet } from './services/api'

const slots = ref({})
const selectedSymbol = ref('')
const currentTab = ref('home')
const equity = ref(0)
const dailyPnl = ref(0)
const connectionOk = ref(false)

// Dark/light theme
const theme = ref('dark')
function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', theme.value)
}

async function loadGlobals() {
  try {
    const res = await apiGet('/api/status_all')
    if (res.success && res.data) {
      slots.value = res.data
      const keys = Object.keys(res.data)
      if (keys.length && !selectedSymbol.value) selectedSymbol.value = keys[0]
      const firstKey = Object.keys(slots.value)[0]
      if (firstKey) {
        equity.value = slots.value[firstKey].equity || 0
        dailyPnl.value = slots.value[firstKey].daily_pnl || 0
      }
    }
  } catch (e) { console.error(e) }
}
async function checkConnection() {
  try {
    const res = await apiGet('/api/health')
    connectionOk.value = (res.status === 'ok')
  } catch (e) { connectionOk.value = false }
}

let globalInterval = null
onMounted(() => {
  loadGlobals()
  checkConnection()
  globalInterval = setInterval(() => {
    loadGlobals()
    checkConnection()
  }, 10000)
})
onUnmounted(() => clearInterval(globalInterval))

const tabs = [
  { label: '🏠', key: 'home', name: 'Home' },
  { label: '📡', key: 'scanner', name: 'Scanner' },
  { label: '🎰', key: 'slots', name: 'Slots' },
  { label: '📋', key: 'trades', name: 'Trades' },
  { label: '⚙️', key: 'settings', name: 'Settings' }
]
</script>

<template>
  <div class="app" :class="theme">
    <header class="header">
      <div class="title-row">
        <h1>📊 MM3 Terminal</h1>
        <span :class="['status-dot', connectionOk ? 'green' : 'red']" :title="connectionOk ? 'Connected' : 'Offline'"></span>
      </div>
      <div class="equity-bar">
        <span>Equity ${{ Number(equity).toFixed(2) }}</span>
        <span :class="dailyPnl >= 0 ? 'green' : 'red'">
          {{ dailyPnl >= 0 ? '+' : '' }}${{ Number(dailyPnl).toFixed(2) }}
        </span>
        <button class="theme-toggle" @click="toggleTheme">{{ theme === 'dark' ? '☀️' : '🌙' }}</button>
      </div>
    </header>

    <main>
      <!-- Keep all tabs alive, show active -->
      <div v-show="currentTab === 'home'"><HomeView /></div>
      <div v-show="currentTab === 'scanner'"><ScannerView /></div>
      <div v-show="currentTab === 'slots'" class="tab-content">
        <SlotCard v-for="(data, sym) in slots" :key="sym" :symbol="sym" :initial-data="data" />
      </div>
      <div v-show="currentTab === 'trades'"><TradeHistory /></div>
      <div v-show="currentTab === 'settings'"><SettingsView :symbols="slots" /></div>
    </main>

    <nav class="bottom-bar">
      <button v-for="tab in tabs" :key="tab.key"
              @click="currentTab = tab.key"
              :class="{ active: currentTab === tab.key }"
              :title="tab.name">
        {{ tab.label }}
      </button>
    </nav>

    <BottomControls />
  </div>
</template>

<style>
:root {
  --bg: #1a1a2e; --card: #16213e; --text: #e0e0e0; --accent: #00d4ff;
  --header-bg: #0f0f23; --border: #2a2a4a;
}
[data-theme="light"] {
  --bg: #f0f2f5; --card: #ffffff; --text: #1a1a2e; --accent: #0077cc;
  --header-bg: #e4e6eb; --border: #ccd0d5;
}
body { margin:0; font-family:system-ui; background:var(--bg); color:var(--text); }
.app { max-width:600px; margin:0 auto; min-height:100vh; display:flex; flex-direction:column; }
.header { background:var(--header-bg); padding:12px 16px; border-bottom:1px solid var(--border); }
.title-row { display:flex; justify-content:space-between; align-items:center; }
h1 { color:var(--accent); font-size:20px; margin:0; }
.status-dot { width:10px; height:10px; border-radius:50%; display:inline-block; }
.status-dot.green { background:#00ff88; }
.status-dot.red { background:#ff4757; }
.equity-bar { display:flex; justify-content:space-between; align-items:center; margin-top:6px; font-size:14px; font-family:monospace; }
.green { color:#00ff88; }
.red { color:#ff4757; }
.theme-toggle { background:none; border:none; font-size:16px; cursor:pointer; }
main { flex:1; padding:12px; overflow-y:auto; }
.bottom-bar {
  display:flex; justify-content:space-around; background:var(--header-bg);
  border-top:1px solid var(--border); padding:6px 0;
}
.bottom-bar button {
  flex:1; background:transparent; border:none; font-size:20px; color:var(--text);
  cursor:pointer; opacity:0.6; transition:0.2s;
}
.bottom-bar button.active { opacity:1; color:var(--accent); }
</style>