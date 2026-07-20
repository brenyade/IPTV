// TheSportsDB client (free public API) routed through our /api/json proxy.
// Provides Major-League games, live scores, standings and team lookups, all
// normalized into a single game/team shape used by the Sports section.

import { fetchJson } from './api.js'

const KEY = '3' // free public key
const BASE = `https://www.thesportsdb.com/api/v1/json/${KEY}`

// The sports hub leagues. idLeague values are verified TheSportsDB league ids.
export const LEAGUES = [
  // Soccer
  { key: 'epl', name: 'Premier League', sport: 'Soccer', id: '4328', emoji: '🏴', season: '2025-2026' },
  { key: 'laliga', name: 'La Liga', sport: 'Soccer', id: '4335', emoji: '🇪🇸', season: '2025-2026' },
  { key: 'bundesliga', name: 'Bundesliga', sport: 'Soccer', id: '4331', emoji: '🇩🇪', season: '2025-2026' },
  { key: 'seriea', name: 'Serie A', sport: 'Soccer', id: '4332', emoji: '🇮🇹', season: '2025-2026' },
  { key: 'ligue1', name: 'Ligue 1', sport: 'Soccer', id: '4334', emoji: '🇫🇷', season: '2025-2026' },
  { key: 'ucl', name: 'Champions League', sport: 'Soccer', id: '4480', emoji: '⭐', season: '2025-2026' },
  { key: 'uel', name: 'Europa League', sport: 'Soccer', id: '4481', emoji: '🌟', season: '2025-2026' },
  { key: 'eredivisie', name: 'Eredivisie', sport: 'Soccer', id: '4337', emoji: '🇳🇱', season: '2025-2026' },
  { key: 'primeira', name: 'Primeira Liga', sport: 'Soccer', id: '4344', emoji: '🇵🇹', season: '2025-2026' },
  { key: 'championship', name: 'EFL Championship', sport: 'Soccer', id: '4329', emoji: '🏴', season: '2025-2026' },
  { key: 'efl1', name: 'EFL League One', sport: 'Soccer', id: '4396', emoji: '🏴', season: '2025-2026' },
  { key: 'efl2', name: 'EFL League Two', sport: 'Soccer', id: '4397', emoji: '🏴', season: '2025-2026' },
  { key: 'facup', name: 'FA Cup', sport: 'Soccer', id: '4482', emoji: '🏆', season: '2025-2026' },
  { key: 'seriib', name: 'Serie B', sport: 'Soccer', id: '4394', emoji: '🇮🇹', season: '2025-2026' },
  { key: 'ligue2', name: 'Ligue 2', sport: 'Soccer', id: '4401', emoji: '🇫🇷', season: '2025-2026' },
  { key: 'superlig', name: 'Süper Lig', sport: 'Soccer', id: '4339', emoji: '🇹🇷', season: '2025-2026' },
  { key: 'belpro', name: 'Belgian Pro League', sport: 'Soccer', id: '4338', emoji: '🇧🇪', season: '2025-2026' },
  { key: 'greeksl', name: 'Greek Super League', sport: 'Soccer', id: '4336', emoji: '🇬🇷', season: '2025-2026' },
  { key: 'rpl', name: 'Russian Premier League', sport: 'Soccer', id: '4355', emoji: '🇷🇺', season: '2025-2026' },
  { key: 'ekstraklasa', name: 'Polish Ekstraklasa', sport: 'Soccer', id: '4422', emoji: '🇵🇱', season: '2025-2026' },
  { key: 'csl', name: 'Chinese Super League', sport: 'Soccer', id: '4359', emoji: '🇨🇳', season: '2026' },
  { key: 'aleague', name: 'A-League', sport: 'Soccer', id: '4356', emoji: '🇦🇺', season: '2025-2026' },
  { key: 'argentina', name: 'Argentine Primera', sport: 'Soccer', id: '4406', emoji: '🇦🇷', season: '2026' },
  { key: 'ligamx', name: 'Liga MX', sport: 'Soccer', id: '4350', emoji: '🇲🇽', season: '2026' },
  { key: 'brasil', name: 'Brasileirão', sport: 'Soccer', id: '4351', emoji: '🇧🇷', season: '2026' },
  { key: 'mls', name: 'MLS', sport: 'Soccer', id: '4346', emoji: '🥅', season: '2026' },
  { key: 'worldcup', name: 'FIFA World Cup', sport: 'Soccer', id: '4429', emoji: '🌍', season: '2026' },
  // Basketball
  { key: 'nba', name: 'NBA', sport: 'Basketball', id: '4387', emoji: '🏀', season: '2025-2026' },
  { key: 'wnba', name: 'WNBA', sport: 'Basketball', id: '4516', emoji: '🏀', season: '2026' },
  { key: 'euroleague', name: 'EuroLeague', sport: 'Basketball', id: '4546', emoji: '🏀', season: '2025-2026' },
  { key: 'eurocup', name: 'EuroCup', sport: 'Basketball', id: '4547', emoji: '🏀', season: '2025-2026' },
  { key: 'gleague', name: 'NBA G League', sport: 'Basketball', id: '4388', emoji: '🏀', season: '2025-2026' },
  { key: 'acb', name: 'Liga ACB', sport: 'Basketball', id: '4408', emoji: '🏀', season: '2025-2026' },
  { key: 'nbl', name: 'Australian NBL', sport: 'Basketball', id: '4434', emoji: '🏀', season: '2025-2026' },
  // American Football
  { key: 'nfl', name: 'NFL', sport: 'American Football', id: '4391', emoji: '🏈', season: '2025-2026' },
  { key: 'ncaaf', name: 'NCAA Football', sport: 'American Football', id: '4479', emoji: '🏈', season: '2025-2026' },
  { key: 'cfl', name: 'CFL', sport: 'American Football', id: '4405', emoji: '🏈', season: '2026' },
  { key: 'elf', name: 'European League of Football', sport: 'American Football', id: '5063', emoji: '🏈', season: '2026' },
  // Ice Hockey
  { key: 'nhl', name: 'NHL', sport: 'Ice Hockey', id: '4380', emoji: '🏒', season: '2025-2026' },
  // Baseball
  { key: 'mlb', name: 'MLB', sport: 'Baseball', id: '4424', emoji: '⚾', season: '2026' },
  { key: 'npb', name: 'NPB (Japan)', sport: 'Baseball', id: '4591', emoji: '⚾', season: '2026' },
  { key: 'kbo', name: 'KBO (Korea)', sport: 'Baseball', id: '4830', emoji: '⚾', season: '2026' },
  // Motorsport
  { key: 'f1', name: 'Formula 1', sport: 'Motorsport', id: '4370', emoji: '🏎️', season: '2026' },
  { key: 'motogp', name: 'MotoGP', sport: 'Motorsport', id: '4407', emoji: '🏍️', season: '2026' },
  { key: 'nascar', name: 'NASCAR Cup', sport: 'Motorsport', id: '4393', emoji: '🏁', season: '2026' },
  { key: 'v8', name: 'V8 Supercars', sport: 'Motorsport', id: '4489', emoji: '🏁', season: '2026' },
  { key: 'btcc', name: 'BTCC', sport: 'Motorsport', id: '4372', emoji: '🏁', season: '2026' },
  { key: 'f3', name: 'Formula 3', sport: 'Motorsport', id: '4487', emoji: '🏎️', season: '2026' },
  // Rugby
  { key: 'prem-rugby', name: 'Premiership Rugby', sport: 'Rugby', id: '4414', emoji: '🏉', season: '2025-2026' },
  { key: 'super-rugby', name: 'Super Rugby', sport: 'Rugby', id: '4551', emoji: '🏉', season: '2026' },
  { key: 'six-nations', name: 'Six Nations', sport: 'Rugby', id: '4714', emoji: '🏉', season: '2026' },
  { key: 'nrl', name: 'NRL', sport: 'Rugby', id: '4416', emoji: '🏉', season: '2026' },
  { key: 'currie', name: 'Currie Cup', sport: 'Rugby', id: '5069', emoji: '🏉', season: '2026' },
  // Cricket
  { key: 'ipl', name: 'IPL', sport: 'Cricket', id: '4460', emoji: '🏏', season: '2026' },
  { key: 'bbl', name: 'Big Bash League', sport: 'Cricket', id: '4461', emoji: '🏏', season: '2025-2026' },
  { key: 'cpl', name: 'Caribbean Premier League', sport: 'Cricket', id: '5176', emoji: '🏏', season: '2026' },
  // Tennis
  { key: 'atp', name: 'ATP Tour', sport: 'Tennis', id: '4464', emoji: '🎾', season: '2026' },
  { key: 'wta', name: 'WTA Tour', sport: 'Tennis', id: '4517', emoji: '🎾', season: '2026' },
  // Golf
  { key: 'pga', name: 'PGA Tour', sport: 'Golf', id: '4425', emoji: '⛳', season: '2026' },
  { key: 'euro-golf', name: 'DP World Tour', sport: 'Golf', id: '4426', emoji: '⛳', season: '2026' },
  // Handball
  { key: 'ehf', name: 'EHF Champions League', sport: 'Handball', id: '4980', emoji: '🤾', season: '2025-2026' },
  // Australian Football
  { key: 'afl', name: 'AFL', sport: 'Australian Football', id: '4456', emoji: '🏉', season: '2026' },
  // Fighting
  { key: 'ufc', name: 'UFC', sport: 'Fighting', id: '4443', emoji: '🥊', season: '2026' },
  // ESports
  { key: 'fortnite', name: 'Fortnite', sport: 'ESports', id: '4515', emoji: '🎮', season: '2026' }
]

