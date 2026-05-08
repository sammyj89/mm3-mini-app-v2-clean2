<template>
  <div class="card skeleton-card">
    <div class="skeleton-line wide"></div>
    <div class="skeleton-line medium"></div>
    <div class="skeleton-line short"></div>
    <div class="skeleton-bar"></div>
  </div>
</template>

<style scoped>
.card {
  background: #16213e;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}
.skeleton-line {
  height: 14px;
  background: linear-gradient(90deg, #2a2a4a 25%, #3a3a5a 50%, #2a2a4a 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 6px;
  margin-bottom: 8px;
}
.skeleton-line.wide { width: 80%; }
.skeleton-line.medium { width: 50%; }
.skeleton-line.short { width: 30%; }
.skeleton-bar {
  height: 22px;
  background: linear-gradient(90deg, #2a2a4a 25%, #3a3a5a 50%, #2a2a4a 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
  margin-top: 12px;
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
</style>