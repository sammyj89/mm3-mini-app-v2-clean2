// api.js – runtime-configurable API base URL
// The URL is stored in localStorage so it can be updated from the Settings tab
// without rebuilding. Falls back to the compiled-in default.

const COMPILED_DEFAULT = 'https://reprint-sporting-folks-activation.trycloudflare.com'

export function getApiBase() {
  return localStorage.getItem('mm3_api_base') || COMPILED_DEFAULT
}

export function setApiBase(url) {
  localStorage.setItem('mm3_api_base', url.replace(/\/$/, ''))  // strip trailing slash
}

// Keep API_BASE as a named export for backward compat (ScannerView uses it)
export const API_BASE = getApiBase()

export async function apiGet(path, params = {}) {
  const base = getApiBase()
  const url = new URL(`${base}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v))
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiPost(path, body = {}) {
  const base = getApiBase()
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: Object.keys(body).length ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiPostQuery(path, params = {}) {
  const base = getApiBase()
  const url = new URL(`${base}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v))
  const res = await fetch(url.toString(), {
    method: 'POST',
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
