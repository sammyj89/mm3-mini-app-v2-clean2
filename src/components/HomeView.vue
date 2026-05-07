<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { apiGet } from '../services/api'

const equity = ref(0)
const dailyPnl = ref(0)
const positions = ref([])
const loading = ref(true)

async function loadSummary() {
  try {
    const res = await apiGet('/api/status_all')
    if (res.success && res.data) {
      const slots = res.data
      // equity and daily pnl are global - grab from the first slot
      const firstKey = Object.keys(slots)[0]
      if (firstKey) {
        equity.value = slots[firstKey].equity || 0
        dailyPnl.value = slots[firstKey].daily_pnl || 0
      }
      // build positions list
      positions.value = Object.entries(slots).map(([sym, data]) => {
        const live = data.live || {}
        const side = live.side || 'flat'
        const qty = Math.abs(live.net_qty || 0)
        const mid = live.mid || 0
        const avg = live.avg_entry || 0
        let pnl = 0
        if (qty > 0 && avg > 0 && mid > 0) {
          pnl = side === 'short' ? (avg - mid) * qty : (mid - avg) * qty
        }
        return { symbol: sym.split(':')[0], side, qty, pnl }
      })
    }
  } catch (e) {
    console.error(e)
  }
  loading.value = false
}

let interval = null
onMounted(() => {
  loadSummary()
  interval = setInterval(loadSummary, 10_000) // refresh every 10s
})
onUnmounted(() => clearInterval(interval))
</script>

<template>
  <div class="home-tab">
    <div class="card summary-card">
      <h3>💰 Account Summary</h3>
      <div class="summary-metrics">
        <div class="metric">
          <span class="label">Equity</span>
          <span class="value">${{ Number(equity).toFixed(2) }}</span>
        </div>
        <div class="metric">
          <span class="label">Today's P&L</span>
          <span class="value" :class="dailyPnl >= 0 ? 'green' : 'red'">
            {{ dailyPnl >= 0 ? '+' : '' }}${{ Number(dailyPnl).toFixed(2) }}
          </span>
        </div>
      </div>
    </div>

    <div class="card positions-card">
      <h3>📌 Open Positions</h3>
      <div v-if="loading">Loading…</div>
      <div v-else-if="positions.length === 0">No open positions.</div>
      <div v-for="pos in positions" :key="pos.symbol" class="position-row">
        <span class="symbol">{{ pos.symbol }}</span>
        <span class="side" :class="pos.side === 'short' ? 'red' : 'green'">
          {{ pos.side }}
        </span>
        <span class="qty">{{ pos.qty.toFixed(4) }}</span>
        <span class="pnl" :class="pos.pnl >= 0 ? 'green' : 'red'">
          ${{ pos.pnl.toFixed(2) }}
        </span>
      </div>
    </div>

    <div class="card">
      <h3>📅 Today's Summary</h3>
      <p v-if="dailyPnl >= 0">✅ You're up today. Keep it going!</p>
      <p v-else>⚠️ Currently in the red. Review your positions.</p>
    </div>
  </div>
</template>

<style scoped>
.home-tab {
  padding: 12px;
}
.card {
  background: #16213e;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 12px;
}
h3 {
  color: #00d4ff;
  font-size: 14px;
  margin-bottom: 10px;
  text-transform: uppercase;
}
.summary-metrics {
  display: flex;
  gap: 20px;
}
.metric {
  display: flex;
  flex-direction: column;
}
.label {
  font-size: 10px;
  color: #8888aa;
  text-transform: uppercase;
}
.value {
  font-size: 20px;
  font-weight: bold;
  font-family: monospace;
}
.green { color: #00ff88; }
.red   { color: #ff4757; }
.position-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #2a2a4a;
  font-size: 13px;
}
.symbol { font-weight: bold; min-width: 80px; }
.side   { text-transform: uppercase; min-width: 50px; }
.qty    { font-family: monospace; margin-left: auto; margin-right: 10px; }
.pnl    { font-family: monospace; }
</style>