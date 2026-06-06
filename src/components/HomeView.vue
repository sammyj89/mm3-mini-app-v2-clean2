<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { apiGet } from '../services/api'
import Chart from 'chart.js/auto'
import SkeletonCard from './SkeletonCard.vue'

const equity = ref(0)
const dailyPnl = ref(0)
const unrealizedPnl = ref(0)
const positions = ref([])
const loading = ref(true)
const canvas = ref(null)
let chart = null

const stats = ref({ allTimePnl: 0, totalTrades: 0, winRate: 0, profitFactor: 0 })

const riskStatus = ref({
  regime: 'unknown',
  regime_confidence: 0,
  volatility: { status: 'NORMAL', current_vol_pct: 0, target_vol_pct: 2, multiplier: 1 },
  rate_limit_paused: false,
  rate_limit_usage_pct: 0,
  bidirectional: true,
  max_inventory_usd: 150,
})

const sessionStartTs = ref(parseInt(localStorage.getItem('mm3_session_start') || Date.now() / 1000))

const resetSessionPnl = () => {
  if (!confirm('Reset PnL tracking? This will start fresh from now for the chart and trades.')) return
  const now = Math.floor(Date.now() / 1000)
  sessionStartTs.value = now
  localStorage.setItem('mm3_session_start', now.toString())
  loadSummary()
}

async function loadRiskStatus() {
  try {
    const res = await apiGet('/api/risk_status')
    if (res.success && res.data) riskStatus.value = res.data
  } catch (e) { console.error('loadRiskStatus error', e) }
}

function getRegimeIcon(regime) {
  if (regime === 'ranging') return '↔️'
  if (regime === 'trending_up') return '📈'
  if (regime === 'trending_down') return '📉'
  if (regime === 'high_vol') return '⚡'
  return '❓'
}

function getRegimeClass(regime) {
  if (regime === 'ranging') return 'text-success'
  if (regime === 'trending_up') return 'text-accent'
  if (regime === 'trending_down') return 'text-danger'
  if (regime === 'high_vol') return 'text-warning'
  return ''
}

function volClass(status) {
  if (status === 'HIGH_VOL') return 'text-danger'
  if (status === 'ELEVATED_VOL') return 'text-warning'
  return 'text-success'
}

let loadingSummary = false
async function loadSummary() {
  if (loadingSummary) return
  loadingSummary = true
  loading.value = true
  try {
    const [statusRes, tradesRes, riskRes] = await Promise.all([
      apiGet('/api/status_all'),
      apiGet('/api/trades?days=7'),
      apiGet('/api/risk_status'),
    ])
    if (riskRes.success && riskRes.data) riskStatus.value = riskRes.data
    if (statusRes.success && statusRes.data) {
      const slots = statusRes.data
      const firstKey = Object.keys(slots)[0]
      if (firstKey) equity.value = slots[firstKey].equity || 0
      positions.value = Object.entries(slots).flatMap(([sym, data]) => {
        const live = data.live || {}
        const mid = live.mid || 0
        const pref = data.preferred_side || null
        const rows = []
        if ((live.short_qty || 0) > 0 && live.short_avg && mid) {
          if (!pref || pref === 'short') {
            const pnl = (live.short_avg - mid) * live.short_qty
            rows.push({ symbol: sym.split(':')[0], side: 'short', qty: live.short_qty, notional: live.short_qty * mid, pnl })
          }
        }
        if ((live.long_qty || 0) > 0 && live.long_avg && mid) {
          if (!pref || pref === 'long') {
            const pnl = (mid - live.long_avg) * live.long_qty
            rows.push({ symbol: sym.split(':')[0], side: 'long', qty: live.long_qty, notional: live.long_qty * mid, pnl })
          }
        }
        return rows
      })
      unrealizedPnl.value = positions.value.reduce((s, p) => s + p.pnl, 0)
    }
    if (tradesRes.success && tradesRes.data) {
      const allTrades = tradesRes.data || []
      const sessionStartSec = sessionStartTs.value
      const sessionTrades = allTrades.filter(t => (t.ts || 0) >= sessionStartSec)
      const displayTrades = sessionTrades.length > 0 ? sessionTrades : allTrades
      const now = new Date()
      const midnightSec = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000
      dailyPnl.value = allTrades.filter(t => (t.ts || 0) >= midnightSec).reduce((s, t) => s + (t.pnl || 0), 0)
      const wins = displayTrades.filter(t => (t.pnl || 0) > 0)
      const losses = displayTrades.filter(t => (t.pnl || 0) < 0)
      stats.value.allTimePnl = displayTrades.reduce((s, t) => s + (t.pnl || 0), 0)
      stats.value.totalTrades = displayTrades.length
      stats.value.winRate = displayTrades.length ? ((wins.length / displayTrades.length) * 100).toFixed(1) : 0
      const grossProfit = wins.reduce((s, t) => s + (t.pnl || 0), 0)
      const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.pnl || 0), 0))
      stats.value.profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : (grossProfit > 0 ? '∞' : '0.00')
      buildChart(displayTrades)
    }
  } catch (e) {
    console.error('loadSummary error', e)
  } finally {
    loading.value = false
    loadingSummary = false
  }
}

