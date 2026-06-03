<script setup>
import { computed } from 'vue'
import { apiGet, apiPost } from '../services/api'

const props = defineProps({ symbol: String, slotData: Object })
defineEmits(['back'])

const formatSymbol = (sym) => sym ? sym.split(':')[0] : ''

const fillPercent = (ladder) => {
  if (!ladder || ladder.total === 0) return 0
  return (ladder.consumed / ladder.total) * 100
}

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

const loadLadderDetail = async (side) => {
  try {
    const res = await apiGet('/api/ladder_detail', { symbol: props.symbol, side })
    const levels = res.data?.levels || []
    if (levels.length === 0) { alert(`No ${side} ladder levels found.`); return }
    const levelStr = levels.map(l => `Lvl ${l.level}: ${l.price} ${l.filled ? '✅' : '⬜'}`).join('\n')
    alert(`${side.toUpperCase()} Ladder Levels:\n\n${levelStr}`)
  } catch (err) { alert(`Failed: ${err.message}`) }
}

const resetLadder = async (side) => {
  if (!confirm(`Reset ${side} ladder for ${formatSymbol(props.symbol)}?`)) return
  try {
    await apiPost('/api/ladder/reset', { symbol: props.symbol, mode: 'remaining' })
    alert(`${side} ladder reset requested.`)
  } catch (err) { alert(`Reset failed: ${err.message}`) }
}

const releaseSide = async (side) => {
  if (!confirm(`Close ${side} position for ${formatSymbol(props.symbol)}?`)) return
  try {
    await apiPost('/api/release_side', { symbol: props.symbol, side })
    alert(`${side} position closed.`)
  } catch (err) { alert(`Failed: ${err.message}`) }
}

const releaseBoth = async () => {
  if (!confirm(`Release entire slot ${formatSymbol(props.symbol)}?`)) return
  try {
    await apiPost('/api/release_slot', { symbol: props.symbol })
    alert('Slot released.')
  } catch (err) { alert(`Failed: ${err.message}`) }
}
</script>

