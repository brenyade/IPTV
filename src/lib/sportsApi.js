// TheSportsDB client (free public API) routed through our /api/json proxy.
// Provides Major-League games, live scores, standings and team lookups, all
// normalized into a single game/team shape used by the Sports section.

import { fetchJson } from './api.js'

const KEY = '3' // free public key
const BASE = `https://www.thesportsdb.com/api/v1/json/${KEY}`

// The "major sports" hub. idLeague values are TheSportsDB league ids.
export const LEAGUES = [
  { key: 'nba', name: 'NBA', sport: 'Basketball', id: '4387', emoji: '🏀', season: '2025-2026' },
  { key: 'nfl', name: 'NFL', sport: 'American Football', id: '4391', emoji: '🏈', season: '2025-2026' },
  { key: 'nhl', name: 'NHL', sport: 'Ice Hockey', id: '4380', emoji: '🏒', season: '2025-2026' },
  { key: 'mlb', name: 'MLB', sport: 'Baseball', id: '4424', emoji: '⚾', season: '2026' },
  { key: 'epl', name: 'Premier League', sport: 'Soccer', id: '4328', emoji: '⚽', season: '2025-2026' },
  { key: 'mls', name: 'MLS', sport: 'Soccer', id: '4346', emoji: '🥅', season: '2026' }
]

export const leagueByKey = (k) => LEAGUES.find((l) => l.key === k)
export const leagueById = (id) => LEAGUES.find((l) => l.id === String(id))

// Sport -> keyword regex, used to match IPTV channels to a game's sport.
export const SPORT_KEYWORDS = {
  Basketball: /nba|basketball|hoops/i,
  'American Football': /nfl|american football|gridiron|football network|redzone/i,
  'Ice Hockey': /nhl|hockey/i,
  Baseball: /mlb|baseball/i,
  Soccer: /soccer|football|premier|liga|epl|mls|uefa|champions|futbol/i
}

// ---- caching ----------------------------------------------------------------
const cache = new Map()
const TTL = 90 * 1000
async function get(path) {
  const url = BASE + path
  const c = cache.get(url)
  if (c && Date.now() - c.t < TTL) return c.data
  const data = await fetchJson(url)
  cache.set(url, { t: Date.now(), data })
  return data
}

// ---- normalization ----------------------------------------------------------
function toMs(e) {
  if (e.strTimestamp) {
    const iso = e.strTimestamp.includes('Z') ? e.strTimestamp : e.strTimestamp + 'Z'
    const ms = Date.parse(iso)
    if (Number.isFinite(ms)) return ms
  }
  if (e.dateEvent) {
    const t = e.strTime && e.strTime !== '00:00:00' ? e.strTime : '00:00:00'
    const ms = Date.parse(`${e.dateEvent}T${t}Z`)
    if (Number.isFinite(ms)) return ms
  }
  return NaN
}

function stateOf(e, startMs) {
  const s = (e.strStatus || '').trim().toUpperCase()
  const now = Date.now()
  if (/FT|FINISHED|AET|AOT|\bFINAL\b|ABAND|POSTP|CANC/.test(s)) return 'final'
  if (/^(1H|2H|HT|ET|IN\d|Q\d|P\d|LIVE|\d+H|BREAK)/.test(s)) return 'live'
  if (Number.isFinite(startMs)) {
    if (startMs > now + 60000) return 'upcoming'
    if (now - startMs > 4 * 3600e3) return 'final'
    return e.intHomeScore != null ? 'live' : 'upcoming'
  }
  return 'upcoming'
}

export function normalizeEvent(e) {
  const startMs = toMs(e)
  return {
    id: e.idEvent,
    name: e.strEvent,
    league: e.strLeague,
    leagueId: e.idLeague,
    sport: e.strSport,
    home: e.strHomeTeam,
    away: e.strAwayTeam,
    homeId: e.idHomeTeam,
    awayId: e.idAwayTeam,
    homeBadge: e.strHomeTeamBadge,
    awayBadge: e.strAwayTeamBadge,
    homeScore: e.intHomeScore,
    awayScore: e.intAwayScore,
    venue: e.strVenue,
    thumb: e.strThumb,
    date: e.dateEvent,
    time: e.strTime,
    status: e.strStatus,
    progress: e.strProgress,
    startMs,
    state: stateOf(e, startMs)
  }
}

const sortGames = (a, b) => {
  const rank = { live: 0, upcoming: 1, final: 2 }
  if (rank[a.state] !== rank[b.state]) return rank[a.state] - rank[b.state]
  return (a.startMs || 0) - (b.startMs || 0)
}

// ---- endpoints --------------------------------------------------------------
export async function gamesOnDate(leagueId, dateStr) {
  const d = await get(`/eventsday.php?d=${dateStr}&l=${leagueId}`)
  return (d.events || []).map(normalizeEvent).sort(sortGames)
}
export async function nextGames(leagueId) {
  const d = await get(`/eventsnextleague.php?id=${leagueId}`)
  return (d.events || []).map(normalizeEvent).sort(sortGames)
}
export async function pastGames(leagueId) {
  const d = await get(`/eventspastleague.php?id=${leagueId}`)
  return (d.events || []).map(normalizeEvent).sort(sortGames)
}
export async function lookupEvent(id) {
  const d = await get(`/lookupevent.php?id=${id}`)
  return d.events?.[0] ? normalizeEvent(d.events[0]) : null
}
export async function leagueTable(leagueId, season) {
  const d = await get(`/lookuptable.php?l=${leagueId}&s=${season}`)
  return (d.table || []).map((r) => ({
    rank: r.intRank,
    teamId: r.idTeam,
    team: r.strTeam,
    badge: r.strBadge,
    played: r.intPlayed,
    win: r.intWin,
    loss: r.intLoss,
    draw: r.intDraw,
    points: r.intPoints,
    form: r.strForm
  }))
}
export async function lookupTeam(id) {
  const d = await get(`/lookupteam.php?id=${id}`)
  return d.teams?.[0] || null
}
export async function teamNextGames(teamId) {
  const d = await get(`/eventsnext.php?id=${teamId}`)
  return (d.events || []).map(normalizeEvent).sort(sortGames)
}

// Today's games across several leagues (for the live ticker).
export async function todayAcross(leagueIds, dateStr) {
  const lists = await Promise.all(
    leagueIds.map((id) => gamesOnDate(id, dateStr).catch(() => []))
  )
  return lists.flat().sort(sortGames)
}
