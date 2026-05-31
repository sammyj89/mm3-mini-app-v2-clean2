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

// NEW: Risk management status
const riskStatus = ref({
  regime: 'unknown',
  regime_confidence: 0,
  volatility: { status: 'NORMAL', current_vol_pct: 0, target_vol_pct: 2, multiplier: 1 },
  rate_limit_paused: false,
  rate_limit_usage_pct: 0,
  bidirectional: true,
  max_inventory_usd: 150,
})

// NEW: Session PnL tracking (for chart/trades reset)
const sessionStartTs = ref(parseInt(localStorage.getItem('mm3_session_start') || Date.now() / 1000))

// Helper: Format timestamp to Melbourne time (UTC+10)
function formatMelbourneTime(ts) {
  if (!ts) return '-'
  // Handle both ms and s timestamps
  const ms = ts > 1000000000000 ? ts : ts * 1000
  return new Date(ms).toLocaleString('en-AU', {
    timeZone: 'Australia/Melbourne',
    hour12: false,
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

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
    if (res.success && res.data) {
      riskStatus.value = res.data
    }
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
  if (regime === 'ranging') return 'regime-ranging'
  if (regime === 'trending_up') return 'regime-up'
  if (regime === 'trending_down') return 'regime-down'
  if (regime === 'high_vol') return 'regime-vol'
  return ''
}

async function loadSummary() {
  loading.value = true
  try {
    // Single parallel fetch — no triple-calling trades_exchange
    const [statusRes, tradesRes, riskRes] = await Promise.all([
      apiGet('/api/status_all'),
      apiGet('/api/trades_exchange'),
      apiGet('/api/risk_status'),
    ])

    // DEBUG: Log API responses
    console.log('statusRes:', statusRes)
    console.log('tradesRes:', tradesRes)
    console.log('riskRes:', riskRes)

    // Risk status
    if (riskRes.success && riskRes.data) {
      riskStatus.value = riskRes.data
    }

    // ── Status / positions ──
    if (statusRes.success && statusRes.data) {
      const slots = statusRes.data
      console.log('slots:', slots)
      const firstKey = Object.keys(slots)[0]
      console.log('firstKey:', firstKey, 'equity:', firstKey ? slots[firstKey].equity : null)
      if (firstKey) equity.value = slots[firstKey].equity || 0
      positions.value = Object.entries(slots).flatMap(([sym, data]) => {
        const live = data.live || {}
        const mid = live.mid || 0
        const rows = []
        // SHORT side
        if ((live.short_qty || 0) > 0 && live.short_avg && mid) {
          const pnl = (live.short_avg - mid) * live.short_qty
          rows.push({
            symbol: sym.split(':')[0],
            side: 'short',
            qty: live.short_qty,
            notional: live.short_qty * mid,
            pnl,
          })
        }
        // LONG side
        if ((live.long_qty || 0) > 0 && live.long_avg && mid) {
          const pnl = (mid - live.long_avg) * live.long_qty
          rows.push({
            symbol: sym.split(':')[0],
            side: 'long',
            qty: live.long_qty,
            notional: live.long_qty * mid,
            pnl,
          })
        }
        return rows
      })
      unrealizedPnl.value = positions.value.reduce((s, p) => s + p.pnl, 0)
    }

    // ── Trades (single fetch, used for all three stats blocks) ──
    if (tradesRes.success && tradesRes.data) {
      const allTrades = tradesRes.data || []
      
      // Handle timestamp - API returns milliseconds, sessionStartTs is in seconds
      const sessionStartMs = sessionStartTs.value * 1000
      const sessionTrades = allTrades.filter(t => (t.ts || 0) >= sessionStartMs)
      
      // Use all trades if session filter returns empty (fallback)
      const displayTrades = sessionTrades.length > 0 ? sessionTrades : allTrades
      
      // Today's PnL still uses midnight for display
      const now = new Date()
      const midnightMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      dailyPnl.value = allTrades
        .filter(t => (t.ts || 0) >= midnightMs)
        .reduce((s, t) => s + (t.pnl || 0), 0)

      // Session stats (for chart and performance)
      const wins   = displayTrades.filter(t => (t.pnl || 0) > 0)
      const losses = displayTrades.filter(t => (t.pnl || 0) < 0)
      stats.value.allTimePnl   = displayTrades.reduce((s, t) => s + (t.pnl || 0), 0)
      stats.value.totalTrades  = displayTrades.length
      stats.value.winRate      = displayTrades.length ? ((wins.length / displayTrades.length) * 100).toFixed(1) : 0
      const grossProfit = wins.reduce((s, t) => s + (t.pnl || 0), 0)
      const grossLoss   = Math.abs(losses.reduce((s, t) => s + (t.pnl || 0), 0))
      stats.value.profitFactor  = grossLoss > 0
        ? (grossProfit / grossLoss).toFixed(2)
        : (grossProfit > 0 ? '∞' : '0.00')

      // Equity curve chart uses display trades
      buildChart(displayTrades)
    }
  } catch (e) { console.error('loadSummary error', e) }
  loading.value = false
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
          borderColor: '#00d4ff',
          tension: 0.1,
          pointRadius: 0,
          borderWidth: 2,
          fill: true,
          backgroundColor: 'rgba(0,212,255,0.07)',
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
  <div class="home-tab">
    <!-- Risk Management Status Panel -->
    <div class="card risk-card">
      <h3>🛡️ Risk Status</h3>
      <div class="risk-grid">
        <div class="risk-item">
          <span class="risk-label">Regime</span>
          <span class="risk-value" :class="getRegimeClass(riskStatus.regime)">
            {{ getRegimeIcon(riskStatus.regime) }} {{ riskStatus.regime }}
          </span>
          <span class="risk-sub">{{ Math.round(riskStatus.regime_confidence * 100) }}% confidence</span>
        </div>
        <div class="risk-item">
          <span class="risk-label">Volatility</span>
          <span class="risk-value" :class="riskStatus.volatility.status === 'HIGH_VOL' ? 'red' : riskStatus.volatility.status === 'ELEVATED_VOL' ? 'yellow' : 'green'">
            {{ riskStatus.volatility.status }}
          </span>
          <span class="risk-sub">{{ riskStatus.volatility.current_vol_pct?.toFixed(1) }}% / {{ riskStatus.volatility.target_vol_pct }}% target</span>
        </div>
        <div class="risk-item">
          <span class="risk-label">Rate Limit</span>
          <span class="risk-value" :class="riskStatus.rate_limit_paused ? 'red' : 'green'">
            {{ riskStatus.rate_limit_paused ? '⏸️ PAUSED' : '✅ OK' }}
          </span>
          <span class="risk-sub">{{ riskStatus.rate_limit_usage_pct?.toFixed(0) }}% used</span>
        </div>
        <div class="risk-item">
          <span class="risk-label">Mode</span>
          <span class="risk-value" :class="riskStatus.bidirectional ? 'yellow' : 'green'">
            {{ riskStatus.bidirectional ? '↔️ Bidirectional' : '➡️ Unidirectional' }}
          </span>
          <span class="risk-sub">Max ${{ riskStatus.max_inventory_usd }}/coin</span>
        </div>
      </div>
    </div>

    <div class="card summary-card">
      <h3>💰 Account Summary</h3>
      <div class="summary-metrics">
        <div class="metric">
          <span class="label">Equity</span>
          <span class="value">${{ Number(equity).toFixed(2) }}</span>
        </div>
        <div class="metric">
          <span class="label">Unrealized</span>
          <span class="value" :class="unrealizedPnl >= 0 ? 'green' : 'red'">
            ${{ Number(unrealizedPnl).toFixed(2) }}
          </span>
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
      <div v-else-if="positions.length === 0" class="empty-positions">😴 No open positions.</div>
      <div v-for="pos in positions" :key="pos.symbol + pos.side" class="position-row">
        <span class="symbol">{{ pos.symbol }}</span>
        <span class="side" :class="pos.side === 'short' ? 'red' : 'green'">{{ pos.side }}</span>
        <span class="notional">${{ pos.notional.toFixed(2) }}</span>
        <span class="pnl" :class="pos.pnl >= 0 ? 'green' : 'red'">{{ pos.pnl >= 0 ? '+' : '' }}${{ pos.pnl.toFixed(2) }}</span>
      </div>
    </div>

    <div class="card summary-card">
      <div class="perf-header">
        <h3>📊 Performance</h3>
        <button @click="resetSessionPnl" class="btn-reset-pnl">🔄 Reset Session</button>
      </div>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">Session P&amp;L</span>
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
.red   { color: #ff4757; }
.yellow { color: #ffd43b; }
.mini-chart { height: 80px; margin-top: 12px; }
.position-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #2a2a4a; font-size: 13px; }
.symbol { font-weight: bold; min-width: 80px; }
.side { text-transform: uppercase; min-width: 50px; }
.notional { font-family: monospace; margin-left: auto; margin-right: 10px; }
.pnl { font-family: monospace; }
.empty-positions { color: #666; font-size: 13px; text-align: center; padding: 16px 0; }
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.stat-item { display: flex; flex-direction: column; }
.stat-label { font-size: 10px; color: #8888aa; text-transform: uppercase; }
.stat-value { font-size: 14px; font-weight: bold; font-family: monospace; }
/* Risk Status Panel */
.risk-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.risk-item { display: flex; flex-direction: column; background: #1a2744; padding: 10px; border-radius: 8px; }
.risk-label { font-size: 9px; color: #8888aa; text-transform: uppercase; margin-bottom: 4px; }
.risk-value { font-size: 12px; font-weight: bold; }
.risk-sub { font-size: 9px; color: #666; margin-top: 2px; }
.regime-ranging { color: #00ff88; }
.regime-up { color: #00d4ff; }
.regime-down { color: #ff4757; }
.regime-vol { color: #ffd43b; }
.perf-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.perf-header h3 { margin-bottom: 0; }
.btn-reset-pnl {
  background: transparent;
  border: 1px solid #444;
  color: #888;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-reset-pnl:hover {
  border-color: #00d4ff;
  color: #00d4ff;
}
</style>
