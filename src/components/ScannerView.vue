<template>
  <div class="scanner-view">
    <h2>Active Slots</h2>
    
    <div v-if="!slots || Object.keys(slots).length === 0" class="empty-state">
      Loading slots or no active symbols...
    </div>

    <div v-else class="slots-grid">
      <div 
        v-for="(slot, symbol) in slots" 
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
</template>

<script setup>
import { apiPost, apiPostQuery } from '../services/api'

defineProps({
  slots: {
    type: Object,
    default: () => ({})
  }
})

defineEmits(['select-symbol'])

const formatSymbol = (sym) => {
  return sym ? sym.split(':')[0] : ''
}

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
  if (!confirm(`Release ${formatSymbol(symbol)}? This will close positions and free the slot.`)) return
  try {
    await apiPost('/api/release_slot', { symbol })
    alert('Slot released successfully.')
  } catch (err) {
    alert(`Failed to release: ${err.message}`)
  }
}

const rotateSlot = async (oldSymbol) => {
  const newSymbol = prompt(`Enter new symbol to rotate into (e.g., BTC/USDT:USDT):`)
  if (!newSymbol) return
  
  try {
    await apiPostQuery('/api/rotate_symbol', { old: oldSymbol, new: newSymbol })
    alert('Rotation started.')
  } catch (err) {
    alert(`Failed to rotate: ${err.message}`)
  }
}
</script>

<style scoped>
.scanner-view {
  padding: 16px;
}

h2 {
  color: #e0e0e0;
  margin-bottom: 16px;
}

.empty-state {
  color: #666;
  text-align: center;
  padding: 40px;
  background: #16213e;
  border-radius: 8px;
}

.slots-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.slot-card {
  background: #1a1a2e;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #2a2a4a;
  cursor: pointer;
  transition: border-color 0.2s;
}

.slot-card:hover {
  border-color: #00d4ff;
}

.slot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.symbol-name { 
  margin: 0; 
  color: #fff; 
  font-size: 18px; 
  font-weight: bold;
}

.header-actions { 
  display: flex; 
  gap: 8px; 
}

.btn-action {
  padding: 6px 12px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: bold;
  transition: filter 0.2s;
}

.btn-action:hover {
  filter: brightness(1.2);
}

.btn-rotate { background: #2a2a4a; color: #00d4ff; }
.btn-release { background: #3a1a1a; color: #ff4444; }

.dual-status {
  display: flex;
  gap: 12px;
}

.side-block {
  flex: 1;
  background: #16213e;
  padding: 12px;
  border-radius: 8px;
  border-top: 3px solid;
}

.short-block { border-color: #ff4444; }
.long-block { border-color: #00d4ff; }

.side-title { 
  font-size: 11px; 
  font-weight: bold; 
  color: #a0a0a0; 
  margin-bottom: 8px;
  text-transform: uppercase;
}

.side-data {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pnl { 
  font-size: 18px; 
  font-weight: bold; 
  font-family: monospace;
}

.pnl.positive { color: #00ff88; }
.pnl.negative { color: #ff4444; }

.ladder-bar-container {
  height: 6px;
  background: #2a2a4a;
  border-radius: 3px;
  overflow: hidden;
}

.ladder-bar-fill { 
  height: 100%; 
  transition: width 0.3s ease;
}

.short-fill { background: #ff4444; }
.long-fill { background: #00d4ff; }

.ladder-text { 
  font-size: 10px; 
  color: #a0a0a0; 
  text-align: right; 
}

.flat-state {
  color: #555;
  font-style: italic;
  text-align: center;
  padding: 12px 0;
  font-size: 12px;
}
</style>