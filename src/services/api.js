// Points to your LIVE main bot – no sandbox

const API_BASE = 'https://involves-memory-msie-kenny.trycloudflare.com'

export async function apiGet(path, params = {}) {
  const url = new URL(`${API_BASE}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v))
  const res = await fetch(url)
  return res.json()
}

export async function apiPost(path, body = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: Object.keys(body).length ? JSON.stringify(body) : undefined
  })
  return res.json()
}

// New: POST with query parameters (for endpoints like /api/rotate_symbol?old=...&new=...)
export async function apiPostQuery(path, params = {}) {
  const url = new URL(`${API_BASE}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v))
  const res = await fetch(url.toString(), { method: 'POST' })
  return res.json()
}
