<script setup>
import { ref } from 'vue'
import { apiGet, apiPost } from '../services/api'
import { postEvent } from '../tma'

const tradingEnabled = ref(true)

async function toggleTrading() {
  await apiPost('/api/trading/toggle')
  tradingEnabled.value = !tradingEnabled.value
  postEvent('web_app_trigger_haptic_feedback', { type:'impact', impact_style:'medium' })
}

async function dailySummary() {
  const res = await apiGet('/api/trades', { days:1 })
  const trades = res.data || []
  const totalPnl = trades.reduce((s,t)=>s+(t.pnl||0),0)
  const wins = trades.filter(t=>t.pnl>0).length
  const winRate = trades.length ? ((wins/trades.length)*100).toFixed(1) : 0
  window.Telegram?.WebApp?.showPopup({
    title:'Daily Summary', message:`Trades: ${trades.length}\nP&L: ${totalPnl.toFixed(2)} USDT\nWin rate: ${winRate}%`,
    buttons:[{type:'close',text:'OK'}]
  })
}

async function panic() {
  const confirm = window.Telegram?.WebApp?.showPopup ?
    await new Promise(resolve => window.Telegram.WebApp.showPopup({title:'⚠️ Confirm',message:'Execute PANIC?',buttons:[{type:'ok',text:'Yes'},{type:'cancel',text:'No'}]}, resolve)) :
    confirm('Execute PANIC?')
  if (confirm !== 'ok') return
  await apiPost('/api/panic')
  postEvent('web_app_trigger_haptic_feedback', { type:'notification', notification_style:'error' })
}
</script>

<template>
  <div class="card">
    <button :class="['btn', tradingEnabled ? 'stop' : 'start']" @click="toggleTrading">
      {{ tradingEnabled ? '⏸ STOP TRADING' : '▶ START TRADING' }}
    </button>
    <button class="btn" @click="dailySummary">📋 Daily Summary</button>
    <button class="btn panic" @click="panic">⚠️ PANIC</button>
  </div>
</template>

<style scoped>
.card { background:#16213e; border-radius:10px; padding:14px; margin-bottom:10px; }
.btn { width:100%; padding:12px; border:none; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer; margin-bottom:6px; color:#fff; background:#3742fa; }
.start { background:#00ff88; color:#000; }
.stop { background:#ffa502; color:#000; }
.panic { background:#ff4757; }
</style>