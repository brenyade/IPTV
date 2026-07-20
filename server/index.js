// Express backend for the YouTube-TV-style IPTV player.
//
// The browser cannot fetch most IPTV M3U playlists or Xtream Codes APIs directly
// because those servers rarely send CORS headers. This lightweight server acts as
// a same-origin proxy: the React app talks only to /api/* here, and we do the
// cross-origin fetching (and optional stream relaying) server-side.

import express from 'express'
import cors from 'cors'
import compression from 'compression'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 5174
const isProd = process.env.NODE_ENV === 'production'

app.use(cors())
app.use(compression())
app.use(express.json({ limit: '2mb' }))

// A browser-ish UA — some IPTV panels reject the default fetch UA.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

function fetchWithTimeout(url, opts = {}, ms = 20000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(t))
}

// ---- Raw text fetch (used for M3U/M3U8 playlists) ---------------------------
app.get('/api/fetch', async (req, res) => {
  const target = req.query.url
  if (!target) return res.status(400).json({ error: 'Missing url' })
  try {
    const r = await fetchWithTimeout(target, {
      headers: { 'User-Agent': UA, Accept: '*/*' }
    })
    if (!r.ok) return res.status(r.status).json({ error: `Upstream ${r.status}` })
    const text = await r.text()
    res.type('text/plain').send(text)
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) })
  }
})

// ---- JSON fetch (used for the Xtream Codes player_api.php) -------------------
app.get('/api/json', async (req, res) => {
  const target = req.query.url
  if (!target) return res.status(400).json({ error: 'Missing url' })
  try {
    const r = await fetchWithTimeout(target, {
      headers: { 'User-Agent': UA, Accept: 'application/json,*/*' }
    })
    const text = await r.text()
    if (!r.ok) return res.status(r.status).json({ error: `Upstream ${r.status}`, body: text.slice(0, 300) })
    try {
      res.json(JSON.parse(text))
    } catch {
      res.status(502).json({ error: 'Upstream did not return JSON', body: text.slice(0, 300) })
    }
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) })
  }
})

// ---- Stream relay -----------------------------------------------------------
// Relays HLS manifests (.m3u8), segments (.ts/.aac) and direct media. For HLS
// manifests we rewrite child URLs to keep flowing through this proxy so that
// nested playlists / segments also avoid CORS + mixed-content issues.
app.get('/api/stream', async (req, res) => {
  const target = req.query.url
  if (!target) return res.status(400).send('Missing url')
  try {
    const upstream = await fetchWithTimeout(target, {
      headers: {
        'User-Agent': UA,
        Accept: '*/*',
        // Some servers gate segments behind a Referer/Origin.
        Referer: new URL(target).origin + '/'
      }
    }, 30000)

    if (!upstream.ok) return res.status(upstream.status).send(`Upstream ${upstream.status}`)

    const ct = (upstream.headers.get('content-type') || '').toLowerCase()
    const isManifest =
      ct.includes('mpegurl') ||
      ct.includes('vnd.apple') ||
      target.toLowerCase().split('?')[0].endsWith('.m3u8')

    if (isManifest) {
      const body = await upstream.text()
      const base = target
      const rewritten = body
        .split('\n')
        .map((line) => {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith('#')) {
            // Rewrite URI="..." attributes (keys, media, etc.)
            return line.replace(/URI="([^"]+)"/g, (m, uri) => {
              try {
                const abs = new URL(uri, base).href
                return `URI="/api/stream?url=${encodeURIComponent(abs)}"`
              } catch {
                return m
              }
            })
          }
          try {
            const abs = new URL(trimmed, base).href
            return `/api/stream?url=${encodeURIComponent(abs)}`
          } catch {
            return line
          }
        })
        .join('\n')
      res.type('application/vnd.apple.mpegurl').send(rewritten)
      return
    }

    // Binary passthrough for segments / direct media.
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream')
    const len = upstream.headers.get('content-length')
    if (len) res.setHeader('Content-Length', len)
    res.setHeader('Cache-Control', 'no-cache')
    const reader = upstream.body.getReader()
    res.on('close', () => reader.cancel().catch(() => {}))
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!res.write(Buffer.from(value))) {
        await new Promise((r) => res.once('drain', r))
      }
    }
    res.end()
  } catch (e) {
    if (!res.headersSent) res.status(502).send(String(e.message || e))
    else res.end()
  }
})

app.get('/api/health', (_req, res) => res.json({ ok: true }))

// ---- Serve the built SPA in production --------------------------------------
if (isProd) {
  const dist = path.join(__dirname, '..', 'dist')
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

app.listen(PORT, () => {
  console.log(`IPTV backend listening on http://localhost:${PORT}  (${isProd ? 'production' : 'dev'})`)
})
