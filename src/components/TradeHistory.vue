<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { apiGet } from '../services/api'

const trades = ref([])
let interval = null

async function loadTrades() {
  const res = await apiGet('/api/trades_exchange')
  trades.value = (res.data || []).slice(0, 20)
}

onMounted(() => {
  loadTrades()
  interval = setInterval(loadTrades, 10000)
})
onUnmounted(() => clearInterval(interval))
</script>

<template>
  <div class="card">
    <h3>📋 Recent Trades</h3>
    <table>
      <thead><tr><th>Symbol</th><th>Side</th><th>P&L</th><th>Reason</th></tr></thead>
      <tbody>
        <tr v-for="t in trades" :key="t.ts">
          <td>{{ t.symbol }}</td>
          <td>{{ t.side }}</td>
          <td :class="t.pnl >= 0 ? 'green' : 'red'">{{ t.pnl.toFixed(4) }}</td>
          <td>{{ t.exit_reason }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.card { background:#16213e; border-radius:10px; padding:14px; margin-bottom:10px; }
h3 { color:#00d4ff; font-size:13px; margin-bottom:10px; }
table { width:100%; border-collapse:collapse; font-size:12px; }
th { color:#8888aa; text-align:left; padding:4px; border-bottom:1px solid #2a2a4a; }
td { padding:4px; }
.green { color:#00ff88; }
.red { color:#ff4757; }
</style>