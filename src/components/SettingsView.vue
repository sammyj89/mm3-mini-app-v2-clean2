<template>
  <div class="settings-container">
    <h2>⚙️ Connection Settings</h2>
    <p class="subtitle">Enter the backend API URL. This is your Cloudflare tunnel URL.</p>
    
    <div class="input-group">
      <input 
        v-model="apiUrl" 
        placeholder="https://your-tunnel.trycloudflare.com" 
        class="url-input"
        @keyup.enter="saveAndReload"
      />
      <button @click="saveAndReload" class="save-btn">Save & Reload</button>
    </div>

    <button @click="testConnection" class="test-btn" :disabled="testing">
      {{ testing ? 'Testing...' : 'Test Connection' }}
    </button>

    <p v-if="testResult" :class="['result-msg', testResult.success ? 'success' : 'error']">
      {{ testResult.message }}
    </p>

    <div class="helper-text">
      <p><strong>How to find the current URL:</strong></p>
      <ol>
        <li>SSH into your server.</li>
        <li>Run: <code>cat /tmp/tunnel_url.txt</code></li>
        <li>Copy the URL and paste it above, then click "Save & Reload".</li>
      </ol>
      <p class="note">Note: Free Cloudflare tunnels generate a new URL every time they restart. You must update it here if the bot/tunnel restarts.</p>
    </div>

    <!-- NEW: Trading Mode Settings -->
    <div class="mode-section">
      <h3>⚙️ Trading Mode</h3>
      <div class="mode-toggle">
        <label class="toggle-label">
          <input type="checkbox" v-model="bidirectionalMode" @change="toggleBidirectional" />
          <span class="toggle-switch"></span>
          <span class="toggle-text">{{ bidirectionalMode ? '↔️ Bidirectional' : '➡️ Unidirectional' }}</span>
        </label>
      </div>
      <p class="mode-hint">
        <span v-if="bidirectionalMode">Trading both long and short sides</span>
        <span v-else>Trading only scanner's preferred side</span>
      </p>
      <div class="risk-info">
        <span class="risk-label">Local Stop:</span>
        <span class="risk-value">8%</span>
        <span class="risk-label">Max/coin:</span>
        <span class="risk-value">$150</span>
      </div>
    </div>

    <div class="danger-zone">
      <h3>⚠️ Danger Zone</h3>
      <button @click="clearAndReset" class="clear-btn">Clear URL & Reset to Default</button>
      <p class="danger-text">This will delete your saved URL and revert to the compiled default.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getApiBase, setApiBase, apiGet, apiPost } from '../services/api'

const apiUrl = ref(getApiBase())
const testing = ref(false)
const testResult = ref(null)

// NEW: Bidirectional mode
const bidirectionalMode = ref(true)

onMounted(async () => {
  try {
    const res = await apiGet('/api/risk_status')
    if (res.success && res.data) {
      bidirectionalMode.value = res.data.bidirectional
    }
  } catch (e) { console.error('Failed to load risk status', e) }
})

const toggleBidirectional = async () => {
  try {
    await apiPost(`/api/set_bidirectional?enabled=${bidirectionalMode.value}`)
  } catch (e) {
    console.error('Failed to toggle bidirectional', e)
  }
}

const saveAndReload = () => {
  if (!apiUrl.value.startsWith('http')) {
    testResult.value = { success: false, message: '❌ URL must start with http:// or https://' }
    return
  }
  setApiBase(apiUrl.value) 
  window.location.reload()
}

const testConnection = async () => {
  testing.value = true
  testResult.value = null
  
  // Test against the URL currently typed in the box, not the globally saved one
  const cleanUrl = apiUrl.value.replace(/\/$/, '')
  const testUrl = `${cleanUrl}/api/health`
  
  try {
    const res = await fetch(testUrl, { signal: AbortSignal.timeout(5000) })
    const data = await res.json()
    if (data.status === 'ok') {
      testResult.value = { success: true, message: '✅ Connection Successful! API is online.' }
    } else {
      testResult.value = { success: false, message: '❌ Connected, but API returned unexpected data.' }
    }
  } catch (err) {
    testResult.value = { success: false, message: `❌ Failed to connect: ${err.message}` }
  } finally {
    testing.value = false
  }
}

