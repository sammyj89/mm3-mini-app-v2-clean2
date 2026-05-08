<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Chart from 'chart.js/auto'
import { apiGet } from '../services/api'

const canvas = ref(null)
let chart = null
let interval = null
const timeRange = ref('7d')

const timeRanges = {
  '24h': 1,
  '7d': 7,
  '30d': 30
}

const filteredTrades = ref([]) // store for tooltip

async function loadChart() {
  const res = await apiGet('/api/trades_exchange')
  const trades = res.data || []
  const now = Date.now() / 1000
  const days = timeRanges[timeRange.value] || 7
  const cutoff = now - days * 86400

  const filtered = trades.filter(t => t.ts > cutoff).reverse()
  filteredTrades.value = filtered

  const labels = []; const data = []; let cum = 0
  filtered.forEach(t => {
    cum += t.pnl || 0
    labels.push(new Date(t.ts * 1000).toLocaleDateString('en-US', { month:'numeric', day:'numeric' }))
    data.push(cum)
  })
  if (chart) chart.destroy()
  chart = new Chart(canvas.value, {
    type: 'line',
    data: { labels, datasets: [{ label:'Cum. P&L', data, borderColor:'#00d4ff', tension:0.1, pointRadius:1, borderWidth:2 }] },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const trade = filteredTrades.value[ctx.dataIndex]
              return trade ? `${trade.symbol} ${trade.side} PnL: $${trade.pnl.toFixed(2)}` : ''
            }
          }
        }
      },
      scales: { y: { beginAtZero: true } }
    }
  })
}

onMounted(() => {
  loadChart()
  interval = setInterval(loadChart, 30000)
})
onUnmounted(() => clearInterval(interval))
</script>

<template>
  <div class="card">
    <h3>📈 Cumulative P&L</h3>
    <div class="range-buttons">
      <button v-for="(label, key) in { '24h': '24H', '7d': '7D', '30d': '30D' }"
              :key="key"
              @click="timeRange = key; loadChart()"
              :class="['range-btn', { active: timeRange === key }]">{{ label }}</button>
    </div>
    <canvas ref="canvas"></canvas>
  </div>
</template>

<style scoped>
.card { background:#16213e; border-radius:12px; padding:16px; margin-bottom:12px; box-shadow:0 2px 8px rgba(0,0,0,0.3); }
h3 { color:#00d4ff; font-size:14px; margin-bottom:10px; text-transform:uppercase; }
.range-buttons { display:flex; gap:8px; margin-bottom:10px; }
.range-btn { flex:1; padding:6px; border:none; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer; background:#2a2a4a; color:#fff; }
.range-btn.active { background:#00d4ff; color:#000; }
canvas { max-height:250px; }
</style>