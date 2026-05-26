// api.js – Standalone Web Dashboard API

export function getApiBase() {
  // If accessing over a tunnel or network, API is on the same origin
  if (window.location.origin && window.location.protocol.startsWith('http')) {
    return window.location.origin;
  }
  // Fallback for local development
  return 'http://localhost:8000';
}

export function setApiBase(url) {
  // Keep this for the Settings page manual override if you still want it
  localStorage.setItem('mm3_api_base', url.replace(/\/$/, ''))
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

// Keep for backward compat
export const API_BASE = getApiBase()