// Distinct sport categories in hub order.
export const SPORT_CATEGORIES = [...new Set(LEAGUES.map((l) => l.sport))]

// Marquee leagues used for the auto-refreshing ticker / "Live now" aggregation,
// so we don't fan out a request to every league every minute.
export const FEATURED_LEAGUE_IDS = ['4328', '4335', '4331', '4332', '4480', '4387', '4391', '4380', '4424', '4346']

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

// Every live game right now across the major leagues.
export async function liveAcross(leagueIds, dateStr) {
  const all = await todayAcross(leagueIds, dateStr)
  return all.filter((g) => g.state === 'live')
}

// ---- team / player / lineup / timeline / stats / search --------------------
export function normalizeTeam(t) {
  if (!t) return null
  return {
    id: t.idTeam,
    name: t.strTeam,
    badge: t.strTeamBadge || t.strBadge,
    banner: t.strTeamBanner,
    fanart: t.strTeamFanart1,
    league: t.strLeague,
    sport: t.strSport,
    formed: t.intFormedYear,
    stadium: t.strStadium,
    stadiumLoc: t.strStadiumLocation,
    country: t.strCountry,
    capacity: t.intStadiumCapacity,
    website: t.strWebsite,
    color: t.strColour1,
    color2: t.strColour2,
    desc: t.strDescriptionEN
  }
}

