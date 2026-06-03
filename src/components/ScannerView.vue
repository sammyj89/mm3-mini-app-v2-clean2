<template>
  <div class="scanner-view">
    <!-- Screener -->
    <div class="card mb-4">
      <div class="card-header">
        <h2 class="card-title">🔍 Screener</h2>
        <button @click="runScreener" class="btn btn-sm btn-primary" :disabled="screenerLoading">
          {{ screenerLoading ? 'Running…' : 'Run Scan' }}
        </button>
      </div>
      <div v-if="freeSlotCount > 0" class="badge badge-success mb-3">
        {{ freeSlotCount }} free slot{{ freeSlotCount > 1 ? 's' : '' }} — tap ➕ to add
      </div>
      <div v-if="screenerPicks.length > 0" class="screener-list stagger">
        <div v-for="(pick, i) in screenerPicks" :key="pick.symbol" class="screener-item animate-fade" :style="`animation-delay:${i*60}ms`">
          <div class="pick-info">
            <span class="pick-symbol">{{ formatSymbol(pick.symbol) }}</span>
            <span class="pick-score">Score {{ pick.score?.toFixed(1) || '-' }}</span>
            <span v-if="pick.preferred_side" :class="['badge', pick.preferred_side === 'short' ? 'badge-danger' : 'badge-success']">
              {{ pick.preferred_side }}
            </span>
          </div>
          <div class="pick-actions">
            <button v-if="freeSlotCount > 0" @click="addToFreeSlot(pick.symbol)"
              class="btn btn-sm btn-success" :disabled="addingSymbol === pick.symbol">
              {{ addingSymbol === pick.symbol ? '⏳' : '➕' }}
            </button>
            <button v-for="(sym, idx) in slotList" :key="idx" @click="rotateSlot(sym, pick.symbol)"
              class="btn btn-sm btn-ghost" :disabled="rotatingSlot === sym">
              {{ rotatingSlot === sym ? '⏳' : `Slot ${idx + 1}` }}
            </button>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">No screener data. Click Run Scan.</div>
    </div>

    <!-- Custom Rotate -->
    <div class="card mb-4">
      <h2 class="card-title mb-3">➕ Custom Rotate</h2>
      <div class="custom-rotate-row">
        <input v-model="customSymbol" placeholder="Symbol, e.g. BTC" class="input" @keyup.enter="rotateCustomToSlot" />
        <select v-model="selectedSlotSymbol" class="input select">
          <option v-for="sym in slotList" :key="sym" :value="sym">{{ formatSymbol(sym) }}</option>
        </select>
        <button @click="rotateCustomToSlot" class="btn btn-primary" :disabled="!customSymbol.trim() || !selectedSlotSymbol">
          Rotate
        </button>
      </div>
      <div v-if="slotList.length === 0" class="empty-state mt-3">No active slots to rotate into.</div>
    </div>

    <!-- Active Slots -->
    <div>
      <h2 class="card-title mb-3">Active Slots</h2>
      <div v-if="!activeSlots || Object.keys(activeSlots).length === 0" class="empty-state">
        Loading slots or no active symbols…
      </div>
      <div v-else class="slots-grid stagger">
        <div v-for="(slot, symbol, i) in activeSlotsWithPref" :key="symbol"
          class="slot-card animate-fade" :style="`animation-delay:${i*80}ms`"
          @click="$emit('select-symbol', symbol)">
          <div class="slot-header">
            <div class="flex items-center gap-2">
              <span class="slot-symbol">{{ formatSymbol(symbol) }}</span>
              <span v-if="!bidirectionalMode && slot.preferred_side"
                :class="['badge', slot.preferred_side === 'short' ? 'badge-danger' : 'badge-success']">
                {{ slot.preferred_side }}
              </span>
            </div>
            <div class="header-actions" @click.stop>
              <button @click="rotateSlotPrompt(symbol)" class="btn btn-sm btn-ghost" :disabled="rotatingSlot === symbol">
                {{ rotatingSlot === symbol ? '⏳' : '🔄' }}
              </button>
              <button @click="releaseSlot(symbol)" class="btn btn-sm btn-danger">🔓</button>
            </div>
          </div>
          <div class="dual-status" :class="{ 'single-side': !bidirectionalMode && slot.preferred_side }">
            <!-- Short: show only if preferred_side is short (or not set and bidirectional/has qty) -->
            <div v-if="slot.preferred_side ? slot.preferred_side === 'short' : (bidirectionalMode || slot.live?.short_qty > 0)" class="side-block short-block">
              <div class="side-label">Short</div>
              <div v-if="slot.live?.short_qty > 0" class="side-data">
                <div class="pnl" :class="pnlClass(slot.live.short_qty, slot.live.short_avg, slot.live.mid, 'short')">
                  {{ formatPnl(slot.live.short_qty, slot.live.short_avg, slot.live.mid, 'short') }}
                </div>
                <div class="progress-bar">
                  <div class="progress-fill progress-fill-danger" :style="{ width: fillPercent(slot.ladder_short) + '%' }"></div>
                </div>
                <span class="ladder-count">{{ slot.ladder_short?.consumed || 0 }}/{{ slot.ladder_short?.total || 0 }} lvl</span>
              </div>
              <div v-else class="flat-badge">FLAT</div>
            </div>
            <!-- Long: show only if preferred_side is long (or not set and bidirectional/has qty) -->
            <div v-if="slot.preferred_side ? slot.preferred_side === 'long' : (bidirectionalMode || slot.live?.long_qty > 0)" class="side-block long-block">
              <div class="side-label">Long</div>
              <div v-if="slot.live?.long_qty > 0" class="side-data">
                <div class="pnl" :class="pnlClass(slot.live.long_qty, slot.live.long_avg, slot.live.mid, 'long')">
                  {{ formatPnl(slot.live.long_qty, slot.live.long_avg, slot.live.mid, 'long') }}
                </div>
                <div class="progress-bar">
                  <div class="progress-fill progress-fill-accent" :style="{ width: fillPercent(slot.ladder_long) + '%' }"></div>
                </div>
                <span class="ladder-count">{{ slot.ladder_long?.consumed || 0 }}/{{ slot.ladder_long?.total || 0 }} lvl</span>
              </div>
              <div v-else class="flat-badge">FLAT</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { apiGet, apiPost, apiPostQuery } from '../services/api'

