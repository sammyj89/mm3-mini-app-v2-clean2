<template>
  <div class="drill-down-container">
    <div class="drill-header">
      <h2>{{ formatSymbol(symbol) }} Details</h2>
      <button @click="$emit('back')" class="btn-back">← Back</button>
    </div>

    <div v-if="!slotData" class="empty-state">Loading slot data...</div>
    
    <div v-else class="dual-detail">
      <!-- SHORT DETAILS -->
      <div class="detail-column short-col">
        <h3>🔻 Short Side</h3>
        <div v-if="slotData.live?.short_qty > 0" class="data-rows">
          <div class="row"><span class="label">Quantity:</span> <span class="value">{{ slotData.live.short_qty }}</span></div>
          <div class="row"><span class="label">Avg Entry:</span> <span class="value">{{ slotData.live.short_avg }}</span></div>
          <div class="row"><span class="label">Stop Loss:</span> <span class="value sl-value">{{ slotData.live.short_sl || 'None' }}</span></div>
          <div class="row">
            <span class="label">Unrealized PnL:</span> 
            <span class="value" :class="shortPnl >= 0 ? 'positive' : 'negative'">{{ shortPnl >= 0 ? '+' : '' }}${{ shortPnl.toFixed(2) }}</span>
          </div>
          
          <div class="ladder-section">
            <div class="row">
              <span class="label">Ladder Filled:</span> 
              <span class="value">{{ slotData.ladder_short?.consumed || 0 }} / {{ slotData.ladder_short?.total || 0 }}</span>
            </div>
            <div class="ladder-bar-container">
              <div class="ladder-bar-fill short-fill" :style="{ width: fillPercent(slotData.ladder_short) + '%' }"></div>
            </div>
            <div class="ladder-notional">Notional: ${{ slotData.ladder_short?.filled_notional_usd || 0 }}</div>
          </div>
          
          <div class="action-buttons">
            <button @click="loadLadderDetail('short')" class="btn-sm btn-primary">📊 Levels</button>
            <button @click="resetLadder('short')" class="btn-sm btn-warning">🔄 Reset Ladder</button>
            <button @click="releaseSide('short')" class="btn-sm btn-danger">🔓 Close Short</button>
          </div>
        </div>
        <div v-else class="flat-state">FLAT (Waiting for seed...)</div>
      </div>

      <!-- LONG DETAILS -->
      <div class="detail-column long-col">
        <h3>🔺 Long Side</h3>
        <div v-if="slotData.live?.long_qty > 0" class="data-rows">
          <div class="row"><span class="label">Quantity:</span> <span class="value">{{ slotData.live.long_qty }}</span></div>
          <div class="row"><span class="label">Avg Entry:</span> <span class="value">{{ slotData.live.long_avg }}</span></div>
          <div class="row"><span class="label">Stop Loss:</span> <span class="value sl-value">{{ slotData.live.long_sl || 'None' }}</span></div>
          <div class="row">
            <span class="label">Unrealized PnL:</span> 
            <span class="value" :class="longPnl >= 0 ? 'positive' : 'negative'">{{ longPnl >= 0 ? '+' : '' }}${{ longPnl.toFixed(2) }}</span>
          </div>
          
          <div class="ladder-section">
            <div class="row">
              <span class="label">Ladder Filled:</span> 
              <span class="value">{{ slotData.ladder_long?.consumed || 0 }} / {{ slotData.ladder_long?.total || 0 }}</span>
            </div>
            <div class="ladder-bar-container">
              <div class="ladder-bar-fill long-fill" :style="{ width: fillPercent(slotData.ladder_long) + '%' }"></div>
            </div>
            <div class="ladder-notional">Notional: ${{ slotData.ladder_long?.filled_notional_usd || 0 }}</div>
          </div>

          <div class="action-buttons">
            <button @click="loadLadderDetail('long')" class="btn-sm btn-primary">📊 Levels</button>
            <button @click="resetLadder('long')" class="btn-sm btn-warning">🔄 Reset Ladder</button>
            <button @click="releaseSide('long')" class="btn-sm btn-danger">🔓 Close Long</button>
          </div>
        </div>
        <div v-else class="flat-state">FLAT (Waiting for seed...)</div>
      </div>
    </div>

    <!-- Release BOTH sides -->
    <div class="release-both-section">
      <button @click="releaseBoth" class="btn-release-both">🔓 Close ALL Positions & Release Slot</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { apiGet, apiPost } from '../services/api'

const props = defineProps({
  symbol: String,
  slotData: Object
})

defineEmits(['back'])

const formatSymbol = (sym) => sym ? sym.split(':')[0] : ''

const fillPercent = (ladder) => {
  if (!ladder || ladder.total === 0) return 0
  return (ladder.consumed / ladder.total) * 100
}

