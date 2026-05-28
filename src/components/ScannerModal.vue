<script setup>
import { ref } from 'vue'
import { apiGet, apiPost, apiPostQuery } from '../services/api'
import { postEvent } from '../tma'

const emit = defineEmits(['slotChanged'])

const showPicks   = ref(false)
const showSlots   = ref(false)
const picks = ref([])
const chosenSymbol = ref('')
const slots = ref({})
const loading = ref(false)

// Helper popup
function showPopup(params) {
  return new Promise(resolve => {
    if (window.Telegram?.WebApp?.showPopup) {
      window.Telegram.WebApp.showPopup(params, resolve)
    } else {
      resolve(confirm(params.message) ? 'ok' : 'cancel')
    }
  })
}

async function startScan() {
  const res = await showPopup({ title:'Scanner', message:'Run scanner now?', buttons:[{type:'ok',text:'Yes'},{type:'cancel',text:'No'}] })
  if (res !== 'ok') return

  loading.value = true
  try {
    const data = await apiPost('/api/run_screener')
    // API may return { picks: [...] } or a flat array
    const rawPicks = Array.isArray(data.data) ? data.data
      : (data.data?.picks || data.picks || [])
    if (data.success && rawPicks.length) {
      picks.value = rawPicks
      showPicks.value = true
    } else {
      await showPopup({ title:'No Picks', message:'Scanner found no suitable pairs.', buttons:[{type:'close',text:'OK'}] })
    }
  } catch(e) {
    await showPopup({ title:'Error', message: e.message || 'Scan failed', buttons:[{type:'close',text:'OK'}] })
  } finally {
    loading.value = false
  }
  postEvent('web_app_trigger_haptic_feedback', { type:'impact', impact_style:'medium' })
}

async function pickPair(symbol) {
  chosenSymbol.value = symbol
  showPicks.value = false
  const res = await apiGet('/api/status_all')
  if (res.success) slots.value = res.data
  showSlots.value = true
}

async function selectSlot(slot) {
  showSlots.value = false
  try {
    if (slot === 'new') {
      await apiPost('/api/symbol', { symbol: chosenSymbol.value })
    } else {
      // Use query-param POST to match backend expectation
      await apiPostQuery('/api/rotate_symbol', { old: slot, new: chosenSymbol.value })
    }
    emit('slotChanged')
    postEvent('web_app_trigger_haptic_feedback', { type:'notification', notification_style:'success' })
  } catch(e) {
    await showPopup({ title:'Error', message: e.message || 'Action failed', buttons:[{type:'close',text:'OK'}] })
  }
}
</script>

<template>
  <div>
    <button class="btn scanner-btn" @click="startScan" :disabled="loading">
      {{ loading ? '⏳ Scanning...' : '📡 Run Scanner' }}
    </button>

    <!-- Pick Modal -->
    <div v-if="showPicks" class="modal">
      <div class="modal-content">
        <h3>Select a Pair</h3>
        <button v-for="p in picks" :key="p.symbol" class="btn" @click="pickPair(p.symbol)">
          {{ p.symbol }} (Score: {{ p.score.toFixed(2) }})
        </button>
        <button class="btn" @click="showPicks=false">Cancel</button>
      </div>
    </div>

    <!-- Slot Modal -->
    <div v-if="showSlots" class="modal">
      <div class="modal-content">
        <h3>Choose slot for {{ chosenSymbol }}</h3>
        <button v-for="(data, sym) in slots" :key="sym" class="btn" @click="selectSlot(sym)">
          Replace {{ sym.split(':')[0] }}
        </button>
        <button v-if="Object.keys(slots).length < 3" class="btn" @click="selectSlot('new')">➕ Add as new slot</button>
        <button class="btn" @click="showSlots=false">Cancel</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scanner-btn { width:100%; margin-bottom:10px; }
.scanner-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.modal { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:flex; justify-content:center; align-items:center; z-index:1000; }
.modal-content { background:#16213e; border-radius:12px; padding:20px; width:90%; max-width:400px; }
.modal-content h3 { color:#00d4ff; margin-bottom:12px; }
.modal-content .btn { margin-bottom:8px; }
</style>
