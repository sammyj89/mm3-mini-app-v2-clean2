<script setup>
import { ref, watch } from 'vue'
import Chart from 'chart.js/auto'
import { apiGet } from '../services/api'

const props = defineProps({
  symbol: String,
  timeframe: { type: String, default: '15m' },
  limit: { type: Number, default: 24 }
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

    const isUp = data[data.length - 1] >= data[0]
    const colour = isUp ? '#00ff88' : '#ff4757'

    if (chart) chart.destroy()
    chart = new Chart(canvas.value, {
      type: 'line',
      data: {
        labels: data.map((_, i) => i),
        datasets: [{
          data,
          borderColor: colour,
          backgroundColor: (ctx) => {
            const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height)
            gradient.addColorStop(0, colour + '33')
            gradient.addColorStop(1, colour + '00')
            return gradient
          },
          fill: true,
          pointRadius: 0,
          borderWidth: 1.5,
          tension: 0.15
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
        elements: { point: { radius: 0 } },
        animation: false
      }
    })
  } catch (e) { /* ignore */ }
}

watch(() => props.symbol, () => loadChart(), { immediate: true })
</script>

<template>
  <div class="mini-chart">
    <canvas ref="canvas" width="80" height="36"></canvas>
  </div>
</template>

<style scoped>
.mini-chart {
  display: inline-block;
  width: 80px;
  height: 36px;
  overflow: hidden;
  background: #0a0a1a;
  border-radius: 4px;
}
</style>