<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import HomeView from './components/HomeView.vue'
import SlotCard from './components/SlotCard.vue'
import ScannerView from './components/ScannerView.vue'
import TradeHistory from './components/TradeHistory.vue'
import ChartView from './components/ChartView.vue'
import SettingsView from './components/SettingsView.vue'
import BottomControls from './components/BottomControls.vue'
import ReleaseConfirm from './components/ReleaseConfirm.vue'
import { apiGet, autoResolveUrl } from './services/api'

const slots = ref({})
const selectedSymbol = ref('')
const currentTab = ref(localStorage.getItem('mm3_lastTab') || 'scanner')
watch(currentTab, (newTab) => {
  localStorage.setItem('mm3_lastTab', newTab)
})
const equity = ref(0)
const dailyPnl = ref(0)
const connectionOk = ref(false)
const releaseTarget = ref('')

function handleRelease(sym) { releaseTarget.value = sym }
async function onSlotReleased() { releaseTarget.value = ''; await loadGlobals() }

const theme = ref('dark')
function toggleTheme() { theme.value = theme.value === 'dark' ? 'light' : 'dark' }

function selectSymbol(sym) {
  selectedSymbol.value = sym
  currentTab.value = 'drill_down'
}

async function loadGlobals() {
  try {
    const [res, tradesRes] = await Promise.all([
      apiGet('/api/status_all'),
      apiGet('/api/trades_exchange'),
    ])
    if (res.success && res.data) {
      slots.value = res.data
      const keys = Object.keys(res.data)
      if (keys.length && !selectedSymbol.value) selectedSymbol.value = keys[0]
      const firstKey = keys[0]
      if (firstKey) {
        equity.value = slots.value[firstKey].equity || 0
      }
    }
    if (tradesRes.success && tradesRes.data) {
      const now = new Date()
      const midnightTs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000
      const todayTrades = tradesRes.data.filter(t => t.ts >= midnightTs)
      dailyPnl.value = todayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
    }
  } catch (e) { console.error('loadGlobals error', e) }
}

async function checkConnection() {
  try {
    const res = await apiGet('/api/health')
    connectionOk.value = (res.status === 'ok')
  } catch (e) { connectionOk.value = false }
}

let globalInterval = null
onMounted(() => {
  autoResolveUrl()
  loadGlobals()
  checkConnection()
  globalInterval = setInterval(() => { loadGlobals(); checkConnection() }, 10000)
})
onUnmounted(() => clearInterval(globalInterval))

const tabs = [
  { icon: '🏠', key: 'home', name: 'Home' },
  { icon: '📡', key: 'scanner', name: 'Scanner' },
  { icon: '📈', key: 'chart', name: 'Chart' },
  { icon: '📋', key: 'trades', name: 'Trades' },
  { icon: '⚙️', key: 'settings', name: 'Settings' }
]

const activeTabKey = computed(() => {
  if (currentTab.value === 'drill_down') return 'scanner'
  return currentTab.value
})
</script>

