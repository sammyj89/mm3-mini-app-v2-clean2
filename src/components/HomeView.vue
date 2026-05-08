<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { apiGet } from '../services/api'
import Chart from 'chart.js/auto'
import SkeletonCard from './SkeletonCard.vue'

const equity = ref(0)
const dailyPnl = ref(0)
const positions = ref([])
const loading = ref(true)
const canvas = ref(null)
let chart = null

const stats = ref({
  winRate: 0,
  avgWin: 0,
  avgLoss: 0,
  profitFactor: '∞',
  totalTrades: 0,
  allTimePnl: 0
})

async function loadSummary() {
  loading.value = true
  try {
    const res = await apiGet('/api/status_all')
    if (res.success && res.data) {
      const slots = res.data
      const firstKey = Object.keys(slots)[0]
      if (firstKey) {
        equity.value = slots[firstKey].equity || 0
      }
      positions.value = Object.entries(slots).map(([sym, data]) => {
        const live = data.live || {}
        const side = live.side || 'flat'
        const qty = Math.abs(live.net_qty || 0)
        const mid = live.mid || 0
        const avg = live.avg_entry || 0
        let pnl = 0
        if (qty > 0 && avg > 0 && mid > 0) {
          pnl = side === 'short' ? (avg - mid) * qty : (mid - avg) * qty
        }
        const notional = qty * mid
        return { symbol: sym.split(':')[0], side, qty, pnl, mid, notional }
      })
    }
  } catch (e) { console.error(e) }

  try {
    const tradesRes = await apiGet('/api/trades_exchange')
    if (tradesRes.success && tradesRes.data) {
      const oneDayAgo = Date.now() / 1000 - 86400
      const todayTrades = tradesRes.data.filter(t => t.ts > oneDayAgo)
      dailyPnl.value = todayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
    }
  } catch (e) { console.error('daily pnl fetch error', e) }

  loading.value = false
}

async function loadMiniChart() {
  try {
    const res = await apiGet('/api/trades_exchange')
    const trades = (res.data || []).slice(-50)
    const labels = []; const data = []; let cum = 0
    ;[...trades].reverse().forEach(t => {
      cum += t.pnl || 0
      labels.push('')
      data.push(cum)
    })
    if (chart) chart.destroy()
    chart = new Chart(canvas.value, {
      type: 'line',
      data: { labels, datasets: [{ data, borderColor: '#00d4ff', tension:0.1, pointRadius:0, borderWidth:2 }] },
      options: { plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false, beginAtZero: true } }, responsive: true, maintainAspectRatio: false }
    })
  } catch (e) {}
}

async function computeStats() {
  try {
    const res = await apiGet('/api/trades_exchange')
    const trades = res.data || []
    const wins = trades.filter(t => t.pnl > 0)
    const losses = trades.filter(t => t.pnl < 0)
    const totalWins = wins.reduce((s, t) => s + t.pnl, 0)
    const totalLosses = Math.abs(losses.reduce((s, t) => s + t.pnl, 0))
    stats.value = {
      winRate: trades.length ? ((wins.length / trades.length) * 100).toFixed(1) : 0,
      avgWin: wins.length ? (totalWins / wins.length).toFixed(2) : 0,
      avgLoss: losses.length ? (totalLosses / losses.length).toFixed(2) : 0,
      profitFactor: totalLosses ? (totalWins / totalLosses).toFixed(2) : '∞',
      totalTrades: trades.length,
      allTimePnl: trades.reduce((s, t) => s + (t.pnl || 0), 0)
    }
  } catch (e) {}
}

let interval = null
onMounted(() => {
  loadSummary()
  loadMiniChart()
  computeStats()
  interval = setInterval(() => {
    loadSummary()
    loadMiniChart()
    computeStats()
  }, 30000)
})
onUnmounted(() => clearInterval(interval))

const totalExposure = () => positions.value.reduce((sum, p) => sum + p.notional, 0)
const bestPerformer = () => {
  const sorted = [...positions.value].sort((a, b) => b.pnl - a.pnl)
  return sorted[0] || null
}
const worstPerformer = () => {
  const sorted = [...positions.value].sort((a, b) => a.pnl - b.pnl)
  return sorted[0] || null
}
</script>

<template>
  <div class="home-tab">
    <div class="card summary-card">
      <h3>💰 Account Summary</h3>
      <div class="summary-metrics">
        <div class="metric">
          <span class="label">Equity</span>
          <span class="value">${{ Number(equity).toFixed(2) }}</span>
        </div>
        <div class="metric">
          <span class="label">Today's P&amp;L</span>
          <span class="value" :class="dailyPnl >= 0 ? 'green' : 'red'">
            {{ dailyPnl >= 0 ? '+' : '' }}${{ Number(dailyPnl).toFixed(2) }}
          </span>
        </div>
      </div>
      <div class="mini-chart"><canvas ref="canvas" height="80"></canvas></div>
    </div>

    <div class="card positions-card">
      <h3>📌 Open Positions</h3>
      <div v-if="loading"><SkeletonCard /></div>
      <div v-else-if="positions.length === 0">😴 No open positions.</div>
      <div v-for="pos in positions" :key="pos.symbol" class="position-row">
        <span class="symbol">{{ pos.symbol }}</span>
        <span class="side" :class="pos.side === 'short' ? 'red' : 'green'">{{ pos.side }}</span>
        <span class="notional">${{ pos.notional.toFixed(2) }}</span>
        <span class="pnl" :class="pos.pnl >= 0 ? 'green' : 'red'">${{ pos.pnl.toFixed(2) }}</span>
      </div>
    </div>

    <div class="card summary-card">
      <h3>📊 Performance</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">All‑Time P&amp;L</span>
          <span class="stat-value" :class="stats.allTimePnl >= 0 ? 'green' : 'red'">
            ${{ stats.allTimePnl.toFixed(2) }}
          </span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Total Trades</span>
          <span class="stat-value">{{ stats.totalTrades }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Win Rate</span>
          <span class="stat-value">{{ stats.winRate }}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Profit Factor</span>
          <span class="stat-value">{{ stats.profitFactor }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-tab { padding: 12px; }
.card { background: #16213e; border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
h3 { color: #00d4ff; font-size: 14px; margin-bottom: 10px; text-transform: uppercase; }
.summary-metrics { display: flex; gap: 20px; }
.metric { display: flex; flex-direction: column; }
.label { font-size: 10px; color: #8888aa; text-transform: uppercase; }
.value { font-size: 20px; font-weight: bold; font-family: monospace; }
.green { color: #00ff88; }
.red { color: #ff4757; }
.mini-chart { height: 80px; margin-top: 12px; }
.position-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #2a2a4a; font-size: 13px; }
.symbol { font-weight: bold; min-width: 80px; }
.side { text-transform: uppercase; min-width: 50px; }
.notional { font-family: monospace; margin-left: auto; margin-right: 10px; }
.pnl { font-family: monospace; }
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.stat-item { display: flex; flex-direction: column; }
.stat-label { font-size: 10px; color: #8888aa; text-transform: uppercase; }
.stat-value { font-size: 14px; font-weight: bold; font-family: monospace; }
</style>