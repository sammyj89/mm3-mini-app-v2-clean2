<script setup>
import { ref, onMounted } from 'vue'
import { apiGet, apiPost, apiPostQuery } from '../services/api'   // ← added apiPostQuery
import { postEvent } from '../tma'

// ── Current slots ──
const slots = ref({})
const selectedSlot = ref('')

// ── Scanner results ──
const scanning = ref(false)
const picks = ref([])
const statusMsg = ref('')

// ── Load slots on mount ──
async function loadSlots() {
  const res = await apiGet('/api/status_all')
  if (res.success) slots.value = res.data
}

onMounted(loadSlots)

// ── Run the scanner ──
async function runScanner() {
  scanning.value = true
  statusMsg.value = 'Scanning…'
  try {
    const res = await apiPost('/api/run_screener')
    if (res.success && res.data.length) {
      picks.value = res.data
      statusMsg.value = ''
    } else {
      picks.value = []
      statusMsg.value = 'No suitable pairs found.'
    }
  } catch (e) {
    statusMsg.value = 'Error: ' + e.message
  }
  scanning.value = false
  postEvent('web_app_trigger_haptic_feedback', { type: 'impact', impact_style: 'medium' })
}

// ── Execute the rotation ──
async function replaceSlot(newSymbol) {
  if (!selectedSlot.value) {
    statusMsg.value = 'Please select a current slot to replace.'
    return
  }

  statusMsg.value = 'Rotating…'
  try {
    // ✅ Fixed: use apiPostQuery to send old/new as query parameters
    const res = await apiPostQuery('/api/rotate_symbol', { old: selectedSlot.value, new: newSymbol })
    if (res.success) {
      statusMsg.value = `✅ Replaced ${selectedSlot.value.split(':')[0]} → ${newSymbol.split(':')[0]}`
      await loadSlots()
    } else {
      statusMsg.value = '❌ Rotation failed – check bot logs.'
    }
  } catch (e) {
    statusMsg.value = 'Error: ' + e.message
  }
}

// ── Quick add a new slot (without removing any) ──
async function addSlot(newSymbol) {
  if (Object.keys(slots.value).length >= 3) {
    statusMsg.value = 'All 3 slots are full – replace one first.'
    return
  }
  statusMsg.value = 'Adding…'
  try {
    // ✅ Fixed: use apiPostQuery for symbol addition as well
    const res = await apiPostQuery('/api/symbol', { symbol: newSymbol })
    if (res.success) {
      statusMsg.value = `✅ Added ${newSymbol}`
      await loadSlots()
    } else {
      statusMsg.value = '❌ Failed to add symbol.'
    }
  } catch (e) {
    statusMsg.value = 'Error: ' + e.message
  }
}
</script>

<template>
  <div class="scanner-tab">
    <!-- Current Slots (select which to replace) -->
    <div class="card">
      <h3>🎯 Current Slots</h3>
      <div v-if="Object.keys(slots).length">
        <div v-for="(data, sym) in slots" :key="sym" class="slot-option">
          <label>
            <input type="radio" v-model="selectedSlot" :value="sym" />
            <strong>{{ sym.split(':')[0] }}</strong>
            <span class="pos">{{ (data.live?.net_qty ? data.live.side + ' ' + Math.abs(data.live.net_qty).toFixed(4) : 'FLAT') }}</span>
          </label>
        </div>
      </div>
      <p v-else>No active slots – add a symbol first.</p>
    </div>

    <!-- Scanner controls -->
    <div class="card">
      <h3>📡 Run Scanner</h3>
      <button class="btn scan-btn" @click="runScanner" :disabled="scanning">
        {{ scanning ? '⏳ Scanning…' : 'Start Scan' }}
      </button>
      <p class="status" v-if="statusMsg">{{ statusMsg }}</p>
    </div>

    <!-- Scanner Results -->
    <div v-if="picks.length" class="card">
      <h3>🏆 Top Picks</h3>
      <div class="pick-list">
        <div v-for="p in picks" :key="p.symbol" class="pick-item">
          <div class="pick-info">
            <span class="symbol">{{ p.symbol.split(':')[0] }}</span>
            <span class="score">Score: {{ p.score.toFixed(2) }}</span>
            <span class="rvol">RVOL: {{ p.rvol }}%</span>
          </div>
          <div class="pick-actions">
            <button class="btn small" @click="replaceSlot(p.symbol)" :disabled="!selectedSlot">
              🔄 Replace Selected Slot
            </button>
            <button class="btn small" @click="addSlot(p.symbol)" v-if="Object.keys(slots).length < 3">
              ➕ Add
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scanner-tab {
  padding: 12px;
}
.card {
  background: #16213e;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 12px;
}
h3 {
  color: #00d4ff;
  font-size: 14px;
  margin-bottom: 10px;
  text-transform: uppercase;
}
.slot-option {
  margin-bottom: 8px;
}
.slot-option label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e0e0e0;
}
.pos {
  margin-left: auto;
  font-family: monospace;
  font-size: 12px;
}
.btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  color: #fff;
  background: #3742fa;
  margin-bottom: 6px;
}
.scan-btn {
  background: #00d4ff;
  color: #000;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.small {
  padding: 8px 12px;
  font-size: 12px;
  width: auto;
}
.pick-item {
  border-bottom: 1px solid #2a2a4a;
  padding: 10px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}
.pick-info {
  display: flex;
  flex-direction: column;
}
.symbol {
  font-size: 16px;
  font-weight: bold;
}
.score, .rvol {
  font-size: 10px;
  color: #8888aa;
}
.pick-actions {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}
.status {
  color: #ffa502;
  font-size: 12px;
  margin-top: 6px;
}
</style>