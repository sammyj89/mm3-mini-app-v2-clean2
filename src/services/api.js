// api.js – Standalone Web Dashboard API

export function getApiBase() {
  if (window.location.origin && window.location.protocol.startsWith('http')) {
    return window.location.origin;
  }
  return 'http://localhost:8000';
}

export function setApiBase(url) {
  localStorage.setItem('mm3_api_base', url.replace(/\/$/, ''))
}

// 🔧 FIX: No-op autoResolveUrl so App.vue import doesn't crash
// URL is now resolved instantly via window.location.origin
export async function autoResolveUrl() {
  // No longer needed — getApiBase() uses window.location.origin
}

export async function apiGet(path, params = {}) {
  const url = new URL(`${getApiBase()}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v))
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiPost(path, body = {}) {
  const res = await fetch(`${getApiBase()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: Object.keys(body).length ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiPostQuery(path, params = {}) {
  const url = new URL(`${getApiBase()}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v))
  const res = await fetch(url.toString(), {
    method: 'POST',
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export const API_BASE = getApiBase()