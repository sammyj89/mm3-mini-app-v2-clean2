<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { apiGet, apiPost } from '../services/api'

// ── Props: the universe passes in the symbol and initial data ──
const props = defineProps({
  symbol: { type: String, required: true },
  initialData: { type: Object, default: () => ({}) }
})

// ── Reactive state ──
const live = ref(props.initialData.live || {})
const ladder = ref(props.initialData.ladder || {})
const daily = ref(props.initialData.daily_pnl || 0)
const loading = ref(false)

// ── Compute P&L client‑side ──
const computedPnL = () => {
  if (!live.value || !live.value.mid || !live.value.avg_entry || !live.value.net_qty) return 0
  const side = live.value.side || 'short'
  const qty = Math.abs(live.value.net_qty)
  return side === 'short'
    ? (live.value.avg_entry - live.value.mid) * qty
    : (live.value.mid - live.value.avg_entry) * qty
}

const pnlClass = () => computedPnL() >= 0 ? 'green' : 'red'

const posLine = () => {
  if (!live.value || !live.value.net_qty) return 'FLAT'
  return `${live.value.side} ${Math.abs(live.value.net_qty).toFixed(4)}`
}

const filledPct = () => {
  if (!ladder.value || !ladder.value.total) return 0
  return ((ladder.value.consumed / ladder.value.total) * 100).toFixed(0)
}

// ── Poll for fresh data ──
let interval = null
async function refresh() {
  try {
    const res = await apiGet('/api/status', { symbol: props.symbol })
    if (res.success) {
      live.value = res.data.live || {}
      ladder.value = res.data.ladder || {}
      daily.value = res.data.daily_pnl || 0
    }
  } catch (e) {
    console.error('SlotCard refresh error:', e)
  }
}

onMounted(() => {
  refresh()
  interval = setInterval(refresh, 5000)
})
onUnmounted(() => clearInterval(interval))

// ── Actions ──
async function quickSeed() {
  loading.value = true
  try {
    await apiPost('/api/symbol', { symbol: props.symbol })
    await refresh()
  } catch (e) {
    console.error(e)
  }
  loading.value = false
}

async function resetAllLadder() {
  loading.value = true
  try {
    await apiPost('/api/ladder/reset', { symbol: props.symbol })
    await refresh()
  } catch (e) {
    console.error(e)
  }
  loading.value = false
}

// The releaseSlot component would need a confirmation modal – we'll keep it simple for now.
// You can add a releaseSlot() method later that emits an event to open a modal.
const emit = defineEmits(['release'])
function release() {
  emit('release', props.symbol)
}
</script>

<template>
  <div class="card">
    <div class="slot-row">
      <span class="slot-symbol">{{ symbol.split(':')[0] }}</span>
      <span :class="['slot-pnl', pnlClass()]">${{ computedPnL().toFixed(2) }}</span>
    </div>

    <div class="metrics">
      <div>
        <div class="metric-label">Mid</div>
        <div class="metric-value">{{ (live.mid || 0).toFixed(6) }}</div>
      </div>
      <div>
        <div class="metric-label">Position</div>
        <div class="metric-value">{{ posLine() }}</div>
      </div>
      <div>
        <div class="metric-label">Entry</div>
        <div class="metric-value">{{ (live.avg_entry || 0).toFixed(6) }}</div>
      </div>
      <div>
        <div class="metric-label">Stop Loss</div>
        <div class="metric-value">{{ live.live_sl || '--' }}</div>
      </div>
    </div>

    <div class="ladder-bar-outer">
      <div class="ladder-bar-inner" :style="{ width: filledPct() + '%' }"></div>
      <div class="ladder-bar-text">{{ ladder.consumed || 0 }}/{{ ladder.total || 0 }} filled</div>
    </div>

    <div class="control-row">
      <button class="btn" @click="quickSeed">⚡ Seed</button>
      <button class="btn" @click="resetAllLadder">🔄 Reset</button>
      <button class="btn" @click="release">🔓 Release</button>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: var(--card, #16213e);
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 10px;
}
.slot-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.slot-symbol {
  font-weight: bold;
  font-size: 14px;
}
.slot-pnl {
  font-family: monospace;
  font-weight: bold;
}
.slot-pnl.green { color: #00ff88; }
.slot-pnl.red   { color: #ff4757; }
.metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.metric-label {
  font-size: 10px;
  color: #8888aa;
  text-transform: uppercase;
}
.metric-value {
  font-size: 16px;
  font-weight: bold;
  font-family: monospace;
}
.btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 6px;
  color: #fff;
  background: #3742fa;
}
.btn:active {
  transform: scale(0.97);
}
.ladder-bar-outer {
  background: rgba(255,255,255,0.1);
  border-radius: 8px;
  height: 22px;
  overflow: hidden;
  margin: 8px 0;
  position: relative;
}
.ladder-bar-inner {
  background: linear-gradient(90deg, #00ff88, #00d4ff);
  height: 100%;
  transition: width 0.5s;
}
.ladder-bar-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 11px;
  font-weight: bold;
  color: white;
  text-shadow: 0 0 4px black;
}
.control-row {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}
.control-row .btn {
  flex: 1;
  padding: 8px;
  font-size: 11px;
}
</style>