<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { apiGet, apiPost, apiPostQuery } from '../services/api'
import { postEvent } from '../tma'
import MiniPriceChart from './MiniPriceChart.vue'

const slots = ref({})
const selectedSlot = ref('')
const scanning = ref(false)
const picks = ref([])
const statusMsg = ref('')
const lastScanTimestamp = ref(null)
const maxSlots = ref(3)

const timeAgo = computed(() => {
  const ts = lastScanTimestamp.value
  if (!ts) return 'Never'
  const diffSec = Math.floor(Date.now() / 1000) - ts
  if (diffSec < 60) return `${diffSec}s ago`
  const min = Math.floor(diffSec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  return `${hr}h ago`
})

function slotMetrics(symData) {
  const live = symData?.live || {}
  const qty = Math.abs(live.net_qty || 0)
  const mid = live.mid || 0
  const avg = live.avg_entry || 0
  const side = live.side || 'short'
  if (!qty || !mid) return { notionalStr: 'FLAT', pnlStr: '' }

  const usd = qty * mid
  const notionalStr = usd >= 1000 ? `$${(usd / 1000).toFixed(1)}k` : `$${usd.toFixed(0)}`

  let pnl = 0
  if (avg > 0) {
    pnl = side === 'short' ? (avg - mid) * qty : (mid - avg) * qty
  }
  const pnlStr = pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`

  return { notionalStr, pnlStr }
}

async function loadConfig() {
  try {
    const res = await apiGet('/api/config', { key: 'MM_MAX_SLOTS' })
    if (res.success && res.value) maxSlots.value = parseInt(res.value, 10) || 3
  } catch (e) { /* ignore */ }
}

async function loadSlots() {
  try {
    const res = await apiGet('/api/status_all')
    if (res.success && res.data) slots.value = { ...res.data }
  } catch (e) { console.error('loadSlots error', e) }
}

async function fetchExistingPicks() {
  try {
    const res = await apiGet('/api/screener_top5')
    if (res.success && res.data) {
      const data = res.data
      const picksList = Array.isArray(data) ? data : (data.picks || [])
      if (picksList.length) {
        picks.value = picksList
        lastScanTimestamp.value = data.generated_ts || null
      }
    }
  } catch (e) { /* ignore */ }
}

let refreshInterval = null
let timeAgoInterval = null

onMounted(() => {
  loadConfig()
  loadSlots()
  fetchExistingPicks()

  refreshInterval = setInterval(() => {
    loadSlots()
    fetchExistingPicks()
  }, 15_000)

  timeAgoInterval = setInterval(() => {
    lastScanTimestamp.value = lastScanTimestamp.value
  }, 1_000)
})

onUnmounted(() => {
  clearInterval(refreshInterval)
  clearInterval(timeAgoInterval)
})

async function runScanner() {
  scanning.value = true
  statusMsg.value = 'Scanning…'
  try {
    const res = await apiPost('/api/run_screener')
    if (res.success && res.data) {
      let picksList = []
      let timestamp = null
      if (Array.isArray(res.data)) {
        picksList = res.data
      } else if (res.data.picks) {
        picksList = res.data.picks
        timestamp = res.data.generated_ts
      }
      if (picksList.length) {
        picks.value = picksList
        lastScanTimestamp.value = timestamp || Math.floor(Date.now() / 1000)
        statusMsg.value = ''
      } else {
        picks.value = []
        statusMsg.value = 'No suitable pairs found.'
      }
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

async function replaceSlot(newSymbol) {
  if (!selectedSlot.value) {
    statusMsg.value = 'Please select a current slot to replace.'
    return
  }
  statusMsg.value = 'Rotating…'
  try {
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

async function addSlot(newSymbol) {
  if (Object.keys(slots.value).length >= maxSlots.value) {
    statusMsg.value = `All ${maxSlots.value} slots are full – replace one first.`
    return
  }
  statusMsg.value = 'Adding…'
  try {
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
    <!-- Current Slots -->
    <div class="card">
      <h3>🎯 Current Slots</h3>
      <div v-if="Object.keys(slots).length">
        <div v-for="(data, sym) in slots" :key="sym" class="slot-row">
          <label class="slot-label">
            <input type="radio" v-model="selectedSlot" :value="sym" />
            <span class="symbol-name">{{ sym.split(':')[0].replace('/USDT', '') }}</span>
            <div class="slot-right">
              <MiniPriceChart :symbol="sym" timeframe="15m" :limit="24" />
              <span class="notional">{{ slotMetrics(data).notionalStr }}</span>
              <span
                class="pnl"
                :class="{
                  green: (slotMetrics(data).pnlStr.startsWith('+')),
                  red: (slotMetrics(data).pnlStr.startsWith('-'))
                }"
              >{{ slotMetrics(data).pnlStr || '' }}</span>
            </div>
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
      <p class="scan-freshness" v-if="lastScanTimestamp !== null">Last scan: {{ timeAgo }}</p>
      <p class="scan-freshness" v-else>No recent scan data.</p>
      <p class="status" v-if="statusMsg">{{ statusMsg }}</p>
    </div>

    <!-- Empty state -->
    <div v-if="picks.length === 0 && !scanning" class="card empty-state">
      📡 No scanner data yet – tap <strong>Start Scan</strong> to find today’s top movers.
    </div>

    <!-- Scanner Results -->
    <div v-if="picks.length" class="card">
      <h3>🏆 Top Picks</h3>
      <div class="pick-list">
        <div v-for="p in picks" :key="p.symbol" class="pick-item">
          <div class="pick-info">
            <span class="symbol-name pick-name">{{ p.symbol.split(':')[0].replace('/USDT', '') }}</span>
            <span class="score">Score: {{ p.score.toFixed(2) }}</span>
            <span class="rvol">RVOL: {{ Math.round(p.rvol) }}%</span>
          </div>
          <div class="pick-actions">
            <button class="btn small" @click="replaceSlot(p.symbol)" :disabled="!selectedSlot">🔄 Replace</button>
            <button class="btn small" @click="addSlot(p.symbol)" v-if="Object.keys(slots).length < maxSlots">➕ Add</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scanner-tab { padding: 12px; }
.card { background: #16213e; border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
h3 { color: #00d4ff; font-size: 14px; margin-bottom: 10px; text-transform: uppercase; }

/* ---- slot row ---- */
.slot-row {
  margin-bottom: 8px;
}
.slot-label {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  cursor: pointer;
}

/* Pair name – takes all available space */
.symbol-name {
  flex: 1;
  font-weight: bold;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Right side: sparkline + notional + PnL */
.slot-right {
  display: flex;
  align-items: center;
  gap: 6px;                   /* tighter gap between items */
  flex-shrink: 0;
  font-family: monospace;
  font-size: 13px;
}
.slot-right .mini-chart {
  width: 80px;
  height: 36px;
  flex-shrink: 0;
  overflow: hidden;   /* ← NEW: guarantee no overflow */
}
.notional {
  min-width: 55px;
  text-align: right;
  color: #e0e0e0;
}
.pnl {
  min-width: 65px;
  text-align: right;
}
.pnl.green { color: #00ff88; }
.pnl.red   { color: #ff4757; }

/* ---- scanner picks ---- */
.pick-item {
  border-bottom: 1px solid #2a2a4a;
  padding: 10px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pick-info {
  display: flex;
  flex-direction: column;
}
.pick-name {
  max-width: 180px;          /* more room for pick names */
  margin-bottom: 2px;
}
.score, .rvol { font-size: 10px; color: #8888aa; }
.pick-actions { display: flex; gap: 6px; margin-top: 6px; }

/* ---- buttons ---- */
.btn { width: 100%; padding: 12px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; color: #fff; background: #3742fa; margin-bottom: 6px; }
.scan-btn { background: #00d4ff; color: #000; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.small { padding: 8px 12px; font-size: 12px; width: auto; }

.status { color: #ffa502; font-size: 12px; margin-top: 6px; }
.scan-freshness { font-size: 12px; color: #aaa; margin-top: 4px; }
.empty-state { text-align: center; padding: 20px; color: #aaa; }
</style>