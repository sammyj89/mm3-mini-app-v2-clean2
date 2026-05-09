<script setup>
import { ref, onMounted, watch } from 'vue'
import Chart from 'chart.js/auto'
import { apiGet } from '../services/api'

const props = defineProps({
  symbol: String,
  timeframe: { type: String, default: '5m' },
  limit: { type: Number, default: 12 }
})

const canvas = ref(null)
let chart = null

async function loadChart() {
  if (!props.symbol) return
  try {
    const res = await apiGet('/api/price_history', {
      symbol: props.symbol,
      timeframe: props.timeframe,
      limit: props.limit
    })
    if (!res.success || !Array.isArray(res.data)) return
    const data = res.data
    // Normalise to percentage change from first price
    const base = data[0]
    const pctData = data.map(p => ((p - base) / base) * 100)
    const labels = pctData.map((_, i) => i)
    const isUp = pctData[pctData.length - 1] >= 0

    if (chart) chart.destroy()
    chart = new Chart(canvas.value, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: pctData,
          borderColor: isUp ? '#00ff88' : '#ff4757',
          backgroundColor: 'transparent',
          pointRadius: 0,
          borderWidth: 1.5,
          tension: 0.1
        }]
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false },
          y: { display: false }
        },
        animation: false
      }
    })
  } catch (e) { /* ignore */ }
}

watch(() => props.symbol, () => loadChart(), { immediate: true })
</script>

<template>
  <div class="mini-chart">
    <canvas ref="canvas" width="80" height="30"></canvas>
  </div>
</template>

<style scoped>
.mini-chart {
  display: inline-block;
  width: 80px;
  height: 30px;
}
</style>