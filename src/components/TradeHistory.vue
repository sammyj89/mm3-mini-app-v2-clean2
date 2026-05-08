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
    if (sortKey.value === 'ts' || sortKey.value === 'pnl') {
      valA = Number(valA); valB = Number(valB)
    }
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
  const res = await apiGet('/api/trades_exchange')
  trades.value = res.data || []
}
onMounted(() => { loadTrades(); interval = setInterval(loadTrades, 10000) })
onUnmounted(() => clearInterval(interval))
</script>

<template>
  <div class="card">
    <h3>📋 Recent Trades</h3>
    <table>
      <thead><tr>
        <th @click="toggleSort('ts')">Time ▾</th>
        <th @click="toggleSort('symbol')">Symbol ▾</th>
        <th @click="toggleSort('side')">Side ▾</th>
        <th @click="toggleSort('pnl')">P&L ▾</th>
      </tr></thead>
      <tbody>
        <tr v-for="t in sortedTrades" :key="t.ts">
          <td>{{ formatTime(t.ts) }}</td>
          <td>{{ t.symbol }}</td>
          <td>{{ t.side }}</td>
          <td :class="t.pnl >= 0 ? 'green' : 'red'">{{ t.pnl.toFixed(4) }}</td>
        </tr>
      </tbody>
    </table>
    <button v-if="hasMore" class="load-more" @click="loadMore">Load more trades</button>
    <p v-else class="end-msg">All trades loaded.</p>
  </div>
</template>

<style scoped>
.card { background:#16213e; border-radius:12px; padding:16px; margin-bottom:12px; box-shadow:0 2px 8px rgba(0,0,0,0.3); }
h3 { color:#00d4ff; font-size:13px; margin-bottom:10px; }
table { width:100%; border-collapse:collapse; font-size:12px; }
th { color:#8888aa; text-align:left; padding:4px; border-bottom:1px solid #2a2a4a; cursor:pointer; user-select:none; }
th:hover { color:#fff; }
td { padding:4px; }
.green { color:#00ff88; } .red { color:#ff4757; }
.load-more { margin-top:10px; width:100%; padding:8px; border:none; border-radius:8px; background:#3742fa; color:#fff; font-weight:600; cursor:pointer; }
.end-msg { text-align:center; font-size:12px; color:#8888aa; margin-top:8px; }
</style>