<template>
  <div class="slot-detail">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold">{{ formatSymbol(symbol) }}</h2>
      <button @click="$emit('back')" class="btn btn-sm btn-ghost">← Back</button>
    </div>

    <div v-if="!slotData" class="empty-state">Loading slot data…</div>

    <div v-else class="detail-grid" :class="{ 'single-side': slotData.preferred_side }">
      <!-- Short -->
      <div v-if="!slotData.preferred_side || slotData.preferred_side !== 'long'" class="detail-card detail-card--short">
        <div class="detail-card__header">
          <h3 class="detail-card__title">🔻 Short</h3>
        </div>
        <div v-if="slotData.live?.short_qty > 0" class="detail-body">
          <div class="detail-row"><span class="text-secondary text-sm">Qty</span><span class="font-mono font-bold">{{ slotData.live.short_qty }}</span></div>
          <div class="detail-row"><span class="text-secondary text-sm">Avg Entry</span><span class="font-mono font-bold">{{ slotData.live.short_avg }}</span></div>
          <div class="detail-row"><span class="text-secondary text-sm">Stop Loss</span><span class="font-mono font-bold text-warning">{{ slotData.live.short_sl || 'None' }}</span></div>
          <div class="detail-row">
            <span class="text-secondary text-sm">Unrealized</span>
            <span :class="['font-mono font-bold', shortPnl >= 0 ? 'text-success' : 'text-danger']">
              {{ shortPnl >= 0 ? '+' : '' }}${{ shortPnl.toFixed(2) }}
            </span>
          </div>
          <div class="detail-section">
            <div class="detail-row"><span class="text-secondary text-sm">Ladder</span><span class="font-mono">{{ slotData.ladder_short?.consumed || 0 }}/{{ slotData.ladder_short?.total || 0 }}</span></div>
            <div class="progress-bar">
              <div class="progress-fill progress-fill-danger" :style="{ width: fillPercent(slotData.ladder_short) + '%' }"></div>
            </div>
            <span class="text-xs text-muted">Notional: ${{ slotData.ladder_short?.filled_notional_usd || 0 }}</span>
          </div>
          <div class="detail-actions">
            <button @click="loadLadderDetail('short')" class="btn btn-sm btn-secondary">📊 Levels</button>
            <button @click="resetLadder('short')" class="btn btn-sm btn-ghost">🔄 Reset</button>
            <button @click="releaseSide('short')" class="btn btn-sm btn-danger">🔓 Close</button>
          </div>
        </div>
        <div v-else class="empty-state text-sm">FLAT — waiting for seed</div>
      </div>

      <!-- Long -->
      <div v-if="!slotData.preferred_side || slotData.preferred_side !== 'short'" class="detail-card detail-card--long">
        <div class="detail-card__header">
          <h3 class="detail-card__title">🔺 Long</h3>
        </div>
        <div v-if="slotData.live?.long_qty > 0" class="detail-body">
          <div class="detail-row"><span class="text-secondary text-sm">Qty</span><span class="font-mono font-bold">{{ slotData.live.long_qty }}</span></div>
          <div class="detail-row"><span class="text-secondary text-sm">Avg Entry</span><span class="font-mono font-bold">{{ slotData.live.long_avg }}</span></div>
          <div class="detail-row"><span class="text-secondary text-sm">Stop Loss</span><span class="font-mono font-bold text-warning">{{ slotData.live.long_sl || 'None' }}</span></div>
          <div class="detail-row">
            <span class="text-secondary text-sm">Unrealized</span>
            <span :class="['font-mono font-bold', longPnl >= 0 ? 'text-success' : 'text-danger']">
              {{ longPnl >= 0 ? '+' : '' }}${{ longPnl.toFixed(2) }}
            </span>
          </div>
          <div class="detail-section">
            <div class="detail-row"><span class="text-secondary text-sm">Ladder</span><span class="font-mono">{{ slotData.ladder_long?.consumed || 0 }}/{{ slotData.ladder_long?.total || 0 }}</span></div>
            <div class="progress-bar">
              <div class="progress-fill progress-fill-accent" :style="{ width: fillPercent(slotData.ladder_long) + '%' }"></div>
            </div>
            <span class="text-xs text-muted">Notional: ${{ slotData.ladder_long?.filled_notional_usd || 0 }}</span>
          </div>
          <div class="detail-actions">
            <button @click="loadLadderDetail('long')" class="btn btn-sm btn-secondary">📊 Levels</button>
            <button @click="resetLadder('long')" class="btn btn-sm btn-ghost">🔄 Reset</button>
            <button @click="releaseSide('long')" class="btn btn-sm btn-danger">🔓 Close</button>
          </div>
        </div>
        <div v-else class="empty-state text-sm">FLAT — waiting for seed</div>
      </div>
    </div>

    <div class="release-all">
      <button @click="releaseBoth" class="btn btn-danger btn-block">🔓 Close ALL & Release Slot</button>
    </div>
  </div>
</template>

<style scoped>
.slot-detail { padding-bottom: var(--space-4); }
.detail-grid { display: flex; gap: var(--space-3); }
.detail-grid.single-side { justify-content: center; }
.detail-grid.single-side .detail-card { max-width: 320px; }

.detail-card {
  flex: 1;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: border-color var(--transition-base);
}
.detail-card--short { border-top: 3px solid var(--danger); }
.detail-card--long { border-top: 3px solid var(--accent); }

.detail-card__header {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
}
.detail-card__title { margin: 0; font-size: var(--text-sm); font-weight: 700; color: var(--text-primary); }

.detail-body { padding: var(--space-3) var(--space-4); display: flex; flex-direction: column; gap: var(--space-2); }
.detail-row { display: flex; justify-content: space-between; align-items: center; }

.detail-section {
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px dashed var(--border);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.detail-actions { display: flex; flex-direction: column; gap: var(--space-2); margin-top: var(--space-3); }

.release-all {
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border);
}
</style>