function buildChart(allTrades) {
  try {
    const trades = allTrades.slice(-50)
    const labels = []
    const data = []
    let cum = 0
    ;[...trades].reverse().forEach(t => {
      cum += t.pnl || 0
      labels.push('')
      data.push(cum)
    })
    if (chart) chart.destroy()
    if (!canvas.value) return
    chart = new Chart(canvas.value, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data,
          borderColor: '#58a6ff',
          tension: 0.3,
          pointRadius: 0,
          borderWidth: 2,
          fill: true,
          backgroundColor: 'rgba(88,166,255,0.12)',
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: { x: { display: false }, y: { display: false, beginAtZero: true } },
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
      }
    })
  } catch (e) {}
}

let interval = null
onMounted(() => {
  loadSummary()
  interval = setInterval(loadSummary, 30000)
})
onUnmounted(() => {
  clearInterval(interval)
  if (chart) chart.destroy()
})
</script>

<template>
  <div class="home-view">
    <!-- Risk Status -->
    <div class="card mb-3">
      <div class="card-header">
        <h2 class="card-title">🛡️ Risk Status</h2>
      </div>
      <div class="risk-grid">
        <div class="risk-tile">
          <span class="risk-tile__label">Regime</span>
          <span class="risk-tile__value" :class="getRegimeClass(riskStatus.regime)">
            {{ getRegimeIcon(riskStatus.regime) }} {{ riskStatus.regime }}
          </span>
          <span class="risk-tile__sub">{{ Math.round(riskStatus.regime_confidence * 100) }}% confidence</span>
        </div>
        <div class="risk-tile">
          <span class="risk-tile__label">Volatility</span>
          <span class="risk-tile__value" :class="volClass(riskStatus.volatility.status)">
            {{ riskStatus.volatility.status }}
          </span>
          <span class="risk-tile__sub">{{ riskStatus.volatility.current_vol_pct?.toFixed(1) }}% / {{ riskStatus.volatility.target_vol_pct }}% target</span>
        </div>
        <div class="risk-tile">
          <span class="risk-tile__label">Rate Limit</span>
          <span class="risk-tile__value" :class="riskStatus.rate_limit_paused ? 'text-danger' : 'text-success'">
            {{ riskStatus.rate_limit_paused ? '⏸️ PAUSED' : '✅ OK' }}
          </span>
          <span class="risk-tile__sub">{{ riskStatus.rate_limit_usage_pct?.toFixed(0) }}% used</span>
        </div>
        <div class="risk-tile">
          <span class="risk-tile__label">Mode</span>
          <span class="risk-tile__value" :class="riskStatus.bidirectional ? 'text-warning' : 'text-success'">
            {{ riskStatus.bidirectional ? '↔️ Bidirectional' : '➡️ Unidirectional' }}
          </span>
          <span class="risk-tile__sub">Max ${{ riskStatus.max_inventory_usd }}/coin</span>
        </div>
      </div>
    </div>

    <!-- Account Summary -->
    <div class="card mb-3">
      <div class="card-header">
        <h2 class="card-title">💰 Account</h2>
      </div>
      <div class="metrics-row">
        <div class="metric-tile">
          <span class="metric-tile__label">Equity</span>
          <span class="metric-tile__value">${{ Number(equity).toFixed(2) }}</span>
        </div>
        <div class="metric-tile">
          <span class="metric-tile__label">Unrealized</span>
          <span class="metric-tile__value" :class="unrealizedPnl >= 0 ? 'text-success' : 'text-danger'">
            ${{ Number(unrealizedPnl).toFixed(2) }}
          </span>
        </div>
        <div class="metric-tile">
          <span class="metric-tile__label">Today's P&L</span>
          <span class="metric-tile__value" :class="dailyPnl >= 0 ? 'text-success' : 'text-danger'">
            {{ dailyPnl >= 0 ? '+' : '' }}${{ Number(dailyPnl).toFixed(2) }}
          </span>
        </div>
      </div>
      <div class="chart-wrap">
        <canvas ref="canvas" height="80"></canvas>
      </div>
    </div>

    <!-- Positions -->
    <div class="card mb-3">
      <div class="card-header">
        <h2 class="card-title">📌 Positions</h2>
      </div>
      <div v-if="loading"><SkeletonCard /></div>
      <div v-else-if="positions.length === 0" class="empty-state">No open positions</div>
      <div v-else class="positions-list">
        <div v-for="pos in positions" :key="pos.symbol + pos.side" class="position-row">
          <div class="flex items-center gap-2">
            <span class="position-row__symbol">{{ pos.symbol }}</span>
            <span :class="['badge', pos.side === 'short' ? 'badge-danger' : 'badge-success']">
              {{ pos.side }}
            </span>
          </div>
          <div class="flex items-center gap-3">
            <span class="font-mono text-sm">${{ pos.notional.toFixed(2) }}</span>
            <span :class="['font-mono text-sm font-bold', pos.pnl >= 0 ? 'text-success' : 'text-danger']">
              {{ pos.pnl >= 0 ? '+' : '' }}${{ pos.pnl.toFixed(2) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Performance -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">📊 Performance</h2>
        <button @click="resetSessionPnl" class="btn btn-sm btn-ghost">🔄 Reset</button>
      </div>
      <div class="stats-grid">
        <div class="stat-tile">
          <span class="stat-tile__label">Session P&L</span>
          <span class="stat-tile__value" :class="stats.allTimePnl >= 0 ? 'text-success' : 'text-danger'">
            ${{ stats.allTimePnl.toFixed(2) }}
          </span>
        </div>
        <div class="stat-tile">
          <span class="stat-tile__label">Trades</span>
          <span class="stat-tile__value">{{ stats.totalTrades }}</span>
        </div>
        <div class="stat-tile">
          <span class="stat-tile__label">Win Rate</span>
          <span class="stat-tile__value">{{ stats.winRate }}%</span>
        </div>
        <div class="stat-tile">
          <span class="stat-tile__label">Profit Factor</span>
          <span class="stat-tile__value">{{ stats.profitFactor }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-view { padding-bottom: var(--space-4); }

/* Risk grid */
.risk-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); }
.risk-tile {
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
}
.risk-tile__label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}
.risk-tile__value { font-size: var(--text-sm); font-weight: 700; margin-top: 2px; }
.risk-tile__sub { font-size: var(--text-xs); color: var(--text-muted); margin-top: 2px; }

/* Metrics row */
.metrics-row { display: flex; gap: var(--space-4); margin-bottom: var(--space-3); }
.metric-tile { display: flex; flex-direction: column; }
.metric-tile__label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}
.metric-tile__value {
  font-family: var(--font-mono);
  font-size: var(--text-xl);
  font-weight: 700;
  line-height: 1.3;
  color: var(--text-primary);
}

/* Chart */
.chart-wrap { height: 80px; margin-top: var(--space-3); }

/* Positions */
.positions-list { display: flex; flex-direction: column; }
.position-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border-subtle);
}
.position-row:last-child { border-bottom: none; }
.position-row__symbol { font-weight: 700; color: var(--text-primary); }

/* Stats grid */
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); }
.stat-tile {
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
}
.stat-tile__label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}
.stat-tile__value {
  font-family: var(--font-mono);
  font-size: var(--text-base);
  font-weight: 700;
  margin-top: 2px;
  color: var(--text-primary);
}
</style>
