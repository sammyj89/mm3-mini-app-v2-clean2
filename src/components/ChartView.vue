<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Chart from 'chart.js/auto'
import { apiGet } from '../services/api'

const canvas = ref(null)
let chart = null
let interval = null
const timeRange = ref('7d')
const chartMode = ref('cumulative')   // 'cumulative' or 'daily'

const timeRanges = {
  '24h': 1,
  '7d': 7,
  '30d': 30
}

function groupByDay(trades) {
  const map = {}
  trades.forEach(t => {
    const day = new Date(t.ts * 1000).toLocaleDateString('en-US', { month:'numeric', day:'numeric' })
    map[day] = (map[day] || 0) + (t.pnl || 0)
  })
  const days = Object.keys(map).sort((a, b) => new Date(a) - new Date(b))
  return { labels: days, data: days.map(d => map[d]) }
}

async function loadChart() {
  const res = await apiGet('/api/trades_exchange')
  const trades = res.data || []
  const now = Date.now() / 1000
  const days = timeRanges[timeRange.value] || 7
  const cutoff = now - days * 86400

  const filtered = trades
  .filter(t => t.ts > cutoff)
  .sort((a, b) => (a.ts || 0) - (b.ts || 0))   // oldest first for left‑to‑right

  if (chart) chart.destroy()

  if (chartMode.value === 'daily') {
    const { labels, data } = groupByDay(filtered)
    chart = new Chart(canvas.value, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Daily P&L',
          data,
          backgroundColor: data.map(v => v >= 0 ? '#00ff88' : '#ff4757'),
          borderRadius: 4
        }]
      },
      options: {
        plugins: { legend: { display: false }, tooltip: { intersect: false } },
        scales: { y: { beginAtZero: true } }
      }
    })
  } else {
    // cumulative line chart (unchanged)
    const labels = []
    const data = []
    let cum = 0
    filtered.forEach(t => {
      cum += t.pnl || 0
      labels.push(new Date(t.ts * 1000).toLocaleDateString('en-US', { month:'numeric', day:'numeric' }))
      data.push(cum)
    })
    chart = new Chart(canvas.value, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Cum. P&L',
          data,
          borderColor: '#00d4ff',
          tension: 0.1,
          pointRadius: 1,
          borderWidth: 2
        }]
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const trade = filtered[ctx.dataIndex]
                return trade ? `${trade.symbol} ${trade.side} PnL: $${trade.pnl.toFixed(2)}` : ''
              }
            }
          }
        },
        scales: { y: { beginAtZero: true } }
      }
    })
  }
}

onMounted(() => {
  loadChart()
  interval = setInterval(loadChart, 30000)
})
onUnmounted(() => clearInterval(interval))
</script>

<template>
  <div class="card">
    <h3>📈 Performance Chart</h3>
    <div class="toggle-group">
      <button @click="chartMode='cumulative'; loadChart()"
              :class="['mode-btn', { active: chartMode === 'cumulative' }]">Cumulative</button>
      <button @click="chartMode='daily'; loadChart()"
              :class="['mode-btn', { active: chartMode === 'daily' }]">Daily</button>
    </div>
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
.toggle-group { display:flex; gap:8px; margin-bottom:8px; }
.mode-btn { flex:1; padding:6px; border:none; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer; background:#2a2a4a; color:#fff; }
.mode-btn.active { background:#00d4ff; color:#000; }
.range-buttons { display:flex; gap:8px; margin-bottom:10px; }
.range-btn { flex:1; padding:6px; border:none; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer; background:#2a2a4a; color:#fff; }
.range-btn.active { background:#00d4ff; color:#000; }
canvas { max-height:250px; }
</style>