export async function lookupTeamFull(id) {
  const d = await get(`/lookupteam.php?id=${id}`)
  return normalizeTeam(d.teams?.[0])
}
export async function teamForm(teamId) {
  const d = await get(`/eventslast.php?id=${teamId}`)
  return (d.results || d.events || []).map(normalizeEvent)
}
export async function teamRoster(teamId) {
  const d = await get(`/lookup_all_players.php?id=${teamId}`)
  return (d.player || []).map(normalizePlayer)
}

export function normalizePlayer(p) {
  if (!p) return null
  return {
    id: p.idPlayer,
    name: p.strPlayer,
    team: p.strTeam,
    teamId: p.idTeam,
    position: p.strPosition,
    number: p.strNumber,
    thumb: p.strThumb || p.strCutout,
    nationality: p.strNationality,
    born: p.dateBorn,
    height: p.strHeight,
    weight: p.strWeight,
    desc: p.strDescriptionEN,
    sport: p.strSport
  }
}
export async function lookupPlayer(id) {
  const d = await get(`/lookupplayer.php?id=${id}`)
  return normalizePlayer(d.players?.[0])
}

export async function lineup(eventId) {
  const d = await get(`/lookuplineup.php?id=${eventId}`)
  const rows = d.lineup || []
  const home = rows.filter((r) => r.strHome === 'Yes')
  const away = rows.filter((r) => r.strHome === 'No')
  const map = (r) => ({
    id: r.idPlayer,
    name: r.strPlayer,
    position: r.strPosition,
    number: r.intSquadNumber,
    sub: r.strSubstitute === 'Yes'
  })
  return { home: home.map(map), away: away.map(map) }
}

export async function eventStats(eventId) {
  const d = await get(`/lookupeventstats.php?id=${eventId}`)
  return (d.eventstats || []).map((s) => ({
    stat: s.strStat,
    home: s.intHome,
    away: s.intAway
  }))
}

export async function timeline(eventId) {
  const d = await get(`/lookuptimeline.php?id=${eventId}`)
  return (d.timeline || []).map((t) => ({
    minute: t.intTime,
    type: t.strTimeline,
    detail: t.strTimelineDetail,
    home: t.strHome === 'Yes',
    player: t.strPlayer,
    assist: t.strAssist,
    comment: t.strComment
  }))
}

export async function searchTeams(q) {
  const d = await get(`/searchteams.php?t=${encodeURIComponent(q)}`)
  return (d.teams || []).map(normalizeTeam)
}
export async function searchPlayers(q) {
  const d = await get(`/searchplayers.php?p=${encodeURIComponent(q)}`)
  return (d.player || []).map(normalizePlayer)
}
export async function searchEvents(q) {
  const d = await get(`/searchevents.php?e=${encodeURIComponent(q)}`)
  return (d.event || []).map(normalizeEvent)
}
