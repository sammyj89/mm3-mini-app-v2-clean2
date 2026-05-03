<script setup>
import { ref } from 'vue'
import { apiPost } from '../services/api'
import { postEvent } from '../tma'

const emit = defineEmits(['released'])
const show = ref(false)

function open() { show.value = true }
function close() { show.value = false }

async function release(sym) {
  close()
  await apiPost('/api/release_slot', { symbol: sym })
  emit('released')
  postEvent('web_app_trigger_haptic_feedback', { type:'notification', notification_style:'warning' })
}
</script>

<template>
  <div v-if="show" class="modal" @click.self="close">
    <div class="modal-content">
      <h3>Release Slot?</h3>
      <p>Close position and remove {{ symbol }}</p>
      <button class="btn" @click="release(symbol)">Yes</button>
      <button class="btn cancel" @click="close">No</button>
    </div>
  </div>
</template>

<style scoped>
.modal { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:flex; justify-content:center; align-items:center; z-index:2000; }
.modal-content { background:#16213e; border-radius:12px; padding:20px; width:90%; max-width:400px; text-align:center; }
h3 { color:#00d4ff; }
.btn { margin-top:8px; width:100%; padding:12px; border:none; border-radius:8px; font-size:16px; color:#fff; background:#3742fa; cursor:pointer; }
.cancel { background:#555; }
</style>