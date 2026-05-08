<script setup>
import { ref, watch, onMounted } from 'vue'
import { apiGet, apiPost } from '../services/api'

const props = defineProps({ symbol: String })
const orders = ref([])
const loading = ref(false)

async function fetchOrders() {
  if (!props.symbol) return
  loading.value = true
  try {
    const res = await apiGet('/api/open_ladder_orders', { symbol: props.symbol })
    if (res.success) {
      orders.value = res.data || []
    }
  } catch (e) { console.error(e) }
  loading.value = false
}

watch(() => props.symbol, fetchOrders, { immediate: true })

async function cancelOrder(orderId) {
  try {
    await apiPost('/api/cancel_order', { order_id: orderId, symbol: props.symbol })
    orders.value = orders.value.filter(o => o.id !== orderId)
  } catch (e) { console.error(e) }
}
</script>

<template>
  <div class="card">
    <h3>📜 Open Ladder Orders</h3>
    <div v-if="!symbol">Select a slot first.</div>
    <div v-else-if="loading">Loading…</div>
    <div v-else>
      <div v-if="orders.length === 0" class="empty">No open ladder orders.</div>
      <div v-for="o in orders" :key="o.id" class="order-row">
        <span class="o-price">${{ Number(o.price).toFixed(6) }}</span>
        <span class="o-qty">{{ o.qty }}</span>
        <button class="cancel-btn" @click="cancelOrder(o.id)">❌</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card { background:#16213e; border-radius:12px; padding:16px; margin-bottom:12px; box-shadow:0 2px 8px rgba(0,0,0,0.3); }
h3 { color:#00d4ff; font-size:14px; margin-bottom:10px; text-transform:uppercase; }
.empty { font-size:12px; color:#8888aa; }
.order-row { display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid #2a2a4a; }
.o-price, .o-qty { font-family:monospace; font-size:12px; }
.cancel-btn { background:transparent; border:none; color:#ff4757; cursor:pointer; font-size:14px; }
</style>