import { ref, watchEffect } from 'vue'

export function useAnimatedNumber(targetRef, duration = 600) {
  const display = ref(targetRef.value)
  let animFrame = null

  watchEffect(() => {
    const start = display.value
    const end = targetRef.value
    const startTime = performance.now()
    
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1)
      display.value = start + (end - start) * progress
      if (progress < 1) animFrame = requestAnimationFrame(step)
    }
    cancelAnimationFrame(animFrame)
    animFrame = requestAnimationFrame(step)
  })

  return display
}