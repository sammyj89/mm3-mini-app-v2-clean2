<script setup>
import { ref, onMounted } from 'vue'
import { getApiBase, setApiBase, getApiKey, setApiKey, apiGet, apiPost } from '../services/api'

const apiUrl = ref(getApiBase())
const apiKey = ref(getApiKey())
const testing = ref(false)
const testResult = ref(null)
const bidirectionalMode = ref(true)
// Fetch from API instead of hardcoding
const localStopPct = ref('8%')
const maxPerCoin = ref('$150')

onMounted(async () => {
  try {
    const res = await apiGet('/api/risk_status')
    if (res.success && res.data) bidirectionalMode.value = res.data.bidirectional
  } catch (e) { console.error('Failed to load risk status', e) }
  try {
    const cfg = await apiGet('/api/config', { key: 'base_sl_pct' })
    if (cfg.success && cfg.value) localStopPct.value = `${parseFloat(cfg.value).toFixed(0)}%`
  } catch { /* keep default */ }
  try {
    const cfg = await apiGet('/api/config', { key: 'pw_outer_notional_usd' })
    if (cfg.success && cfg.value) maxPerCoin.value = `$${parseFloat(cfg.value).toFixed(0)}`
  } catch { /* keep default */ }
})

const toggleBidirectional = async () => {
  try { await apiPost(`/api/set_bidirectional?enabled=${bidirectionalMode.value}`) }
  catch (e) { console.error('Failed to toggle bidirectional', e) }
}

const saveAndReload = () => {
  if (!apiUrl.value.startsWith('http')) {
    testResult.value = { success: false, message: '❌ URL must start with http:// or https://' }
    return
  }
  setApiBase(apiUrl.value)
  setApiKey(apiKey.value)
  window.location.reload()
}

const testConnection = async () => {
  testing.value = true
  testResult.value = null
  const cleanUrl = apiUrl.value.replace(/\/$/, '')
  const testUrl = `${cleanUrl}/api/health`
  try {
    const res = await fetch(testUrl, { signal: AbortSignal.timeout(5000) })
    const data = await res.json()
    if (data.status === 'ok') {
      testResult.value = { success: true, message: '✅ Connection successful — API is online' }
    } else {
      testResult.value = { success: false, message: '❌ Connected, but API returned unexpected data' }
    }
  } catch (err) {
    testResult.value = { success: false, message: `❌ Failed: ${err.message}` }
  } finally { testing.value = false }
}

const clearAndReset = () => {
  if (confirm('Clear saved URL and API key, then reload?')) {
    localStorage.removeItem('mm3_api_base')
    localStorage.removeItem('mm3_api_key')
    window.location.reload()
  }
}
</script>

<template>
  <div class="settings-view">
    <!-- Connection -->
    <div class="card mb-4">
      <div class="card-header">
        <h2 class="card-title">🔗 API Connection</h2>
      </div>
      <p class="text-secondary text-sm mb-3">Enter your API server URL and key</p>
      <div class="flex gap-2 mb-3">
        <input v-model="apiUrl" placeholder="http://35.211.112.223:8000" class="input flex-1" @keyup.enter="saveAndReload" />
        <button @click="saveAndReload" class="btn btn-primary">Save</button>
      </div>
      <div class="flex gap-2 mb-3">
        <input v-model="apiKey" type="password" placeholder="API Key (optional)" class="input flex-1" @keyup.enter="saveAndReload" />
      </div>
      <button @click="testConnection" class="btn btn-block btn-secondary" :disabled="testing">
        {{ testing ? 'Testing…' : 'Test Connection' }}
      </button>
      <Transition name="fade">
        <p v-if="testResult" :class="['text-sm font-semibold text-center mt-3', testResult.success ? 'text-success' : 'text-danger']">
          {{ testResult.message }}
        </p>
      </Transition>

      <div class="helper-box mt-4">
        <p class="font-semibold text-sm mb-2">Setup:</p>
        <ol class="text-sm text-secondary">
          <li>Enter the API server URL (e.g. <code>http://35.211.112.223:8000</code>)</li>
          <li>Enter the API key if the server requires one</li>
          <li>Click Save, then Test Connection</li>
        </ol>
        <p class="text-xs text-muted mt-2">The URL and key are stored in your browser only.</p>
      </div>
    </div>

    <!-- Trading Mode -->
    <div class="card mb-4">
      <div class="card-header">
        <h2 class="card-title">⚙️ Trading Mode</h2>
      </div>
      <label class="mode-toggle">
        <input type="checkbox" v-model="bidirectionalMode" @change="toggleBidirectional" />
        <span class="toggle-track">
          <span class="toggle-thumb"></span>
        </span>
        <span class="font-semibold text-sm">{{ bidirectionalMode ? '↔️ Bidirectional' : '➡️ Unidirectional' }}</span>
      </label>
      <p class="text-sm text-secondary mt-2">{{ bidirectionalMode ? 'Trading both long and short sides' : 'Trading only scanner\'s preferred side' }}</p>
      <div class="risk-meta mt-3">
        <div class="risk-meta__item"><span class="text-muted text-xs">Local Stop</span><span class="font-bold text-sm">{{ localStopPct }}</span></div>
        <div class="risk-meta__item"><span class="text-muted text-xs">Max/coin</span><span class="font-bold text-sm">{{ maxPerCoin }}</span></div>
      </div>
    </div>

    <!-- Danger Zone -->
    <div class="danger-card">
      <h3 class="text-danger font-bold text-sm mb-2">⚠️ Danger Zone</h3>
      <button @click="clearAndReset" class="btn btn-sm btn-danger">Clear URL & Key & Reset</button>
      <p class="text-xs text-muted mt-2">Deletes saved URL, API key, and reverts to defaults.</p>
    </div>
  </div>
</template>

<style scoped>
.settings-view { padding-bottom: var(--space-4); }
.helper-box {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
}
.helper-box code {
  background: var(--bg-card);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}
.helper-box ol { padding-left: var(--space-4); margin: 0; }
.helper-box li { margin-bottom: 2px; }

/* Toggle switch */
.mode-toggle { display: flex; align-items: center; gap: var(--space-2); cursor: pointer; }
.mode-toggle input { display: none; }
.toggle-track {
  width: 48px;
  height: 26px;
  background: var(--bg-hover);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  position: relative;
  transition: background var(--transition-fast), border-color var(--transition-fast);
}
.toggle-thumb {
  position: absolute;
  width: 20px;
  height: 20px;
  background: var(--text-primary);
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: transform var(--transition-fast);
}
.mode-toggle input:checked + .toggle-track { background: var(--accent-soft); border-color: var(--accent); }
.mode-toggle input:checked + .toggle-track .toggle-thumb { transform: translateX(22px); background: var(--accent); }

.risk-meta { display: flex; gap: var(--space-4); background: var(--bg-elevated); border-radius: var(--radius-sm); padding: var(--space-3); }
.risk-meta__item { display: flex; flex-direction: column; }

.danger-card {
  border: 1px solid var(--danger);
  background: var(--danger-soft);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