const props = defineProps({ activeSlots: { type: Object, default: () => ({}) } })
const emit = defineEmits(['select-symbol', 'refresh'])

const screenerPicks = ref([])
const screenerLoading = ref(false)
const rotatingSlot = ref('')
const bidirectionalMode = ref(true)
const customSymbol = ref('')
const selectedSlotSymbol = ref(null)
const addingSymbol = ref('')
const preferredSides = ref({})

const MAX_SLOTS = 3
const slotList = computed(() => Object.keys(props.activeSlots))
const freeSlotCount = computed(() => Math.max(0, MAX_SLOTS - slotList.value.length))

const activeSlotsWithPref = computed(() => {
  const merged = {}
  Object.entries(props.activeSlots).forEach(([rawKey, data]) => {
    let pref = preferredSides.value[rawKey] || data.preferred_side || null
    if (!pref && !bidirectionalMode.value) {
      if (data.live?.short_qty > 0 && (!data.live?.long_qty || data.live.long_qty <= 0)) {
        pref = 'short'
      } else if (data.live?.long_qty > 0 && (!data.live?.short_qty || data.live.short_qty <= 0)) {
        pref = 'long'
      }
    }
    merged[rawKey] = { ...data, preferred_side: pref }
  })
  return merged
})

async function loadStatusMeta() {
  try {
    const res = await apiGet('/api/status_all')
    if (res.success && res.data) {
      const pref = {}
      Object.entries(res.data).forEach(([rawKey, payload]) => {
        if (payload?.preferred_side) pref[rawKey] = payload.preferred_side
      })
      preferredSides.value = pref
    }
  } catch (err) { console.warn('Failed to load status metadata', err) }
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

async function addToFreeSlot(symbol) {
  if (!confirm(`Add ${formatSymbol(symbol)} to a new slot?`)) return
  addingSymbol.value = symbol
  try {
    await apiPost('/api/symbol', { symbol })
    alert(`${formatSymbol(symbol)} added successfully.`)
    emit('refresh')
  } catch (err) { alert(`Failed to add: ${errorMsg(err)}`) }
  finally { addingSymbol.value = '' }
}

async function runScreener() {
  screenerLoading.value = true
  try {
    const res = await apiPost('/api/run_screener')
    if (res.success && res.data) screenerPicks.value = res.data.picks || res.data || []
  } catch (err) { alert(`Screener failed: ${err.message}`) }
  finally { screenerLoading.value = false }
}

function formatSymbol(sym) { return sym ? sym.split(':')[0] : '' }

function fillPercent(ladder) {
  if (!ladder || ladder.total === 0) return 0
  return (ladder.consumed / ladder.total) * 100
}

function formatPnl(qty, avg, mid, side) {
  if (!qty || qty <= 0 || !avg || !mid) return '$0.00'
  const pnl = side === 'short' ? (avg - mid) * qty : (mid - avg) * qty
  return `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`
}

function pnlClass(qty, avg, mid, side) {
  if (!qty || qty <= 0 || !avg || !mid) return ''
  const pnl2 = side === 'short' ? (avg - mid) * qty : (mid - avg) * qty
  return pnl2 >= 0 ? 'text-success' : 'text-danger'
}

function errorMsg(err) {
  if (err.name === 'TimeoutError' || err.message?.includes('timed out') || err.message?.includes('signal')) {
    return 'Request timed out. The operation may still be running — please refresh in a moment.'
  }
  return err.message || 'Unknown error'
}

async function releaseSlot(symbol) {
  if (!confirm(`Release ${formatSymbol(symbol)}?`)) return
  try {
    await apiPost('/api/release_slot', { symbol })
    alert('Slot released.')
    emit('refresh')
    await loadStatusMeta()
  } catch (err) { alert(`Failed: ${errorMsg(err)}`) }
}

async function rotateSlot(oldSymbol, newSymbol) {
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

async function rotateSlotPrompt(oldSymbol) {
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

async function rotateCustomToSlot() {
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
.scanner-view { padding-bottom: var(--space-4); }

.screener-list { display: flex; flex-direction: column; gap: var(--space-2); }
.screener-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-elevated);
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  transition: border-color var(--transition-fast);
}
.screener-item:hover { border-color: var(--accent); }

.pick-info { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
.pick-symbol { font-weight: 700; color: var(--text-primary); font-size: var(--text-base); }
.pick-score { color: var(--text-secondary); font-size: var(--text-xs); font-family: var(--font-mono); }

.pick-actions { display: flex; gap: var(--space-1); flex-wrap: wrap; justify-content: flex-end; }

.custom-rotate-row { display: flex; gap: var(--space-2); align-items: stretch; flex-wrap: wrap; }
.custom-rotate-row .input { flex: 1; min-width: 100px; }

.slots-grid { display: flex; flex-direction: column; gap: var(--space-3); }

.slot-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  cursor: pointer;
  transition: border-color var(--transition-base), box-shadow var(--transition-base);
}
.slot-card:hover {
  border-color: var(--accent);
  box-shadow: var(--shadow-glow);
}

.slot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}
.slot-symbol { font-size: var(--text-lg); font-weight: 700; color: var(--text-primary); }

.header-actions { display: flex; gap: var(--space-1); }

.dual-status { display: flex; gap: var(--space-3); }
.side-block {
  flex: 1;
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
  border-top: 2px solid transparent;
}
.short-block { border-top-color: var(--danger); }
.long-block { border-top-color: var(--accent); }

.side-label {
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: var(--space-2);
}

.side-data { display: flex; flex-direction: column; gap: var(--space-1); }
.pnl {
  font-size: var(--text-lg);
  font-weight: 700;
  font-family: var(--font-mono);
}
.ladder-count { font-size: var(--text-xs); color: var(--text-secondary); text-align: right; }

.flat-badge {
  color: var(--text-muted);
  font-style: italic;
  text-align: center;
  padding: var(--space-2) 0;
  font-size: var(--text-sm);
}

.dual-status.single-side { justify-content: center; }
.dual-status.single-side .side-block { max-width: 200px; }
</style>
