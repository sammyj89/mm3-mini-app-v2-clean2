<script setup>
import { ref, onMounted } from 'vue'
import Chart from 'chart.js/auto'
import { apiGet } from '../services/api'

const canvas = ref(null)
let chart = null

async function loadChart() {
  const res = await apiGet('/api/trades_exchange')
  const trades = res.data || []
  const labels = []; const data = []; let cum = 0
  ;[...trades].reverse().forEach(t => {
    cum += t.pnl || 0
    labels.push(new Date(t.ts * 1000).toLocaleDateString('en-US', { month:'short', day:'numeric' }))
    data.push(cum)
  })
  if (chart) chart.destroy()
  chart = new Chart(canvas.value, {
    type: 'line',
    data: { labels, datasets: [{ label:'Cum. P&L', data, borderColor:'#00d4ff', tension:0.1 }] },
    options: { scales: { y: { beginAtZero: true } } }
  })
}

onMounted(loadChart)
</script>

<template>
  <div class="card">
    <h3>📈 Cumulative P&L</h3>
    <canvas ref="canvas"></canvas>
  </div>
</template>

<style scoped>
.card { background:#16213e; border-radius:10px; padding:14px; margin-bottom:10px; }
h3 { color:#00d4ff; font-size:13px; margin-bottom:10px; }
canvas { max-height:250px; }
</style>