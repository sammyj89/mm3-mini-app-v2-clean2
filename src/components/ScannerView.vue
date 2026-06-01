<template>
  <div class="scanner-view">
    <!-- SCREENER SECTION -->
    <div class="section">
      <div class="section-header">
        <h2>🔍 Screener</h2>
        <button @click="runScreener" class="btn-run" :disabled="screenerLoading">
          {{ screenerLoading ? 'Running...' : 'Run Scan' }}
        </button>
      </div>
      <div v-if="screenerPicks.length > 0" class="screener-list">
        <!-- Free slot badge -->
        <div v-if="freeSlotCount > 0" class="free-slot-hint">
          ✅ {{ freeSlotCount }} free slot{{ freeSlotCount > 1 ? 's' : '' }} available — tap ➕ to add a pair
        </div>
        <div v-for="pick in screenerPicks" :key="pick.symbol" class="screener-item">
          <div class="pick-info">
            <span class="pick-symbol">{{ formatSymbol(pick.symbol) }}</span>
            <span class="pick-score">Score: {{ pick.score?.toFixed(1) || '-' }}</span>
            <span v-if="pick.preferred_side" class="pick-side" :class="pick.preferred_side">
              {{ pick.preferred_side === 'short' ? '🔴 SHORT' : '🟢 LONG' }}
            </span>
          </div>
          <div class="slot-buttons">
            <!-- ➕ Free slot button — shown when slots < MAX -->
            <button
              v-if="freeSlotCount > 0"
              @click="addToFreeSlot(pick.symbol)"
              class="btn-slot btn-add"
              :disabled="addingSymbol === pick.symbol"
            >
              {{ addingSymbol === pick.symbol ? '⏳' : '➕' }}
            </button>
            <!-- Rotate into existing slots -->
            <button
              v-for="(sym, idx) in slotList"
              :key="idx"
              @click="rotateSlot(sym, pick.symbol)"
              class="btn-slot"
              :disabled="rotatingSlot === sym"
            >
              {{ rotatingSlot === sym ? '⏳' : `Slot ${idx + 1}` }}
            </button>
          </div>
        </div>
      </div>
      <div v-else class="empty-state-small">No screener data. Click Run Scan.</div>
    </div>

    <!-- 🆕 CUSTOM ROTATE SECTION -->
    <div class="section custom-rotate-section">
      <h3>➕ Custom Rotate</h3>
      <div class="custom-rotate-controls">
        <input
          v-model="customSymbol"
          placeholder="Enter symbol, e.g. BTC"
          class="custom-input"
          @keyup.enter="rotateCustomToSlot"
        />
        <select v-model="selectedSlotSymbol" class="slot-select">
          <option v-for="sym in slotList" :key="sym" :value="sym">
            {{ formatSymbol(sym) }}
          </option>
        </select>
        <button
          @click="rotateCustomToSlot"
          class="btn-rotate-custom"
          :disabled="!customSymbol.trim() || !selectedSlotSymbol"
        >
          Rotate
        </button>
      </div>
      <div v-if="slotList.length === 0" class="empty-state-small">
        No active slots available to rotate into.
      </div>
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
          v-for="(slot, symbol) in activeSlotsWithPref"
          :key="symbol"
          class="slot-card"
          @click="$emit('select-symbol', symbol)"
        >
          <div class="slot-header">
            <h3 class="symbol-name">
              {{ formatSymbol(symbol) }}
              <span v-if="!slot.bidirectional && slot.preferred_side" class="pref-pill" :class="slot.preferred_side">
                {{ slot.preferred_side === 'short' ? 'SHORT ONLY' : 'LONG ONLY' }}
              </span>
            </h3>
            <div class="header-actions" @click.stop>
              <button @click="rotateSlotPrompt(symbol)" class="btn-action btn-rotate" :disabled="rotatingSlot === symbol">
                {{ rotatingSlot === symbol ? '⏳ Rotating...' : '🔄 Rotate' }}
              </button>
              <button @click="releaseSlot(symbol)" class="btn-action btn-release">🔓 Release</button>
            </div>
          </div>

          <div class="dual-status" :class="{ 'single-side': !slot.bidirectional && slot.preferred_side }">
            <!-- SHORT SIDE (show unless unidirectional + preferred LONG) -->
            <div
              v-if="slot.bidirectional || slot.preferred_side !== 'long' || slot.live?.short_qty > 0"
              class="side-block short-block"
            >
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

            <!-- LONG SIDE (show unless unidirectional + preferred SHORT) -->
            <div
              v-if="slot.bidirectional || slot.preferred_side !== 'short' || slot.live?.long_qty > 0"
              class="side-block long-block"
            >
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
import { ref, onMounted, computed, watch } from 'vue'
import { apiGet, apiPost, apiPostQuery } from '../services/api'

