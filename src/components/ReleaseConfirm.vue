<script setup>
import { ref, onMounted } from 'vue'
import { apiPost } from '../services/api'
import { postEvent } from '../tma'

const props = defineProps({ symbol: String })
const emit = defineEmits(['released'])
const show = ref(false)

onMounted(() => { show.value = true })

function close() {
  show.value = false
  emit('released')
}

async function release() {
  try { await apiPost('/api/release_slot', { symbol: props.symbol }) }
  catch (e) { console.error(e) }
  show.value = false
  emit('released')
  postEvent('web_app_trigger_haptic_feedback', { type:'notification', notification_style:'warning' })
}
</script>

<template>
  <Transition name="modal">
    <div v-if="show" class="modal-backdrop" @click.self="close">
      <div class="modal-panel">
        <h3 class="text-lg font-bold text-center mb-2">Release Slot?</h3>
        <p class="text-secondary text-sm text-center mb-4">Close position and remove {{ symbol.split(':')[0] }}</p>
        <div class="flex flex-col gap-2">
          <button class="btn btn-danger btn-block" @click="release">Yes, Release</button>
          <button class="btn btn-ghost btn-block" @click="close">Cancel</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.75);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}
.modal-panel {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  width: 90%;
  max-width: 360px;
  box-shadow: var(--shadow-md);
}

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
