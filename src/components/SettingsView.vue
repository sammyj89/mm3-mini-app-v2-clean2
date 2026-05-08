<script setup>
import { ref, onMounted } from 'vue'
import { apiGet, apiPost } from '../services/api'

const props = defineProps({ symbols: Object })

const maxSlots = ref(3)
const ladderSpacing = ref(1.0)
const hwmEnabled = ref(true)
const pnlTrailEnabled = ref(true)
const hwmStartR = ref(0.8)
const pnlStartUsd = ref(1.0)
const saving = ref(false)
const message = ref('')

async function loadSettings() {
  try {
    const [slotsRes, spacingRes, hwmRes, pnlRes, rRes, usdRes] = await Promise.all([
      apiGet('/api/config', { key: 'MM_MAX_SLOTS' }),
      apiGet('/api/config', { key: 'LADDER_SPACING_MULTIPLIER' }),
      apiGet('/api/config', { key: 'HWM_PROTECT_ENABLED' }),
      apiGet('/api/config', { key: 'PNL_TRAIL_ENABLED' }),
      apiGet('/api/config', { key: 'HWM_START_R' }),
      apiGet('/api/config', { key: 'PNL_START_USD' }),
    ])
    maxSlots.value = parseInt(slotsRes.value || '3')
    ladderSpacing.value = parseFloat(spacingRes.value || '1.0')
    hwmEnabled.value = hwmRes.value === 'true'
    pnlTrailEnabled.value = pnlRes.value === 'true'
    hwmStartR.value = parseFloat(rRes.value || '0.8')
    pnlStartUsd.value = parseFloat(usdRes.value || '1.0')
  } catch (e) {
    console.error(e)
  }
}

onMounted(loadSettings)

async function saveSettings() {
  saving.value = true
  message.value = ''
  try {
    await Promise.all([
      apiPost('/api/config', { key: 'MM_MAX_SLOTS', value: String(maxSlots.value) }),
      apiPost('/api/config', { key: 'LADDER_SPACING_MULTIPLIER', value: String(ladderSpacing.value) }),
      apiPost('/api/config', { key: 'HWM_PROTECT_ENABLED', value: hwmEnabled.value ? 'true' : 'false' }),
      apiPost('/api/config', { key: 'PNL_TRAIL_ENABLED', value: pnlTrailEnabled.value ? 'true' : 'false' }),
      apiPost('/api/config', { key: 'HWM_START_R', value: String(hwmStartR.value) }),
      apiPost('/api/config', { key: 'PNL_START_USD', value: String(pnlStartUsd.value) }),
    ])
    message.value = '✅ Settings saved'
  } catch (e) {
    message.value = '❌ Save failed: ' + e.message
  }
  saving.value = false
}
</script>

<template>
  <div class="settings-tab">
    <div class="card">
      <h3>⚙️ Slot Configuration</h3>
      <div class="setting-row">
        <label title="How many simultaneous pairs the bot can trade (1‑5). Changes take effect after saving and apply to new slots.">Max active slots</label>
        <input type="number" v-model.number="maxSlots" min="1" max="5" class="input" />
      </div>
      <p class="hint">Currently {{ Object.keys(symbols || {}).length }} slots active.</p>
    </div>

    <div class="card">
      <h3>🪜 Ladder</h3>
      <div class="setting-row">
        <label title="Scales the distance between sell levels. 1.0 = default, 2.0 = twice as far apart.">Spacing multiplier: <strong>{{ ladderSpacing.toFixed(1) }}x</strong></label>
        <input type="range" v-model.number="ladderSpacing" min="0.5" max="3.0" step="0.1" />
      </div>
    </div>

    <div class="card">
      <h3>🛡️ Trail</h3>
      <div class="toggle-row">
        <button :class="['btn', hwmEnabled ? 'active' : '']" @click="hwmEnabled = !hwmEnabled" title="High Water Mark trailing stop that moves up with profit.">HWM: {{ hwmEnabled ? 'ON' : 'OFF' }}</button>
        <button :class="['btn', pnlTrailEnabled ? 'active' : '']" @click="pnlTrailEnabled = !pnlTrailEnabled" title="PnL‑based trailing stop that tightens after a dollar profit target.">PnL: {{ pnlTrailEnabled ? 'ON' : 'OFF' }}</button>
      </div>
      <div class="metrics">
        <div>
          <label class="metric-label" title="R‑multiple where HWM trailing starts (e.g., 0.8 = 80% of initial stop distance).">HWM start R</label>
          <input type="number" v-model.number="hwmStartR" step="0.1" class="input" />
        </div>
        <div>
          <label class="metric-label" title="Minimum profit in USDT before PnL trailing activates.">PnL start $</label>
          <input type="number" v-model.number="pnlStartUsd" step="0.25" class="input" />
        </div>
      </div>
    </div>

    <button class="btn save-btn" @click="saveSettings" :disabled="saving">💾 Save Settings</button>
    <p class="message" v-if="message">{{ message }}</p>
  </div>
</template>

<style scoped>
.settings-tab { padding: 12px; }
.card { background: #16213e; border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
h3 { color: #00d4ff; font-size: 14px; margin-bottom: 10px; text-transform: uppercase; }
.setting-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
.setting-row label { color: #e0e0e0; }
.input { width: 80px; padding: 6px; background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 6px; color: #e0e0e0; font-size: 14px; text-align: center; }
input[type="range"] { flex: 1; accent-color: #00d4ff; }
.hint { font-size: 11px; color: #8888aa; }
.toggle-row { display: flex; gap: 8px; margin-bottom: 12px; }
.btn { flex: 1; padding: 10px; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; color: #fff; background: #3742fa; }
.btn.active { background: #00ff88; color: #000; }
.metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
.metric-label { font-size: 10px; color: #8888aa; text-transform: uppercase; display: block; margin-bottom: 4px; }
.save-btn { width: 100%; background: #00d4ff; color: #000; }
.message { text-align: center; margin-top: 10px; color: #00ff88; font-family: monospace; }
</style>