<template>
  <div class="app-shell" :data-theme="theme">
    <!-- Connection banner -->
    <Transition name="banner">
      <div v-if="!connectionOk" class="conn-banner" @click="currentTab = 'settings'">
        <span class="conn-banner__icon">⚠️</span>
        <span class="conn-banner__text">Connection Lost — Tap to update API URL</span>
      </div>
    </Transition>

    <!-- Header -->
    <header class="app-header">
      <div class="app-header__top">
        <div class="app-header__brand">
          <span class="app-header__logo">📊</span>
          <h1 class="app-header__title">MM3</h1>
        </div>
        <div class="app-header__actions">
          <span :class="['status-pill', connectionOk ? 'status-pill--ok' : 'status-pill--lost']">
            <span class="status-pill__dot"></span>
            {{ connectionOk ? 'Live' : 'Offline' }}
          </span>
          <button class="theme-toggle" @click="toggleTheme" :title="theme === 'dark' ? 'Light mode' : 'Dark mode'">
            {{ theme === 'dark' ? '☀️' : '🌙' }}
          </button>
        </div>
      </div>
      <div class="app-header__metrics">
        <div class="metric-chip">
          <span class="metric-chip__label">Equity</span>
          <span class="metric-chip__value">${{ Number(equity).toFixed(2) }}</span>
        </div>
        <div class="metric-chip">
          <span class="metric-chip__label">Today</span>
          <span :class="['metric-chip__value', dailyPnl >= 0 ? 'text-success' : 'text-danger']">
            {{ dailyPnl >= 0 ? '+' : '' }}${{ Number(dailyPnl).toFixed(2) }}
          </span>
        </div>
      </div>
    </header>

    <!-- Main content with transition -->
    <main class="app-main">
      <Transition name="page" mode="out-in">
        <div :key="currentTab" class="page-wrapper">
          <HomeView v-if="currentTab === 'home'" />
          <ScannerView v-else-if="currentTab === 'scanner'" :activeSlots="slots" @select-symbol="selectSymbol" />
          <div v-else-if="currentTab === 'drill_down'">
            <div v-if="selectedSymbol && slots[selectedSymbol]">
              <SlotCard :symbol="selectedSymbol" :slotData="slots[selectedSymbol]" @back="currentTab = 'scanner'" />
            </div>
            <div v-else class="empty-state animate-fade">
              <p class="text-secondary">No slot selected.</p>
              <button @click="currentTab = 'scanner'" class="btn btn-secondary mt-3">← Back to Scanner</button>
            </div>
          </div>
          <ChartView v-else-if="currentTab === 'chart'" />
          <TradeHistory v-else-if="currentTab === 'trades'" />
          <SettingsView v-else-if="currentTab === 'settings'" :symbols="slots" />
        </div>
      </Transition>
    </main>

    <!-- Bottom controls (above nav) -->
    <div class="app-controls">
      <BottomControls />
    </div>

    <!-- Bottom nav -->
    <nav class="app-nav">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        @click="currentTab = tab.key"
        :class="['app-nav__item', { 'app-nav__item--active': activeTabKey === tab.key }]"
        :title="tab.name"
      >
        <span class="app-nav__icon">{{ tab.icon }}</span>
        <span class="app-nav__label">{{ tab.name }}</span>
      </button>
    </nav>

    <!-- Modals -->
    <ReleaseConfirm v-if="releaseTarget" :symbol="releaseTarget" @released="onSlotReleased" />
  </div>
</template>

<style scoped>
.app-shell {
  max-width: 640px;
  margin: 0 auto;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text-primary);
}

/* Connection banner */
.conn-banner {
  background: var(--danger);
  color: #fff;
  padding: var(--space-3) var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.conn-banner__icon { font-size: 16px; }

/* Header */
.app-header {
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border);
  padding: var(--space-3) var(--space-4);
  flex-shrink: 0;
}
.app-header__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}
.app-header__brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.app-header__logo { font-size: 20px; }
.app-header__title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--accent);
  letter-spacing: -0.02em;
}
.app-header__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.02em;
}
.status-pill--ok { background: var(--success-soft); color: var(--success); }
.status-pill--lost { background: var(--danger-soft); color: var(--danger); }
.status-pill__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.status-pill--ok .status-pill__dot { animation: pulse 2s ease-in-out infinite; }
.theme-toggle {
  background: transparent;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}
.theme-toggle:hover { background: var(--bg-hover); }

/* Metrics row */
.app-header__metrics {
  display: flex;
  gap: var(--space-4);
}
.metric-chip {
  display: flex;
  flex-direction: column;
}
.metric-chip__label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}
.metric-chip__value {
  font-family: var(--font-mono);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}

/* Main */
.app-main {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3);
  min-height: 0;
}
.page-wrapper { min-height: 100%; }

/* Bottom controls */
.app-controls {
  padding: 0 var(--space-3);
  padding-bottom: var(--space-2);
  flex-shrink: 0;
}

/* Bottom nav */
.app-nav {
  display: flex;
  justify-content: space-around;
  background: var(--bg-elevated);
  border-top: 1px solid var(--border);
  padding: var(--space-1) 0 calc(var(--space-1) + env(safe-area-inset-bottom, 0px));
  flex-shrink: 0;
  position: sticky;
  bottom: 0;
}
.app-nav__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-1) 0;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  transition: color var(--transition-fast);
  min-height: 48px;
}
.app-nav__item:hover { color: var(--text-secondary); }
.app-nav__item--active { color: var(--accent); }
.app-nav__icon { font-size: 20px; line-height: 1; }
.app-nav__label { font-size: 10px; font-weight: 600; letter-spacing: 0.02em; }

/* Vue transitions */
.page-enter-active, .page-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.page-enter-from { opacity: 0; transform: translateY(6px); }
.page-leave-to { opacity: 0; transform: translateY(-4px); }

.banner-enter-active, .banner-leave-active {
  transition: all 0.2s ease;
}
.banner-enter-from, .banner-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
