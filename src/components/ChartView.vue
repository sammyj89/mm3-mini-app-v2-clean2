<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Chart from 'chart.js/auto'
import { apiGet } from '../services/api'

const canvas = ref(null)
let chart = null
let interval = null
const timeRange = ref('7d')
const chartMode = ref('cumulative')

const timeRanges = { '24h': 1, '7d': 7, '30d': 30 }

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
  const res = await apiGet('/api/trades?days=30')
  const trades = res.data || []
  const now = Date.now() / 1000
  const days = timeRanges[timeRange.value] || 7
  const cutoff = now - days * 86400
  const filtered = trades.filter(t => t.ts > cutoff).sort((a, b) => (a.ts || 0) - (b.ts || 0))

  if (chart) chart.destroy()

  const accent = '#58a6ff'
  const success = '#3fb950'
  const danger = '#f85149'

  if (chartMode.value === 'daily') {
    const { labels, data } = groupByDay(filtered)
    chart = new Chart(canvas.value, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Daily P&L',
          data,
          backgroundColor: data.map(v => v >= 0 ? success : danger),
          borderRadius: 4
        }]
      },
      options: {
        plugins: { legend: { display: false }, tooltip: { intersect: false } },
        scales: { y: { beginAtZero: true, grid: { color: 'rgba(128,128,128,0.18)' } }, x: { grid: { display: false } } }
      }
    })
  } else {
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
          borderColor: accent,
          tension: 0.3,
          pointRadius: 0,
          borderWidth: 2,
          fill: true,
          backgroundColor: 'rgba(88,166,255,0.15)'
        }]
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => {
            const trade = filtered[ctx.dataIndex]
            return trade ? `${trade.symbol} ${trade.side} PnL: $${trade.pnl.toFixed(2)}` : ''
          } } }
        },
        scales: { y: { beginAtZero: true, grid: { color: 'rgba(128,128,128,0.18)' } }, x: { grid: { display: false } } }
      }
    })
  }
}

onMounted(() => { loadChart(); interval = setInterval(loadChart, 30000) })
onUnmounted(() => clearInterval(interval))
</script>

<template>
  <div class="card">
    <div class="card-header">
      <h2 class="card-title">📈 Chart</h2>
    </div>
    <div class="segmented-control mb-3">
      <button v-for="label in ['cumulative','daily']" :key="label"
        @click="chartMode = label; loadChart()"
        :class="['segment-btn', { 'segment-btn--active': chartMode === label }]">
        {{ label === 'cumulative' ? 'Cumulative' : 'Daily' }}
      </button>
    </div>
    <div class="segmented-control mb-3">
      <button v-for="(label, key) in { '24h': '24H', '7d': '7D', '30d': '30D' }" :key="key"
        @click="timeRange = key; loadChart()"
        :class="['segment-btn', { 'segment-btn--active': timeRange === key }]">
        {{ label }}
      </button>
    </div>
    <div class="chart-canvas-wrap">
      <canvas ref="canvas"></canvas>
    </div>
  </div>
</template>

<style scoped>
.segmented-control { display: flex; gap: var(--space-1); background: var(--bg-elevated); padding: 3px; border-radius: var(--radius-sm); }
.segment-btn {
  flex: 1;
  padding: var(--space-1) var(--space-2);
  border: none;
  border-radius: 4px;
  font-size: var(--text-xs);
  font-weight: 700;
  cursor: pointer;
  background: transparent;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}
.segment-btn--active { background: var(--accent); color: #000; }
.chart-canvas-wrap { height: 250px; position: relative; }
</style>
