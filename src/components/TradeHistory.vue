<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { apiGet } from '../services/api'

const trades = ref([])
const sortKey = ref('ts')
const sortOrder = ref('desc')
const pageSize = 20
const currentPage = ref(1)

const sortedTrades = computed(() => {
  const sorted = [...trades.value]
  sorted.sort((a, b) => {
    let valA = a[sortKey.value], valB = b[sortKey.value]
    if (sortKey.value === 'ts' || sortKey.value === 'pnl') { valA = Number(valA); valB = Number(valB) }
    if (valA < valB) return sortOrder.value === 'asc' ? -1 : 1
    if (valA > valB) return sortOrder.value === 'asc' ? 1 : -1
    return 0
  })
  return sorted.slice(0, currentPage.value * pageSize)
})

const hasMore = computed(() => currentPage.value * pageSize < trades.value.length)

function toggleSort(key) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'desc'
  }
  currentPage.value = 1
}
function formatTime(ts) {
  const d = new Date(ts * 1000)
  return d.toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })
}
function loadMore() { currentPage.value++ }

let interval = null
async function loadTrades() {
  try {
    const res = await apiGet('/api/trades?days=7')
    trades.value = res.data || []
  } catch (e) { console.error('loadTrades error', e) }
}
onMounted(() => { loadTrades(); interval = setInterval(loadTrades, 30000) })
onUnmounted(() => clearInterval(interval))
</script>

<template>
  <div class="card">
    <div class="card-header">
      <h2 class="card-title">📋 Trades</h2>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th @click="toggleSort('ts')">Time <span class="sort-indicator">{{ sortKey==='ts' ? (sortOrder==='asc'?'▲':'▼') : '' }}</span></th>
            <th @click="toggleSort('symbol')">Sym <span class="sort-indicator">{{ sortKey==='symbol' ? (sortOrder==='asc'?'▲':'▼') : '' }}</span></th>
            <th @click="toggleSort('side')">Side <span class="sort-indicator">{{ sortKey==='side' ? (sortOrder==='asc'?'▲':'▼') : '' }}</span></th>
            <th @click="toggleSort('pnl')" class="text-right">P&L <span class="sort-indicator">{{ sortKey==='pnl' ? (sortOrder==='asc'?'▲':'▼') : '' }}</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in sortedTrades" :key="t.ts" class="trade-row">
            <td class="text-muted">{{ formatTime(t.ts) }}</td>
            <td class="font-bold">{{ t.symbol }}</td>
            <td>
              <span :class="['badge', t.side === 'short' ? 'badge-danger' : 'badge-success']">{{ t.side }}</span>
            </td>
            <td :class="['text-right font-mono font-bold', t.pnl >= 0 ? 'text-success' : 'text-danger']">
              {{ t.pnl >= 0 ? '+' : '' }}{{ t.pnl.toFixed(4) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="table-footer">
      <button v-if="hasMore" class="btn btn-block btn-secondary" @click="loadMore">Load more</button>
      <span v-else class="text-muted text-sm text-center">All trades loaded</span>
    </div>
  </div>
</template>

<style scoped>
.table-wrap { overflow-x: auto; margin: 0 calc(-1 * var(--space-4)); padding: 0 var(--space-4); }
table { font-size: var(--text-sm); white-space: nowrap; }
th { cursor: pointer; user-select: none; transition: color var(--transition-fast); }
th:hover { color: var(--text-primary); }
.sort-indicator { font-size: 10px; margin-left: 2px; color: var(--accent); }
.trade-row:hover { background: var(--bg-hover); }
.table-footer { margin-top: var(--space-3); }
</style>
