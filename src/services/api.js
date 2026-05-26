// api.js – Standalone Manual-Override API

// Fallback only (used if nothing is in localStorage)
const COMPILED_DEFAULT = 'http://localhost:8000'

export function getApiBase() {
  return localStorage.getItem('mm3_api_base') || COMPILED_DEFAULT
}

export function setApiBase(url) {
  localStorage.setItem('mm3_api_base', url.replace(/\/$/, ''))
}

export function clearApiBase() {
  localStorage.removeItem('mm3_api_base')
}

export async function apiGet(path, params = {}) {
  const url = new URL(`${getApiBase()}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v))
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) }) // 8s timeout
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiPost(path, body = {}) {
  const res = await fetch(`${getApiBase()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: Object.keys(body).length ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60000),  // 🔧 FIX: 60s for rotation/scanner
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiPostQuery(path, params = {}) {
  const url = new URL(`${getApiBase()}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v))
  const res = await fetch(url.toString(), {
    method: 'POST',
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// Keep for backward compat
export const API_BASE = getApiBase()

// No-op so App.vue doesn't crash if it imports it
export async function autoResolveUrl() {}