const props = defineProps({
  activeSlots: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['select-symbol', 'refresh'])

const screenerPicks = ref([])
const screenerLoading = ref(false)
const rotatingSlot = ref('') // tracks which slot is currently rotating

// NEW: Bidirectional mode
const bidirectionalMode = ref(true)

// Custom rotate state
const customSymbol = ref('')
const selectedSlotSymbol = ref(null)

const MAX_SLOTS = 3

// Computed list of active slot symbols for the buttons
const slotList = computed(() => Object.keys(props.activeSlots))

// Map of display symbol -> raw symbol key (with exchange suffix)
const preferredSides = ref({})

const activeSlotsWithPref = computed(() => {
  const merged = {}
  Object.entries(props.activeSlots).forEach(([rawKey, data]) => {
    const isBidirectional = data.bidirectional !== undefined ? data.bidirectional : bidirectionalMode.value
    merged[rawKey] = {
      ...data,
      preferred_side: preferredSides.value[rawKey] || data.preferred_side || null,
      bidirectional: isBidirectional,
    }
  })
  return merged
})

// How many free slots are available
const freeSlotCount = computed(() => Math.max(0, MAX_SLOTS - slotList.value.length))

const loadStatusMeta = async () => {
  try {
    const res = await apiGet('/api/status_all')
    if (res.success && res.data) {
      const pref = {}
      Object.entries(res.data).forEach(([rawKey, payload]) => {
        if (payload?.preferred_side) {
          pref[rawKey] = payload.preferred_side
        }
      })
      preferredSides.value = pref
    }
  } catch (err) {
    console.warn('Failed to load status metadata', err)
  }
}

onMounted(async () => {
  try {
    const [screenerRes, riskRes] = await Promise.all([
      apiGet('/api/screener_top5'),
      apiGet('/api/risk_status'),
    ])
    if (screenerRes.success && screenerRes.data) {
      screenerPicks.value = screenerRes.data.picks || screenerRes.data || []
    }
    if (riskRes.success && riskRes.data) {
      bidirectionalMode.value = riskRes.data.bidirectional
    }
    await loadStatusMeta()
  } catch { console.warn('Failed to load data') }
})

// Add screener pick directly into a free slot
const addingSymbol = ref('') // tracks which symbol is being added
const addToFreeSlot = async (symbol) => {
  if (!confirm(`Add ${formatSymbol(symbol)} to a new slot?`)) return
  addingSymbol.value = symbol
  try {
    await apiPost('/api/symbol', { symbol })
    alert(`${formatSymbol(symbol)} added successfully.`)
    emit('refresh')
  } catch (err) {
    alert(`Failed to add: ${errorMsg(err)}`)
  } finally {
    addingSymbol.value = ''
  }
}

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

const preferredSideFor = (rawSymbol) => {
  return preferredSides.value[rawSymbol] || null
}

const fillPercent = (ladder) => {
  if (!ladder || ladder.total === 0) return 0
  return (ladder.consumed / ladder.total) * 100
}

const formatPnl = (qty, avg, mid, side) => {
  if (!qty || qty <= 0 || !avg || !mid) return '$0.00'
  const pnl = side === 'short' ? (avg - mid) * qty : (mid - avg) * qty
  return `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`
}

const pnlClass = (qty, avg, mid, side) => {
  if (!qty || qty <= 0 || !avg || !mid) return ''
  const pnl2 = side === 'short' ? (avg - mid) * qty : (mid - avg) * qty
  return pnl2 >= 0 ? 'positive' : 'negative'
}

function errorMsg(err) {
  if (err.name === 'TimeoutError' || err.message?.includes('timed out') || err.message?.includes('signal')) {
    return 'Request timed out. The operation may still be running — please refresh in a moment.'
  }
  return err.message || 'Unknown error'
}

const releaseSlot = async (symbol) => {
  if (!confirm(`Release ${formatSymbol(symbol)}?`)) return
  try {
    await apiPost('/api/release_slot', { symbol })
    alert('Slot released.')
    emit('refresh')
    await loadStatusMeta()
  } catch (err) { alert(`Failed: ${errorMsg(err)}`) }
}

// One-click rotation from Screener pick to specific Slot
const rotateSlot = async (oldSymbol, newSymbol) => {
  if (!confirm(`Rotate Slot ${formatSymbol(oldSymbol)} → ${formatSymbol(newSymbol)}?`)) return
  rotatingSlot.value = oldSymbol
  try {
    await apiPostQuery('/api/rotate_symbol', { old: oldSymbol, new: newSymbol })
    alert('Rotation started.')
    emit('refresh')
    await loadStatusMeta()
  } catch (err) { alert(`Failed: ${errorMsg(err)}`) }
  finally { rotatingSlot.value = '' }
}

// Manual rotation (typing new symbol)
const rotateSlotPrompt = async (oldSymbol) => {
  const newSymbol = prompt(`Enter new symbol to rotate into ${formatSymbol(oldSymbol)} (e.g., BTC):`)
  if (!newSymbol) return
  rotatingSlot.value = oldSymbol
  try {
    await apiPostQuery('/api/rotate_symbol', { old: oldSymbol, new: newSymbol })
    alert('Rotation started.')
    emit('refresh')
    await loadStatusMeta()
  } catch (err) { alert(`Failed: ${errorMsg(err)}`) }
  finally { rotatingSlot.value = '' }
}

// 🆕 Rotate custom symbol into selected slot
const rotateCustomToSlot = async () => {
  const newSymbol = customSymbol.value.trim()
  const oldSymbol = selectedSlotSymbol.value
  if (!newSymbol || !oldSymbol) return
  if (!confirm(`Rotate slot ${formatSymbol(oldSymbol)} → ${newSymbol}?`)) return
  rotatingSlot.value = oldSymbol
  try {
    await apiPostQuery('/api/rotate_symbol', { old: oldSymbol, new: newSymbol })
    alert('Rotation started.')
    customSymbol.value = ''
    if (slotList.value.length) selectedSlotSymbol.value = slotList.value[0]
    emit('refresh')
    await loadStatusMeta()
  } catch (err) { alert(`Failed: ${errorMsg(err)}`) }
  finally { rotatingSlot.value = '' }
}
</script>

<style scoped>
.scanner-view { padding: 0; }
.section { margin-bottom: 20px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
h2 { color: #e0e0e0; margin: 0; font-size: 18px; }

.btn-run { padding: 8px 16px; background: #00d4ff; color: #000; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px; }
.btn-run:disabled { opacity: 0.5; }

.screener-list { display: flex; flex-direction: column; gap: 8px; }
.screener-item { display: flex; justify-content: space-between; align-items: center; background: #16213e; padding: 10px 12px; border-radius: 8px; border-left: 3px solid #00d4ff; }
.pick-info { display: flex; flex-direction: column; gap: 2px; }
.pick-symbol { font-weight: bold; color: #fff; font-size: 14px; }
.pick-score { color: #a0a0a0; font-size: 11px; font-family: monospace; }
.slot-buttons { display: flex; gap: 4px; }
.btn-slot { padding: 6px 10px; background: #2a2a4a; color: #00d4ff; border: 1px solid #00d4ff33; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold; }
.btn-slot:hover { background: #00d4ff; color: #000; }
.btn-slot:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-add { background: #0d2b1a; color: #00ff88; border-color: #00ff8844; font-size: 14px; }
.btn-add:hover { background: #00ff88; color: #000; }
.btn-add:disabled { opacity: 0.5; cursor: not-allowed; }

.empty-state-small { color: #555; font-size: 12px; text-align: center; padding: 12px; background: #16213e; border-radius: 6px; }
.free-slot-hint { font-size: 11px; color: #00ff88; background: #0d2b1a; border: 1px solid #00ff8833; border-radius: 6px; padding: 6px 10px; margin-bottom: 8px; text-align: center; }
.empty-state { color: #666; text-align: center; padding: 40px; background: #16213e; border-radius: 8px; }

.divider { border: 0; border-top: 1px solid #2a2a4a; margin: 20px 0; }

/* Custom rotate styles */
.custom-rotate-section {
  background: #0f1123;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid #2a2a4a;
  margin-top: 8px;
}
.custom-rotate-section h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #ccc;
}
.custom-rotate-controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.custom-input {
  flex: 2;
  min-width: 120px;
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 6px;
  padding: 8px 10px;
  color: #fff;
  font-size: 13px;
}
.custom-input:focus {
  outline: none;
  border-color: #00d4ff;
}
.slot-select {
  flex: 1;
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 6px;
  padding: 8px 10px;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}
.btn-rotate-custom {
  background: #00d4ff;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-weight: bold;
  color: #000;
  cursor: pointer;
  transition: 0.2s;
}
.btn-rotate-custom:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.slots-grid { display: flex; flex-direction: column; gap: 12px; }
.slot-card { background: #1a1a2e; border-radius: 12px; padding: 16px; border: 1px solid #2a2a4a; cursor: pointer; transition: border-color 0.2s; }
.slot-card:hover { border-color: #00d4ff; }
.slot-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.symbol-name { margin: 0; color: #fff; font-size: 16px; font-weight: bold; }
.pref-pill {
  margin-left: 8px;
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  border: 1px solid currentColor;
}
.pref-pill.short { color: #ff4444; }
.pref-pill.long { color: #00ff88; }
.pref-pill.short { background: rgba(255,68,68,0.12); }
.pref-pill.long { background: rgba(0,255,136,0.12); }
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
.pick-side { font-size: 10px; font-weight: bold; margin-left: 8px; }
.pick-side.short { color: #ff4444; }
.pick-side.long { color: #00ff88; }

/* Single side mode */
.dual-status.single-side {
  display: flex;
  justify-content: center;
}
.dual-status.single-side .side-block {
  max-width: 200px;
}
</style>
