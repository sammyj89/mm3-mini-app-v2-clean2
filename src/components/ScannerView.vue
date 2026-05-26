<template>
  <div class="scanner-view">
    <!-- SCANNER SECTION -->
    <div class="section">
      <div class="section-header">
        <h2>🔍 Screener</h2>
        <button @click="runScreener" class="btn-run" :disabled="screenerLoading">
          {{ screenerLoading ? 'Running...' : 'Run Scan' }}
        </button>
      </div>
      <div v-if="screenerPicks.length > 0" class="screener-list">
        <div v-for="pick in screenerPicks" :key="pick.symbol" class="screener-item">
          <span class="pick-symbol">{{ formatSymbol(pick.symbol) }}</span>
          <span class="pick-score">{{ pick.score?.toFixed(1) || '-' }}</span>
          <button @click="rotateToSymbol(pick.symbol)" class="btn-rotate-small">Rotate In</button>
        </div>
      </div>
      <div v-else class="empty-state-small">No screener data. Click Run Scan.</div>
    </div>

    <hr class="divider" />

    <!-- ACTIVE SLOTS SECTION -->
    <div class="section">
      <h2>Active Slots</h2>
      
      <div v-if="!activeSlots || Object.keys(activeSlots).length === 0" class="empty-state">
        Loading slots or no active symbols...
      </div>

      <div v-else class="slots-grid">
        <div 
          v-for="(slot, symbol) in activeSlots" 
          :key="symbol" 
          class="slot-card"
          @click="$emit('select-symbol', symbol)"
        >
          <div class="slot-header">
            <h3 class="symbol-name">{{ formatSymbol(symbol) }}</h3>
            <div class="header-actions" @click.stop>
              <button @click="rotateSlot(symbol)" class="btn-action btn-rotate">🔄 Rotate</button>
              <button @click="releaseSlot(symbol)" class="btn-action btn-release">🔓 Release</button>
            </div>
          </div>

          <div class="dual-status">
            <!-- SHORT SIDE -->
            <div class="side-block short-block">
              <div class="side-title">🔻 SHORT</div>
              <div v-if="slot.live?.short_qty > 0" class="side-data">
                <div class="pnl" :class="pnlClass(slot.live.short_qty, slot.live.short_avg, slot.live.mid, 'short')">
                  {{ formatPnl(slot.live.short_qty, slot.live.short_avg, slot.live.mid, 'short') }}
                </div>
                <div class="ladder-bar-container">
                  <div class="ladder-bar-fill short-fill" :style="{ width: fillPercent(slot.ladder_short) + '%' }"></div>
                </div>
                <div class="ladder-text">{{ slot.ladder_short?.consumed || 0 }}/{{ slot.ladder_short?.total || 0 }} lvl</div>
              </div>
              <div v-else class="flat-state">FLAT</div>
            </div>

            <!-- LONG SIDE -->
            <div class="side-block long-block">
              <div class="side-title">🔺 LONG</div>
              <div v-if="slot.live?.long_qty > 0" class="side-data">
                <div class="pnl" :class="pnlClass(slot.live.long_qty, slot.live.long_avg, slot.live.mid, 'long')">
                  {{ formatPnl(slot.live.long_qty, slot.live.long_avg, slot.live.mid, 'long') }}
                </div>
                <div class="ladder-bar-container">
                  <div class="ladder-bar-fill long-fill" :style="{ width: fillPercent(slot.ladder_long) + '%' }"></div>
                </div>
                <div class="ladder-text">{{ slot.ladder_long?.consumed || 0 }}/{{ slot.ladder_long?.total || 0 }} lvl</div>
              </div>
              <div v-else class="flat-state">FLAT</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiGet, apiPost, apiPostQuery } from '../services/api'

defineProps({
  activeSlots: {
    type: Object,
    default: () => ({})
  }
})

defineEmits(['select-symbol'])

const screenerPicks = ref([])
const screenerLoading = ref(false)

onMounted(async () => {
  try {
    const res = await apiGet('/api/screener_top5')
    if (res.success && res.data) {
      screenerPicks.value = res.data.picks || res.data || []
    }
  } catch (e) { console.warn('Failed to load screener data') }
})

const runScreener = async () => {
  screenerLoading.value = true
  try {
    const res = await apiPost('/api/run_screener')
    if (res.success && res.data) {
      screenerPicks.value = res.data.picks || res.data || []
    }
  } catch (err) {
    alert(`Screener failed: ${err.message}`)
  } finally {
    screenerLoading.value = false
  }
}

const formatSymbol = (sym) => sym ? sym.split(':')[0] : ''

const fillPercent = (ladder) => {
  if (!ladder || ladder.total === 0) return 0
  return (ladder.consumed / ladder.total) * 100
}

