<template>
  <div class="card skeleton-card">
    <div class="skeleton-line wide"></div>
    <div class="skeleton-line medium"></div>
    <div class="skeleton-line short"></div>
    <div class="skeleton-bar"></div>
  </div>
</template>

<style scoped>
.skeleton-card { border: 1px solid var(--border); }
.skeleton-line {
  height: 14px;
  background: linear-gradient(90deg, var(--border) 25%, var(--border-subtle) 50%, var(--border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 6px;
  margin-bottom: var(--space-2);
}
.skeleton-line.wide { width: 80%; }
.skeleton-line.medium { width: 50%; }
.skeleton-line.short { width: 30%; }
.skeleton-bar {
  height: 22px;
  background: linear-gradient(90deg, var(--border) 25%, var(--border-subtle) 50%, var(--border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
  margin-top: var(--space-2);
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
</style>
