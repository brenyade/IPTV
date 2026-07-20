// Matches a live game to the IPTV channels airing it.
//
// Primary: scan every channel's EPG for a programme overlapping the game's time
// window whose title mentions the teams. Fallback: channels whose name/group
// matches the game's sport (likely broadcasters) when EPG has no exact match.

import { programmesFor } from './epg.js'
import { SPORT_KEYWORDS } from './sportsApi.js'

const STOP = new Set([
  'the', 'fc', 'sc', 'club', 'city', 'united', 'town', 'de', 'of', 'and', 'los',
  'las', 'new', 'san', 'real', 'ac', 'afc'
])

// Significant lowercase tokens for a team name, plus the full name and nickname.
export function teamTokens(name) {
  if (!name) return []
  const lc = name.toLowerCase()
  const words = lc.split(/[\s.]+/).filter(Boolean)
  const toks = new Set([lc])
  for (const w of words) if (w.length >= 4 && !STOP.has(w)) toks.add(w)
  if (words.length) toks.add(words[words.length - 1]) // nickname (e.g. "dodgers")
  return [...toks]
}

export function channelsForGame(game, channels, epg) {
  if (!epg || !game) return []
  const tokens = [...teamTokens(game.home), ...teamTokens(game.away)]
  const start = game.startMs || Date.now()
  const winA = start - 90 * 60000
  const winB = start + 5 * 3600e3
  const out = []
  const seen = new Set()
  for (const ch of channels) {
    if (seen.has(ch.id)) continue
    const progs = programmesFor(epg, ch.tvgId)
    if (!progs) continue
    for (const p of progs) {
      const end = Number.isFinite(p.stop) ? p.stop : p.start + 30 * 60000
      if (p.start > winB || end < winA) continue
      const title = (p.title || '').toLowerCase()
      if (tokens.some((t) => title.includes(t))) {
        out.push({ channel: ch, programme: p })
        seen.add(ch.id)
        break
      }
    }
  }
  return out
}

// Sport-based fallback: channels that look like they carry this sport.
export function likelyChannels(game, channels, limit = 12) {
  const re = SPORT_KEYWORDS[game.sport]
  if (!re) return []
  return channels.filter((ch) => re.test(ch.name) || re.test(ch.group || '')).slice(0, limit)
}
