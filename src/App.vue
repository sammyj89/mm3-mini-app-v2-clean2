<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import HomeView from './components/HomeView.vue'
import SlotCard from './components/SlotCard.vue'
import LadderVisual from './components/LadderVisual.vue'
import OrderList from './components/OrderList.vue'
import ScannerView from './components/ScannerView.vue'
import TradeHistory from './components/TradeHistory.vue'
import ChartView from './components/ChartView.vue'
import SettingsView from './components/SettingsView.vue'
import BottomControls from './components/BottomControls.vue'
import { apiGet } from './services/api'

const slots = ref({})
const selectedSymbol = ref('')
const currentTab = ref(localStorage.getItem('mm3_activeTab') || 'home')
watch(currentTab, (val) => localStorage.setItem('mm3_activeTab', val))
const slotSubTab = ref('cards')        // 'cards' | 'ladder' | 'orders'
const equity = ref(0)
const dailyPnl = ref(0)
const connectionOk = ref(false)
const theme = ref(localStorage.getItem('mm3_theme') || 'dark')

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  localStorage.setItem('mm3_theme', theme.value)
  document.documentElement.setAttribute('data-theme', theme.value)
}
onMounted(() => document.documentElement.setAttribute('data-theme', theme.value))

async function loadGlobals() {
  try {
    const res = await apiGet('/api/status_all')
    if (res.success && res.data) {
      slots.value = res.data
      const keys = Object.keys(res.data)
      if (keys.length && !selectedSymbol.value) selectedSymbol.value = keys[0]
      const firstKey = Object.keys(slots.value)[0]
      if (firstKey) equity.value = slots.value[firstKey].equity || 0
    }
  } catch (e) { console.error(e) }
  try {
    const tradesRes = await apiGet('/api/trades_exchange')
    if (tradesRes.success && tradesRes.data) {
      const oneDayAgo = Date.now() / 1000 - 86400
      const todayTrades = tradesRes.data.filter(t => t.ts > oneDayAgo)
      dailyPnl.value = todayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
    }
  } catch (e) { console.error(e) }
}
async function checkConnection() {
  try { const res = await apiGet('/api/health'); connectionOk.value = (res.status === 'ok') }
  catch { connectionOk.value = false }
}

let globalInterval = null
onMounted(() => { loadGlobals(); checkConnection(); globalInterval = setInterval(() => { loadGlobals(); checkConnection() }, 10000) })
onUnmounted(() => clearInterval(globalInterval))

const tabs = [
  { label: '🏠', key: 'home', name: 'Home' },
  { label: '📡', key: 'scanner', name: 'Scanner' },
  { label: '🎰', key: 'slots', name: 'Slots' },
  { label: '📈', key: 'chart', name: 'Chart' },
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
      <div v-show="currentTab === 'home'"><HomeView /></div>
      <div v-show="currentTab === 'scanner'"><ScannerView /></div>

      <!-- Slots tab with sub‑navigation -->
      <div v-show="currentTab === 'slots'" class="tab-content">
        <select v-model="selectedSymbol" class="symbol-select">
          <option v-for="(_, sym) in slots" :key="sym" :value="sym">{{ sym.split(':')[0] }}</option>
        </select>
        <div class="sub-tabs">
          <button @click="slotSubTab='cards'"  :class="{ active: slotSubTab==='cards' }">Cards</button>
          <button @click="slotSubTab='ladder'" :class="{ active: slotSubTab==='ladder' }">Depth</button>
          <button @click="slotSubTab='orders'" :class="{ active: slotSubTab==='orders' }">Orders</button>
        </div>
        <div v-if="slotSubTab==='cards'">
          <SlotCard v-for="(data, sym) in slots" :key="sym" :symbol="sym" :initial-data="data" />
        </div>
        <LadderVisual v-if="slotSubTab==='ladder'" :symbol="selectedSymbol" />
        <OrderList v-if="slotSubTab==='orders'" :symbol="selectedSymbol" />
      </div>

      <div v-show="currentTab === 'chart'"><ChartView /></div>
      <div v-show="currentTab === 'trades'"><TradeHistory /></div>
      <div v-show="currentTab === 'settings'"><SettingsView :symbols="slots" /></div>
    </main>

    <nav class="bottom-bar">
      <button v-for="tab in tabs" :key="tab.key"
              @click="currentTab = tab.key"
              :class="{ active: currentTab === tab.key }"
              :title="tab.name">{{ tab.label }}</button>
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
.symbol-select { width:100%; padding:8px; background:var(--card); color:var(--text); border:none; border-radius:8px; margin-bottom:12px; }
.sub-tabs { display:flex; gap:8px; margin-bottom:12px; }
.sub-tabs button { flex:1; padding:8px; border:none; border-radius:6px; background:var(--card); color:var(--text); cursor:pointer; font-weight:600; font-size:12px; }
.sub-tabs button.active { background:var(--accent); color:#000; }
</style>