<script setup>
import { ref, watch } from 'vue'
import { apiGet, apiPost } from '../services/api'


const props = defineProps({ symbol: String })

const spacing = ref(1.0)
const loading = ref(false)

async function fetchSpacing() {
  const res = await apiGet('/api/config', { key: 'LADDER_SPACING_MULTIPLIER' })
  if (res.success) spacing.value = parseFloat(res.value) || 1.0
}

watch(() => props.symbol, () => {
  if (props.symbol) fetchSpacing()
}, { immediate: true })

async function setSpacing(val) {
  loading.value = true
  await apiPost('/api/config', { key: 'LADDER_SPACING_MULTIPLIER', value: String(val) })
  spacing.value = val
  loading.value = false
}

async function resetAll() {
  loading.value = true
  try {
    await apiPost('/api/ladder/reset', { symbol: props.symbol })
  } catch (e) {
    console.error(e)
  }
  loading.value = false
}

async function resetRemaining() {
  if (!props.symbol) return
  loading.value = true
  try {
    await apiPost('/api/ladder/reset', {
      symbol: props.symbol,
      mode: 'remaining'
    })
  } catch (e) {
    console.error(e)
  }
  loading.value = false
}

<template>
  <div class="card">
    <h3>🪜 Ladder Controls</h3>
    <div v-if="symbol">
      <div class="slider-row">
        <label>Spacing: <strong>{{ spacing.toFixed(1) }}x</strong></label>
        <input type="range" min="0.5" max="3.0" step="0.1"
               :value="spacing"
               @change="setSpacing(parseFloat($event.target.value))">
      </div>
      <div class="btn-row">
        <button class="btn" @click="resetAll" :disabled="loading">🔄 Reset All</button>
        <button class="btn" @click="resetRemaining" :disabled="loading">📊 Reset Remaining</button>
      </div>
    </div>
    <p v-else>Select a slot first</p>
  </div>
</template>

<style scoped>
.card { /* same as SlotCard */ background: var(--card, #16213e); border-radius:10px; padding:14px; margin-bottom:10px; }
h3 { color: #00d4ff; font-size:13px; margin-bottom:10px; text-transform:uppercase; }
.slider-row { display:flex; align-items:center; gap:10px; margin-bottom:12px; }
.slider-row input { flex:1; accent-color:#00d4ff; }
.btn-row { display:flex; gap:8px; }
.btn { flex:1; padding:12px; border:none; border-radius:8px; font-size:14px; font-weight:600; color:#fff; background:#3742fa; cursor:pointer; }
.btn:disabled { opacity:0.5; cursor:not-allowed; }
</style>