// Computed PnL
const shortPnl = computed(() => {
  const d = props.slotData?.live
  if (!d || !d.short_qty || !d.short_avg || !d.mid) return 0
  return (d.short_avg - d.mid) * d.short_qty
})

const longPnl = computed(() => {
  const d = props.slotData?.live
  if (!d || !d.long_qty || !d.long_avg || !d.mid) return 0
  return (d.mid - d.long_avg) * d.long_qty
})

// Actions
const loadLadderDetail = async (side) => {
  try {
    const res = await apiGet('/api/ladder_detail', { symbol: props.symbol, side })
    const levels = res.data?.levels || []
    if (levels.length === 0) {
      alert(`No ${side} ladder levels found.`)
      return
    }
    const levelStr = levels.map(l => `Lvl ${l.level}: ${l.price} ${l.filled ? '✅' : '⬜'}`).join('\n')
    alert(`${side.toUpperCase()} Ladder Levels:\n\n${levelStr}`)
  } catch (err) {
    alert(`Failed to load ladder: ${err.message}`)
  }
}

const resetLadder = async (side) => {
  if (!confirm(`Reset ${side} ladder for ${formatSymbol(props.symbol)}?`)) return
  try {
    await apiPost('/api/ladder/reset', { symbol: props.symbol, mode: 'remaining' })
    alert(`${side} ladder reset requested.`)
  } catch (err) {
    alert(`Reset failed: ${err.message}`)
  }
}

const releaseSide = async (side) => {
  if (!confirm(`Close ${side} position for ${formatSymbol(props.symbol)}? The other side will remain open.`)) return
  try {
    await apiPost('/api/release_side', { symbol: props.symbol, side })
    alert(`${side} position closed.`)
  } catch (err) {
    alert(`Failed to close ${side}: ${err.message}`)
  }
}

const releaseBoth = async () => {
  if (!confirm(`Release entire slot ${formatSymbol(props.symbol)}? This closes BOTH sides.`)) return
  try {
    await apiPost('/api/release_slot', { symbol: props.symbol })
    alert('Slot released.')
  } catch (err) {
    alert(`Failed to release: ${err.message}`)
  }
}
</script>

<style scoped>
.drill-down-container { padding: 16px; }

.drill-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
h2 { color: #e0e0e0; margin: 0; }
.btn-back { background: #2a2a4a; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }

.dual-detail { display: flex; gap: 16px; }
.detail-column { flex: 1; background: #16213e; padding: 16px; border-radius: 8px; border-top: 4px solid; }
.short-col { border-color: #ff4444; }
.long-col { border-color: #00d4ff; }

h3 { margin-top: 0; font-size: 16px; color: #e0e0e0; border-bottom: 1px solid #2a2a4a; padding-bottom: 8px; margin-bottom: 12px; }

.data-rows { display: flex; flex-direction: column; gap: 10px; }
.row { display: flex; justify-content: space-between; font-size: 13px; border-bottom: 1px solid #1a1a2e; padding-bottom: 4px; }
.label { color: #a0a0a0; }
.value { color: #fff; font-weight: bold; font-family: monospace; }
.sl-value { color: #ff9900; }
.positive { color: #00ff88; }
.negative { color: #ff4444; }

.ladder-section { margin-top: 12px; padding-top: 12px; border-top: 1px dashed #2a2a4a; }
.ladder-bar-container { height: 8px; background: #2a2a4a; border-radius: 4px; overflow: hidden; margin-top: 4px; }
.ladder-bar-fill { height: 100%; transition: width 0.3s ease; }
.short-fill { background: #ff4444; }
.long-fill { background: #00d4ff; }
.ladder-notional { font-size: 11px; color: #a0a0a0; margin-top: 4px; }

.action-buttons { display: flex; flex-direction: column; gap: 6px; margin-top: 16px; }
.btn-sm { padding: 8px; border-radius: 6px; border: none; cursor: pointer; font-weight: bold; font-size: 12px; width: 100%; }
.btn-primary { background: #2a2a4a; color: #00d4ff; }
.btn-warning { background: #2a2a1a; color: #ffaa00; border: 1px solid #ffaa00; }
.btn-danger { background: #3a1a1a; color: #ff4444; border: 1px solid #ff4444; }

.flat-state { color: #555; font-style: italic; text-align: center; padding: 40px 0; font-size: 14px; }
.empty-state { color: #666; text-align: center; padding: 40px; background: #16213e; border-radius: 8px; }

.release-both-section { margin-top: 24px; padding-top: 16px; border-top: 2px solid #2a2a4a; text-align: center; }
.btn-release-both { padding: 12px 24px; background: transparent; color: #ff4444; border: 2px solid #ff4444; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 14px; }
.btn-release-both:hover { background: #ff4444; color: #fff; }
</style>