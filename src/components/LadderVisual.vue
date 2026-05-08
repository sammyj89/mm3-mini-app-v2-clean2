<script setup>
import { ref, watch, onMounted } from 'vue'
import { apiGet } from '../services/api'

const props = defineProps({ symbol: String })
const ladderData = ref(null)
const loading = ref(false)

async function loadLadder() {
  if (!props.symbol) return
  loading.value = true
  try {
    const res = await apiGet('/api/ladder_detail', { symbol: props.symbol })
    if (res.success) {
      ladderData.value = res.data
    }
  } catch (e) {
    console.error(e)
  }
  loading.value = false
}

watch(() => props.symbol, loadLadder, { immediate: true })
</script>

<template>
  <div class="card">
    <h3>🪜 Ladder Depth</h3>
    <div v-if="!symbol">Select a slot first.</div>
    <div v-else-if="loading">Loading…</div>
    <div v-else-if="ladderData">
      <p class="anchor">Anchor: {{ Number(ladderData.anchor).toFixed(6) }}</p>
      <div class="ladder-bars">
        <div v-for="level in ladderData.levels" :key="level.level"
             :class="['level-bar', { filled: level.filled }]">
          <span class="level-num">{{ level.level }}</span>
          <span class="level-price">{{ Number(level.price).toFixed(6) }}</span>
          <span class="level-status">{{ level.filled ? 'FILLED' : '' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card { background:#16213e; border-radius:12px; padding:16px; margin-bottom:12px; box-shadow:0 2px 8px rgba(0,0,0,0.3); }
h3 { color:#00d4ff; font-size:14px; margin-bottom:10px; text-transform:uppercase; }
.anchor { font-family: monospace; font-size:12px; color:#8888aa; margin-bottom:8px; }
.ladder-bars { display:flex; flex-direction:column-reverse; gap:4px; }
.level-bar { display:flex; justify-content:space-between; align-items:center; padding:4px 8px; border-radius:6px; background:#1a1a2e; font-family:monospace; font-size:11px; }
.level-bar.filled { background:#00ff8822; border-left:3px solid #00ff88; }
.level-num { width:30px; color:#8888aa; }
.level-price { flex:1; }
.level-status { color:#00ff88; font-weight:bold; }
</style>