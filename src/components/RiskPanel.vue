<script setup>
import { ref, watch } from 'vue'
import { apiGet } from '../services/api'

const props = defineProps({ symbol: String })
const risk = ref({})

async function loadRisk() {
  if (!props.symbol) return
  const res = await apiGet('/api/status', { symbol: props.symbol })
  if (res.success) risk.value = res.data.risk || {}
}

watch(() => props.symbol, loadRisk, { immediate: true })
</script>

<template>
  <div class="card">
    <h3>⚠️ Risk Metrics</h3>
    <div v-if="symbol">
      <div class="metrics">
        <div><span class="label">Exposure</span><span class="value">${{ (risk.exposure_usd || 0).toFixed(2) }}</span></div>
        <div><span class="label">Equity</span><span class="value">${{ (risk.equity || 0).toFixed(2) }}</span></div>
        <div><span class="label">Utilization</span><span class="value">{{ (risk.utilization || 0).toFixed(3) }}</span></div>
        <div class="red"><span class="label">Max DD</span><span class="value">{{ risk.max_drawdown_pct || 0 }}%</span></div>
      </div>
    </div>
    <p v-else>Select a slot</p>
  </div>
</template>

<style scoped>
.card { background:#16213e; border-radius:10px; padding:14px; margin-bottom:10px; }
h3 { color:#00d4ff; font-size:13px; margin-bottom:10px; }
.metrics { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.label { font-size:10px; color:#8888aa; text-transform:uppercase; }
.value { font-size:16px; font-weight:bold; font-family:monospace; }
.red .value { color:#ff4757; }
</style>