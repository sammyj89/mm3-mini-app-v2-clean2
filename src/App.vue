<script setup>
import { ref, onMounted } from 'vue'
import SlotCard from './components/SlotCard.vue'
import LadderControl from './components/LadderControl.vue'
import ScannerModal from './components/ScannerModal.vue'
import TrailSettings from './components/TrailSettings.vue'
import RiskPanel from './components/RiskPanel.vue'
import TradeHistory from './components/TradeHistory.vue'
import ChartView from './components/ChartView.vue'
import ReleaseConfirm from './components/ReleaseConfirm.vue'
import BottomControls from './components/BottomControls.vue'
import { apiGet } from './services/api'

const slots = ref({})
const selectedSymbol = ref('')
const currentTab = ref('slots')

async function loadSlots() {
  const res = await apiGet('/api/status_all')
  if (res.success) {
    slots.value = res.data
    const keys = Object.keys(res.data)
    if (keys.length && !selectedSymbol.value) selectedSymbol.value = keys[0]
  }
}

onMounted(loadSlots)
</script>

<template>
  <div class="app">
    <header class="header"><h1>📊 MM3 Terminal</h1></header>

    <ScannerModal @slot-changed="loadSlots" />

    <nav class="tab-bar">
      <button @click="currentTab='slots'" :class="{ active: currentTab==='slots' }">🎰 Slots</button>
      <button @click="currentTab='ladder'" :class="{ active: currentTab==='ladder' }">🪜 Ladder</button>
      <button @click="currentTab='trail'" :class="{ active: currentTab==='trail' }">🛡️ Trail</button>
      <button @click="currentTab='risk'" :class="{ active: currentTab==='risk' }">⚠️ Risk</button>
      <button @click="currentTab='trades'" :class="{ active: currentTab==='trades' }">📋 Trades</button>
      <button @click="currentTab='chart'" :class="{ active: currentTab==='chart' }">📈 Chart</button>
    </nav>

    <main>
      <div v-if="currentTab === 'slots'" class="tab-content">
        <SlotCard v-for="(data, sym) in slots" :key="sym" :symbol="sym" :initial-data="data" />
      </div>

      <div v-if="currentTab === 'ladder'" class="tab-content">
        <select v-model="selectedSymbol" class="symbol-select">
          <option v-for="(_, sym) in slots" :key="sym" :value="sym">{{ sym.split(':')[0] }}</option>
        </select>
        <LadderControl :symbol="selectedSymbol" />
      </div>

      <div v-if="currentTab === 'trail'" class="tab-content">
        <select v-model="selectedSymbol" class="symbol-select">
          <option v-for="(_, sym) in slots" :key="sym" :value="sym">{{ sym.split(':')[0] }}</option>
        </select>
        <TrailSettings :symbol="selectedSymbol" />
      </div>

      <div v-if="currentTab === 'risk'" class="tab-content">
        <select v-model="selectedSymbol" class="symbol-select">
          <option v-for="(_, sym) in slots" :key="sym" :value="sym">{{ sym.split(':')[0] }}</option>
        </select>
        <RiskPanel :symbol="selectedSymbol" />
      </div>

      <div v-if="currentTab === 'trades'" class="tab-content">
        <TradeHistory />
      </div>

      <div v-if="currentTab === 'chart'" class="tab-content">
        <ChartView />
      </div>
    </main>

    <BottomControls />
  </div>
</template>

<style>
:root { --bg: #1a1a2e; --card: #16213e; }
body { margin:0; font-family:system-ui; background:var(--bg); color:#e0e0e0; }
.app { max-width:600px; margin:0 auto; min-height:100vh; display:flex; flex-direction:column; }
.header { text-align:center; padding:12px; }
.header h1 { color:#00d4ff; font-size:20px; }
.tab-bar { display:flex; overflow-x:auto; border-bottom:1px solid #2a2a4a; }
.tab-bar button { flex:1; padding:12px 8px; background:transparent; border:none; color:#8888aa; font-size:12px; cursor:pointer; white-space:nowrap; }
.tab-bar button.active { color:#00d4ff; border-bottom:2px solid #00d4ff; }
main { flex:1; padding:12px; overflow-y:auto; }
.symbol-select { width:100%; padding:8px; background:var(--card); color:#e0e0e0; border:none; border-radius:8px; margin-bottom:12px; }
</style>
