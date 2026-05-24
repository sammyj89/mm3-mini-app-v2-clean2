<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { apiGet, apiPost } from '../services/api'
import SkeletonCard from './SkeletonCard.vue'

const props = defineProps({
  symbol: { type: String, required: true },
  initialData: { type: Object, default: () => ({}) }
})

const live = ref(props.initialData.live || {})
const ladder = ref(props.initialData.ladder || {})
const ladderLong = ref(props.initialData.ladder_long || {})
const ladderShort = ref(props.initialData.ladder_short || {})
const loading = ref(true)
const emit = defineEmits(['release'])

// Detect concurrent mode: both sides have ladder data
const isConcurrent = computed(() =>
  (ladderShort.value?.total > 0) || (ladderLong.value?.total > 0)
)

// Per-side live data (concurrent mode)
const liveShort = computed(() => live.value?.short || {})
const liveLong  = computed(() => live.value?.long  || {})

function calcPnl(side, liveData) {
  const mid = live.value?.mid || liveData?.mid || 0
  const avg = liveData?.avg_entry || 0
  const qty = Math.abs(liveData?.net_qty || 0)
  if (!mid || !avg || !qty) return 0
  return side === 'short' ? (avg - mid) * qty : (mid - avg) * qty
}

// Single-side (legacy) helpers
const singlePnl = computed(() => {
  const mid = live.value?.mid || 0
  const avg = live.value?.avg_entry || 0
  const qty = Math.abs(live.value?.net_qty || 0)
  const side = live.value?.side || 'short'
  if (!mid || !avg || !qty) return 0
  return side === 'short' ? (avg - mid) * qty : (mid - avg) * qty
})

const posLine = () => {
  if (!live.value?.net_qty) return 'FLAT'
  return `${live.value.side} ${Math.abs(live.value.net_qty).toFixed(4)}`
}

const filledPct = (ld) => {
  if (!ld?.total) return 0
  return ((ld.consumed / ld.total) * 100).toFixed(0)
}

let interval = null
async function refresh() {
  try {
    const res = await apiGet('/api/status', { symbol: props.symbol })
    if (res.success) {
      live.value        = res.data.live        || {}
      ladder.value      = res.data.ladder      || {}
      ladderLong.value  = res.data.ladder_long  || {}
      ladderShort.value = res.data.ladder_short || {}
    }
  } catch (e) { console.error(e) }
  loading.value = false
}

onMounted(() => { refresh(); interval = setInterval(refresh, 5000) })
onUnmounted(() => clearInterval(interval))

async function quickSeed() {
  loading.value = true
  try { await apiPost('/api/symbol', { symbol: props.symbol }); await refresh() }
  catch (e) { console.error(e) }
  loading.value = false
}

async function resetAllLadder() {
  loading.value = true
  try { await apiPost('/api/ladder/reset', { symbol: props.symbol }); await refresh() }
  catch (e) { console.error(e) }
  loading.value = false
}

function release() { emit('release', props.symbol) }
</script>