const formatPnl = (qty, avg, mid, side) => {
  if (!qty || qty <= 0 || !avg || !mid) return '$0.00'
  let pnl = side === 'short' ? (avg - mid) * qty : (mid - avg) * qty
  return `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`
}

const pnlClass = (qty, avg, mid, side) => {
  if (!qty || qty <= 0 || !avg || !mid) return ''
  let pnl = side === 'short' ? (avg - mid) * qty : (mid - avg) * qty
  return pnl >= 0 ? 'positive' : 'negative'
}

const releaseSlot = async (symbol) => {
  if (!confirm(`Release ${formatSymbol(symbol)}?`)) return
  try {
    await apiPost('/api/release_slot', { symbol })
    alert('Slot released.')
  } catch (err) { alert(`Failed: ${err.message}`) }
}

const rotateSlot = async (oldSymbol) => {
  const newSymbol = prompt(`Enter new symbol to rotate into:`)
  if (!newSymbol) return
  try {
    await apiPostQuery('/api/rotate_symbol', { old: oldSymbol, new: newSymbol })
    alert('Rotation started.')
  } catch (err) { alert(`Failed: ${err.message}`) }
}

const rotateToSymbol = async (newSymbol) => {
  // Find the first active slot to replace
  const propsData = defineProps
  const currentSlots = Object.keys({{ activeSlots }}) // Hacky, better to pass activeSlots keys
  // Simplest: prompt user which slot to replace
  const oldSymbol = prompt(`Which slot to replace? (e.g. STABLE/USDT:USDT)`)
  if (!oldSymbol) return
  try {
    await apiPostQuery('/api/rotate_symbol', { old: oldSymbol, new: newSymbol })
    alert('Rotation started.')
  } catch (err) { alert(`Failed: ${err.message}`) }
}
</script>

<style scoped>
.scanner-view { padding: 0; }
.section { margin-bottom: 20px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
h2 { color: #e0e0e0; margin: 0; font-size: 18px; }

.btn-run { padding: 8px 16px; background: #00d4ff; color: #000; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; }
.btn-run:disabled { opacity: 0.5; }

.screener-list { display: flex; flex-direction: column; gap: 6px; }
.screener-item { display: flex; justify-content: space-between; align-items: center; background: #16213e; padding: 8px 12px; border-radius: 6px; }
.pick-symbol { font-weight: bold; color: #fff; }
.pick-score { color: #a0a0a0; font-size: 12px; }
.btn-rotate-small { padding: 4px 10px; background: #2a2a4a; color: #00d4ff; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; }

.empty-state-small { color: #555; font-size: 12px; text-align: center; padding: 12px; background: #16213e; border-radius: 6px; }
.empty-state { color: #666; text-align: center; padding: 40px; background: #16213e; border-radius: 8px; }

.divider { border: 0; border-top: 1px solid #2a2a4a; margin: 20px 0; }

.slots-grid { display: flex; flex-direction: column; gap: 12px; }
.slot-card { background: #1a1a2e; border-radius: 12px; padding: 16px; border: 1px solid #2a2a4a; cursor: pointer; transition: border-color 0.2s; }
.slot-card:hover { border-color: #00d4ff; }
.slot-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.symbol-name { margin: 0; color: #fff; font-size: 16px; font-weight: bold; }
.header-actions { display: flex; gap: 6px; }
.btn-action { padding: 4px 10px; border-radius: 4px; border: none; cursor: pointer; font-size: 11px; font-weight: bold; }
.btn-rotate { background: #2a2a4a; color: #00d4ff; }
.btn-release { background: #3a1a1a; color: #ff4444; }

.dual-status { display: flex; gap: 10px; }
.side-block { flex: 1; background: #16213e; padding: 10px; border-radius: 6px; border-top: 2px solid; }
.short-block { border-color: #ff4444; }
.long-block { border-color: #00d4ff; }
.side-title { font-size: 10px; font-weight: bold; color: #a0a0a0; margin-bottom: 6px; text-transform: uppercase; }
.side-data { display: flex; flex-direction: column; gap: 4px; }
.pnl { font-size: 16px; font-weight: bold; font-family: monospace; }
.pnl.positive { color: #00ff88; } .pnl.negative { color: #ff4444; }
.ladder-bar-container { height: 4px; background: #2a2a4a; border-radius: 2px; overflow: hidden; }
.ladder-bar-fill { height: 100%; transition: width 0.3s ease; }
.short-fill { background: #ff4444; } .long-fill { background: #00d4ff; }
.ladder-text { font-size: 9px; color: #a0a0a0; text-align: right; }
.flat-state { color: #444; font-style: italic; text-align: center; padding: 8px 0; font-size: 11px; }
</style>