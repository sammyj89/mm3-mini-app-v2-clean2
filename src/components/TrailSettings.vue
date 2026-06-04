<script setup>
import { ref, onMounted } from 'vue'
import { apiGet, apiPost } from '../services/api'
import { postEvent } from '../tma'

const hwmEnabled = ref(true)
const pnlTrailEnabled = ref(true)
const startR = ref(1.0)
const startUsd = ref(2.0)
const loading = ref(true)

onMounted(async () => {
  try {
    const [hwmRes, pnlRes, rRes, usdRes] = await Promise.all([
      apiGet('/api/config', { key: 'HWM_PROTECT_ENABLED' }),
      apiGet('/api/config', { key: 'PNL_TRAIL_ENABLED' }),
      apiGet('/api/config', { key: 'HWM_START_R' }),
      apiGet('/api/config', { key: 'PNL_START_USD' })
    ])
    hwmEnabled.value = hwmRes.value === 'true'
    pnlTrailEnabled.value = pnlRes.value === 'true'
    startR.value = parseFloat(rRes.value) || 1.0
    startUsd.value = parseFloat(usdRes.value) || 2.0
  } catch (e) { console.error('Failed to load trail settings', e) }
  loading.value = false
})

const toggleBool = async (key, refVar) => {
  loading.value = true
  const res = await apiGet('/api/config', { key })
  const current = res.value === 'true'
  await apiPost('/api/config', { key, value: current ? 'false' : 'true' })
  refVar.value = !current
  loading.value = false
  postEvent('web_app_trigger_haptic_feedback', { type: 'impact', impact_style: 'light' })
}

const saveNumbers = async () => {
  await Promise.all([
    apiPost('/api/config', { key: 'HWM_START_R', value: String(startR.value) }),
    apiPost('/api/config', { key: 'PNL_START_USD', value: String(startUsd.value) })
  ])
  postEvent('web_app_trigger_haptic_feedback', { type: 'notification', notification_style: 'success' })
}
</script>

<template>
  <div class="card">
    <div class="card-header"><h2 class="card-title">🛡️ Trail Config</h2></div>
    <div v-if="loading" class="empty-state">Loading…</div>
    <div v-else class="trail-settings">
      <label class="toggle-row">
        <span>HWM Trail</span>
        <input type="checkbox" :checked="hwmEnabled" @change="toggleBool('HWM_PROTECT_ENABLED', hwmEnabled)" />
      </label>
      <label class="toggle-row">
        <span>PnL Trail</span>
        <input type="checkbox" :checked="pnlTrailEnabled" @change="toggleBool('PNL_TRAIL_ENABLED', pnlTrailEnabled)" />
      </label>
      <div class="number-row">
        <span>HWM startR</span>
        <input v-model.number="startR" type="number" step="0.1" class="input" style="width:80px" />
      </div>
      <div class="number-row">
        <span>PnL start USD</span>
        <input v-model.number="startUsd" type="number" step="0.25" class="input" style="width:80px" />
      </div>
      <button @click="saveNumbers" class="btn btn-sm btn-primary mt-2">Save</button>
    </div>
  </div>
</template>

<style scoped>
.trail-settings { display: flex; flex-direction: column; gap: var(--space-3); }
.toggle-row { display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
.number-row { display: flex; justify-content: space-between; align-items: center; }
</style>