<template>
  <div>
    <SkeletonCard v-if="loading" />
    <div v-else class="card">
      <div class="slot-row">
        <span class="slot-symbol">{{ symbol.split(':')[0] }}</span>
        <span class="mid-price">{{ (live.mid || 0).toFixed(6) }}</span>
        <span :class="['slot-pnl', (isConcurrent ? (calcPnl('short', liveShort) + calcPnl('long', liveLong)) : singlePnl) >= 0 ? 'green' : 'red']">
          ${{ (isConcurrent
            ? (calcPnl('short', liveShort) + calcPnl('long', liveLong))
            : singlePnl).toFixed(2) }}
        </span>
      </div>

      <!-- ── CONCURRENT MODE ── -->
      <div v-if="isConcurrent" class="concurrent-grid">
        <!-- SHORT side -->
        <div class="side-block short-side">
          <div class="side-header">
            <span class="side-label short-label">▼ SHORT</span>
            <span :class="['side-pnl', calcPnl('short', liveShort) >= 0 ? 'green' : 'red']">
              ${{ calcPnl('short', liveShort).toFixed(2) }}
            </span>
          </div>
          <div class="side-metrics">
            <div><span class="metric-label">Qty</span><span class="metric-value">{{ Math.abs(liveShort.net_qty || 0).toFixed(4) || 'FLAT' }}</span></div>
            <div><span class="metric-label">Entry</span><span class="metric-value">{{ (liveShort.avg_entry || 0).toFixed(6) }}</span></div>
            <div><span class="metric-label">Stop</span><span class="metric-value">{{ liveShort.live_sl || '--' }}</span></div>
          </div>
          <div class="ladder-bar-outer">
            <div class="ladder-bar-inner short-bar" :style="{ width: filledPct(ladderShort) + '%' }"></div>
            <div class="ladder-bar-text">{{ ladderShort.consumed || 0 }}/{{ ladderShort.total || 0 }}</div>
          </div>
        </div>

        <!-- LONG side -->
        <div class="side-block long-side">
          <div class="side-header">
            <span class="side-label long-label">▲ LONG</span>
            <span :class="['side-pnl', calcPnl('long', liveLong) >= 0 ? 'green' : 'red']">
              ${{ calcPnl('long', liveLong).toFixed(2) }}
            </span>
          </div>
          <div class="side-metrics">
            <div><span class="metric-label">Qty</span><span class="metric-value">{{ Math.abs(liveLong.net_qty || 0).toFixed(4) || 'FLAT' }}</span></div>
            <div><span class="metric-label">Entry</span><span class="metric-value">{{ (liveLong.avg_entry || 0).toFixed(6) }}</span></div>
            <div><span class="metric-label">Stop</span><span class="metric-value">{{ liveLong.live_sl || '--' }}</span></div>
          </div>
          <div class="ladder-bar-outer">
            <div class="ladder-bar-inner long-bar" :style="{ width: filledPct(ladderLong) + '%' }"></div>
            <div class="ladder-bar-text">{{ ladderLong.consumed || 0 }}/{{ ladderLong.total || 0 }}</div>
          </div>
        </div>
      </div>

      <!-- ── SINGLE SIDE (legacy) ── -->
      <div v-else class="metrics">
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
        <div>
          <div class="metric-label">Daily P&L</div>
          <div class="metric-value" :class="(live.daily_pnl || 0) >= 0 ? 'green' : 'red'">
            ${{ (live.daily_pnl || 0).toFixed(2) }}
          </div>
        </div>
        <div class="ladder-bar-outer" style="grid-column: span 2">
          <div class="ladder-bar-inner" :style="{ width: filledPct(ladder) + '%' }"></div>
          <div class="ladder-bar-text">{{ ladder.consumed || 0 }}/{{ ladder.total || 0 }} filled</div>
        </div>
      </div>

      <div class="control-row">
        <button class="btn" @click="quickSeed">⚡ Seed</button>
        <button class="btn" @click="resetAllLadder">🔄 Reset</button>
        <button class="btn" @click="release">🔓 Release</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card { background: var(--card, #16213e); border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
.slot-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.slot-symbol { font-weight: bold; font-size: 15px; font-family: monospace; }
.mid-price { font-size: 12px; color: #8888aa; font-family: monospace; }
.slot-pnl { font-family: monospace; font-weight: bold; }
.slot-pnl.green { color: #00ff88; }
.slot-pnl.red   { color: #ff4757; }

/* Concurrent layout */
.concurrent-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
.side-block { background: rgba(255,255,255,0.04); border-radius: 8px; padding: 10px; }
.side-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.side-label { font-size: 11px; font-weight: bold; letter-spacing: 0.05em; }
.short-label { color: #ff4757; }
.long-label  { color: #00ff88; }
.side-pnl { font-size: 12px; font-family: monospace; font-weight: bold; }
.side-metrics { display: flex; flex-direction: column; gap: 3px; margin-bottom: 6px; }
.side-metrics > div { display: flex; justify-content: space-between; }

/* Single-side grid */
.metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }

/* Shared */
.metric-label { font-size: 10px; color: #8888aa; text-transform: uppercase; }
.metric-value { font-size: 13px; font-weight: bold; font-family: monospace; }
.green { color: #00ff88; }
.red   { color: #ff4757; }

.ladder-bar-outer { background: rgba(255,255,255,0.1); border-radius: 6px; height: 18px; overflow: hidden; position: relative; margin-top: 4px; }
.ladder-bar-inner { height: 100%; transition: width 0.5s; }
.ladder-bar-inner.short-bar { background: linear-gradient(90deg, #ff4757, #ff6b81); }
.ladder-bar-inner.long-bar  { background: linear-gradient(90deg, #00ff88, #00d4ff); }
.ladder-bar-inner:not(.short-bar):not(.long-bar) { background: linear-gradient(90deg, #00ff88, #00d4ff); }
.ladder-bar-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 10px; font-weight: bold; color: white; text-shadow: 0 0 4px black; }

.control-row { display: flex; gap: 6px; margin-top: 8px; }
.btn { flex: 1; padding: 8px; border: none; border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer; color: #fff; background: #3742fa; }
.btn:active { transform: scale(0.97); }
</style>