<script setup>
import { ref, watch } from 'vue'
import { apiGet, apiPost } from '../services/api'
import { postEvent } from '../tma'

const props = defineProps({ symbol: String })

const hwmEnabled = ref(true)
const pnlEnabled = ref(true)
const startR = ref(0.8)
const startUsd = ref(1.0)
const loading = ref(false)

async function loadSettings() {
  if (!props.symbol) return
  const [hwmRes, pnlRes, rRes, usdRes] = await Promise.all([
    apiGet('/api/config', { key: 'HWM_PROTECT_ENABLED' }),
    apiGet('/api/config', { key: 'PNL_TRAIL_ENABLED' }),
    apiGet('/api/config', { key: 'HWM_START_R' }),
    apiGet('/api/config', { key: 'PNL_START_USD' })
  ])
  hwmEnabled.value = hwmRes.value === 'true'
  pnlEnabled.value = pnlRes.value === 'true'
  startR.value = parseFloat(rRes.value) || 0.8
  startUsd.value = parseFloat(usdRes.value) || 1.0
}

watch(() => props.symbol, () => {
  if (props.symbol) loadSettings()
}, { immediate: true })

async function toggleTrail(key) {
  loading.value = true
  const res = await apiGet('/api/config', { key })
  const current = res.value === 'true'
  await apiPost('/api/config', { key, value: current ? 'false' : 'true' })
  if (key === 'HWM_PROTECT_ENABLED') hwmEnabled.value = !current
  if (key === 'PNL_TRAIL_ENABLED') pnlEnabled.value = !current
  loading.value = false
  postEvent('web_app_trigger_haptic_feedback', { type: 'impact', impact_style: 'light' })
}

async function saveTrail() {
  loading.value = true
  await Promise.all([
    apiPost('/api/config', { key: 'HWM_START_R', value: String(startR.value) }),
    apiPost('/api/config', { key: 'PNL_START_USD', value: String(startUsd.value) })
  ])
  loading.value = false
  postEvent('web_app_trigger_haptic_feedback', { type: 'notification', notification_style: 'success' })
}
</script>

<template>
  <div class="card">
    <h3>🛡️ Trail Settings</h3>
    <div v-if="symbol">
      <div class="toggle-row">
        <button :class="['btn', hwmEnabled ? 'active' : '']" @click="toggleTrail('HWM_PROTECT_ENABLED')">
          HWM: {{ hwmEnabled ? 'ON' : 'OFF' }}
        </button>
        <button :class="['btn', pnlEnabled ? 'active' : '']" @click="toggleTrail('PNL_TRAIL_ENABLED')">
          PnL: {{ pnlEnabled ? 'ON' : 'OFF' }}
        </button>
      </div>
      <div class="metrics">
        <div>
          <label class="metric-label">HWM start R</label>
          <input type="number" v-model="startR" step="0.1" class="input" />
        </div>
        <div>
          <label class="metric-label">PnL start $</label>
          <input type="number" v-model="startUsd" step="0.25" class="input" />
        </div>
      </div>
      <button class="btn save-btn" @click="saveTrail" :disabled="loading">💾 Save Settings</button>
    </div>
    <p v-else>Select a slot first</p>
  </div>
</template>

<style scoped>
.card {
  background: #16213e;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 10px;
}
h3 {
  color: #00d4ff;
  font-size: 13px;
  margin-bottom: 10px;
  text-transform: uppercase;
}
.toggle-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: #fff;
  background: #3742fa;
}
.btn.active {
  background: #00ff88;
  color: #000;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
}
.metric-label {
  font-size: 10px;
  color: #8888aa;
  text-transform: uppercase;
  display: block;
  margin-bottom: 4px;
}
.input {
  width: 100%;
  padding: 8px;
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 6px;
  color: #e0e0e0;
  font-size: 14px;
}
.save-btn {
  width: 100%;
  background: #00d4ff;
  color: #000;
}
</style>