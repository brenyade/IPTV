// Thin client for the backend proxy. Everything cross-origin goes through here.

export function streamUrl(url) {
  return `/api/stream?url=${encodeURIComponent(url)}`
}

export async function fetchText(url) {
  const r = await fetch(`/api/fetch?url=${encodeURIComponent(url)}`)
  if (!r.ok) {
    let msg = `HTTP ${r.status}`
    try {
      const j = await r.json()
      if (j.error) msg = j.error
    } catch {}
    throw new Error(msg)
  }
  return r.text()
}

export async function fetchJson(url) {
  const r = await fetch(`/api/json?url=${encodeURIComponent(url)}`)
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`)
  return data
}