const clearAndReset = () => {
  if (confirm('Are you sure you want to clear the saved URL? The app will reload.')) {
    localStorage.removeItem('mm3_api_base')
    window.location.reload()
  }
}
</script>

<style scoped>
.settings-container {
  padding: 24px;
  max-width: 600px;
  margin: 0 auto;
}

h2 {
  margin-bottom: 8px;
  color: #e0e0e0;
}

.subtitle {
  color: #a0a0a0;
  margin-bottom: 20px;
  font-size: 14px;
}

.input-group {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.url-input {
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #444;
  background: #1a1a2e;
  color: #fff;
  font-size: 14px;
  box-sizing: border-box;
}

.url-input:focus {
  outline: none;
  border-color: #00d4ff;
}

.save-btn {
  padding: 12px 24px;
  background: #00d4ff;
  color: #000;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;
}

.save-btn:hover {
  background: #00b8d4;
}

.test-btn {
  width: 100%;
  padding: 12px;
  background: #2a2a4a;
  color: #fff;
  border: 1px solid #444;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
  margin-bottom: 16px;
}

.test-btn:hover:not(:disabled) {
  background: #3a3a5a;
}

.test-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.result-msg {
  text-align: center;
  font-weight: bold;
  margin-bottom: 16px;
}

.success {
  color: #00ff88;
}

.error {
  color: #ff4444;
}

.helper-text {
  margin-top: 30px;
  padding: 20px;
  background: #16213e;
  border-radius: 8px;
  border-left: 4px solid #00d4ff;
  font-size: 13px;
  line-height: 1.6;
  color: #e0e0e0;
}

.helper-text ol {
  padding-left: 20px;
  margin: 10px 0;
}

.helper-text code {
  background: #000;
  padding: 2px 6px;
  border-radius: 4px;
  color: #00d4ff;
  font-family: monospace;
}

.note {
  margin-top: 12px;
  font-size: 12px;
  color: #a0a0a0;
  font-style: italic;
}

.danger-zone {
  margin-top: 40px;
  padding: 20px;
  border: 1px solid #ff4444;
  border-radius: 8px;
  background: rgba(255, 68, 68, 0.05);
}

.danger-zone h3 {
  color: #ff4444;
  margin-bottom: 10px;
  font-size: 16px;
}

.clear-btn {
  padding: 10px 20px;
  background: transparent;
  color: #ff4444;
  border: 1px solid #ff4444;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 8px;
}

.clear-btn:hover {
  background: #ff4444;
  color: #fff;
}

.danger-text {
  font-size: 12px;
  color: #a0a0a0;
}

.mode-section {
  background: #1a1a2e;
  border-radius: 12px;
  padding: 20px;
  margin: 20px 0;
}

.mode-section h3 {
  color: #00d4ff;
  margin-bottom: 15px;
  font-size: 16px;
}

.mode-toggle {
  margin-bottom: 10px;
}

.toggle-label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.toggle-label input {
  display: none;
}

.toggle-switch {
  width: 48px;
  height: 26px;
  background: #333;
  border-radius: 13px;
  position: relative;
  margin-right: 12px;
  transition: background 0.3s;
}

.toggle-switch::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
  top: 3px;
  left: 3px;
  transition: transform 0.3s;
}

.toggle-label input:checked + .toggle-switch {
  background: #00d4ff;
}

.toggle-label input:checked + .toggle-switch::after {
  transform: translateX(22px);
}

.toggle-text {
  font-size: 14px;
  font-weight: bold;
  color: #fff;
}

.mode-hint {
  font-size: 12px;
  color: #888;
  margin-bottom: 12px;
}

.risk-info {
  display: flex;
  gap: 15px;
  padding: 10px;
  background: #16213e;
  border-radius: 8px;
  font-size: 12px;
}

.risk-label {
  color: #888;
}

.risk-value {
  color: #00ff88;
  font-weight: bold;
}
</style>