// Sports news via ESPN's public site API (no key), routed through our proxy.

import { fetchJson } from './api.js'

// Feed label -> ESPN {sport}/{league} path.
export const NEWS_FEEDS = [
  { label: 'Top', path: 'soccer/eng.1' },
  { label: 'NBA', path: 'basketball/nba' },
  { label: 'NFL', path: 'football/nfl' },
  { label: 'NHL', path: 'hockey/nhl' },
  { label: 'MLB', path: 'baseball/mlb' },
  { label: 'Soccer', path: 'soccer/uefa.champions' },
  { label: 'La Liga', path: 'soccer/esp.1' },
  { label: 'MLS', path: 'soccer/usa.1' }
]

function normalize(a, feedLabel) {
  return {
    id: a.id || a.headline,
    headline: a.headline,
    description: a.description,
    published: a.published,
    image: a.images?.[0]?.url || '',
    link: a.links?.web?.href || a.links?.mobile?.href || '',
    category: feedLabel,
    byline: a.byline
  }
}

export async function fetchFeed(path, label) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${path}/news`
  const d = await fetchJson(url).catch(() => ({}))
  return (d.articles || []).map((a) => normalize(a, label))
}

// Aggregate the marquee feeds, de-duped and sorted newest-first.
export async function fetchTopNews() {
  const lists = await Promise.all(NEWS_FEEDS.slice(0, 6).map((f) => fetchFeed(f.path, f.label)))
  const seen = new Set()
  const out = []
  for (const item of lists.flat()) {
    const k = item.headline
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(item)
  }
  return out.sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0))
}
