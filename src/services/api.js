// api.js – auto-resolving tunnel URL
//
// Resolution order:
//   1. localStorage override (set manually in Settings)
//   2. GitHub Gist (auto-updated by start_tunnel.sh on every bot restart)
//   3. Compiled-in default (fallback)
//
// The Gist check runs once on app load and updates localStorage automatically.

const COMPILED_DEFAULT = 'https://reprint-sporting-folks-activation.trycloudflare.com'

// Set VITE_GIST_ID in your .env.local → VITE_GIST_ID=abc123
const GIST_ID = import.meta.env.VITE_GIST_ID || ''

export function getApiBase() {
  return localStorage.getItem('mm3_api_base') || COMPILED_DEFAULT
}

export function setApiBase(url) {
  localStorage.setItem('mm3_api_base', url.replace(/\/$/, ''))
}

// Called once on app load — silently updates URL from Gist if available
export async function autoResolveUrl() {
  if (!GIST_ID) return
  try {
    const res = await fetch(
      `https://api.github.com/gists/${GIST_ID}`,
      { headers: { Accept: 'application/vnd.github.v3+json' }, signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return
    const data = await res.json()
    const content = data?.files?.['tunnel_url.txt']?.content?.trim()
    if (content && content.startsWith('https://')) {
      const current = localStorage.getItem('mm3_api_base')
      if (current !== content) {
        console.log(`[api] Auto-updated tunnel URL: ${content}`)
        setApiBase(content)
      }
    }
  } catch (e) {
    // Gist unreachable — keep existing URL, no disruption
  }
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

// Keep for backward compat (ScannerView uses it)
export const API_BASE = getApiBase()