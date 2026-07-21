import { useEffect, useMemo, useRef, useState } from 'react'
import { useEpg } from '../lib/epgContext.js'
import {
  lookupEvent,
  lookupTeamFull,
  teamForm,
  lineup as fetchLineup,
  eventStats as fetchStats,
  timeline as fetchTimeline,
  eventBroadcasters,
  countryFlag
} from '../lib/sportsApi.js'
import { channelsForGame, likelyChannels, matchBroadcasterChannels } from '../lib/gameMatch.js'
import { geocode, forecastAt } from '../lib/weather.js'
import { downloadIcs } from '../lib/ics.js'
import { ChLogo } from './ChannelCard.jsx'
import { Back, Play, Heart } from './Icons.jsx'

function TeamBadge({ src, name, onClick }) {
  const [fail, setFail] = useState(false)
  const cls = 'tv-badge' + (onClick ? ' clickable' : '')
  if (src && !fail)
    return <img className={cls} src={src} alt="" onClick={onClick} onError={() => setFail(true)} />
  return (
    <div className={cls + ' placeholder'} onClick={onClick}>
      {(name || '?').slice(0, 3).toUpperCase()}
    </div>
  )
}

// Win/Loss/Draw pill from a team's past event.
function formLetter(ev, teamName) {
  const isHome = ev.home === teamName
  const hs = +ev.homeScore
  const as = +ev.awayScore
  if (!Number.isFinite(hs) || !Number.isFinite(as)) return null
  const my = isHome ? hs : as
  const opp = isHome ? as : hs
  return my > opp ? 'W' : my < opp ? 'L' : 'D'
}

function FormRow({ label, form, teamName }) {
  return (
    <div className="form-row">
      <span className="form-label">{label}</span>
      <div className="form-pills">
        {form.slice(0, 5).map((ev, i) => {
          const l = formLetter(ev, teamName)
          return l ? (
            <span key={i} className={'form-pill ' + l} title={`${ev.name}: ${ev.awayScore}-${ev.homeScore}`}>
              {l}
            </span>
          ) : null
        })}
        {form.length === 0 && <span className="form-none">No recent results</span>}
      </div>
    </div>
  )
}

export default function GameView({
  game: initial,
  channels,
  onPlay,
  onBack,
  favTeams,
  onToggleFavTeam,
  reminders,
  onToggleReminder,
  onMultiview,
  onOpenTeam,
  onOpenPlayer
}) {
  const epg = useEpg()
  const [game, setGame] = useState(initial)
  const [tab, setTab] = useState('overview')
  const [homeTeam, setHomeTeam] = useState(null)
  const [awayTeam, setAwayTeam] = useState(null)
  const [forms, setForms] = useState({ home: [], away: [] })
  const [stats, setStats] = useState(null)
  const [lineups, setLineups] = useState(null)
  const [tl, setTl] = useState(null)
  const [weather, setWeather] = useState(null)
  const [broadcasters, setBroadcasters] = useState(null)

  // Refresh event + teams + form on open.
  useEffect(() => {
    let alive = true
    lookupEvent(initial.id).then((full) => alive && full && setGame((g) => ({ ...g, ...full })))
    if (initial.homeId) {
      lookupTeamFull(initial.homeId).then((t) => alive && setHomeTeam(t))
      teamForm(initial.homeId).then((f) => alive && setForms((p) => ({ ...p, home: f })))
    }
    if (initial.awayId) {
      lookupTeamFull(initial.awayId).then((t) => alive && setAwayTeam(t))
      teamForm(initial.awayId).then((f) => alive && setForms((p) => ({ ...p, away: f })))
    }
    return () => {
      alive = false
    }
  }, [initial.id])

  // Live auto-refresh: poll score + active tab data every 25s while live.
  useEffect(() => {
    if (game.state !== 'live') return
    const t = setInterval(() => {
      lookupEvent(game.id).then((full) => full && setGame((g) => ({ ...g, ...full })))
      if (tab === 'timeline') fetchTimeline(game.id).then(setTl)
      if (tab === 'stats') fetchStats(game.id).then(setStats)
    }, 25000)
    return () => clearInterval(t)
  }, [game.state, game.id, tab])

  // Lazy-load per-tab data.
  useEffect(() => {
    if (tab === 'stats' && stats === null) fetchStats(game.id).then(setStats).catch(() => setStats([]))
    if (tab === 'lineups' && lineups === null)
      fetchLineup(game.id).then(setLineups).catch(() => setLineups({ home: [], away: [] }))
    if (tab === 'timeline' && tl === null) fetchTimeline(game.id).then(setTl).catch(() => setTl([]))
  }, [tab, game.id, stats, lineups, tl])

  // Real TV broadcasters for this game (ESPN, TSN, Sky Sports…).
  useEffect(() => {
    let alive = true
    eventBroadcasters(initial.id).then((b) => alive && setBroadcasters(b)).catch(() => alive && setBroadcasters([]))
    return () => { alive = false }
  }, [initial.id])

  // Gameday weather: geocode the home venue/city, forecast for kickoff.
  useEffect(() => {
    let alive = true
    if (game.state === 'final') return
    const candidates = [homeTeam?.stadiumLoc, game.venue, homeTeam?.country].filter(Boolean)
    if (!candidates.length) return
    geocode(candidates)
      .then((g) => (g ? forecastAt(g.lat, g.lon, game.startMs).then((w) => w && ({ ...w, place: g.name })) : null))
      .then((w) => alive && w && setWeather(w))
      .catch(() => {})
    return () => { alive = false }
  }, [homeTeam, game.venue, game.state, game.startMs])

  // Head-to-head: prior meetings drawn from both teams' recent results.
  const h2h = useMemo(() => {
    const all = [...forms.home, ...forms.away]
    const seen = new Set()
    return all.filter((e) => {
      if (seen.has(e.id)) return false
      seen.add(e.id)
      const teams = [e.home, e.away]
      return teams.includes(game.home) && teams.includes(game.away)
    })
  }, [forms, game.home, game.away])

  const matched = useMemo(() => channelsForGame(game, channels, epg), [game, channels, epg])
  const fallback = useMemo(() => (matched.length ? [] : likelyChannels(game, channels)), [matched, game, channels])
  const watchChannels = matched.length ? matched.map((m) => m.channel) : fallback

  const reminded = reminders.some((r) => r.gameId === game.id)
  const isFav = (id) => favTeams.some((t) => t.id === id)
  const upcoming = game.state === 'upcoming'
  const video = game.strVideo || initial.strVideo

  const fmtDate = game.startMs
    ? new Date(game.startMs).toLocaleString([], {
        weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
      })
    : `${game.date || ''} ${game.time || ''}`
  const statusText =
    game.state === 'live' ? game.progress || game.status || 'LIVE'
    : game.state === 'final' ? 'Final'
    : fmtDate

  // Team-color theming for the scoreboard.
  const grad =
    homeTeam?.color && awayTeam?.color
      ? `linear-gradient(120deg, ${awayTeam.color}44, #1b1b1b 45%, ${homeTeam.color}44)`
      : undefined

  return (
    <div className="page game-view">
      <button className="text-back" onClick={onBack}>
        <Back style={{ width: 18, height: 18 }} /> {game.league}
      </button>

      {/* Scoreboard */}
      <div className={'scoreboard state-' + game.state} style={grad ? { background: grad } : undefined}>
        <div className="sb-team">
          <TeamBadge src={game.awayBadge} name={game.away} onClick={() => onOpenTeam(game.awayId, game.away)} />
          <div className="sb-name link" onClick={() => onOpenTeam(game.awayId, game.away)}>{game.away}</div>
          <button className={'sb-fav' + (isFav(game.awayId) ? ' on' : '')}
            onClick={() => onToggleFavTeam({ id: game.awayId, name: game.away, badge: game.awayBadge })}>
            <Heart style={{ width: 16, height: 16 }} />
          </button>
        </div>
        <div className="sb-center">
          {game.state !== 'upcoming' ? (
            <div className="sb-score"><span>{game.awayScore ?? 0}</span><span className="sb-dash">–</span><span>{game.homeScore ?? 0}</span></div>
          ) : (
            <div className="sb-vs">VS</div>
          )}
          <div className={'sb-status ' + game.state}>{game.state === 'live' && '● '}{statusText}</div>
          {game.venue && <div className="sb-venue">{game.venue}</div>}
        </div>
        <div className="sb-team">
          <TeamBadge src={game.homeBadge} name={game.home} onClick={() => onOpenTeam(game.homeId, game.home)} />
          <div className="sb-name link" onClick={() => onOpenTeam(game.homeId, game.home)}>{game.home}</div>
          <button className={'sb-fav' + (isFav(game.homeId) ? ' on' : '')}
            onClick={() => onToggleFavTeam({ id: game.homeId, name: game.home, badge: game.homeBadge })}>
            <Heart style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="game-actions">
        {upcoming && (
          <button className={'gbtn' + (reminded ? ' on' : '')} onClick={() => onToggleReminder(game)}>
            {reminded ? '✓ Reminder set' : '🔔 Remind me'}
          </button>
        )}
        <button className="gbtn" onClick={() => downloadIcs(game, `${(game.name || 'game').replace(/\W+/g, '_')}.ics`)}>
          📅 Add to calendar
        </button>
        {watchChannels.length > 1 && (
          <button className="gbtn" onClick={() => onMultiview(watchChannels.slice(0, 4))}>⊞ Watch in Multiview</button>
        )}
      </div>

      {/* Tabs */}
      <div className="modal-tabs" style={{ padding: '4px 0 10px' }}>
        {['overview', 'stats', 'lineups', 'timeline', 'h2h'].map((t) => (
          <button key={t} className={'modal-tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>
            {t === 'h2h' ? 'H2H' : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          {weather && (
            <div className="weather-card">
              <span className="wx-emoji">{weather.emoji}</span>
              <div className="wx-main">
                <div className="wx-temp">{weather.tempC}°C · {weather.text}</div>
                <div className="wx-sub">
                  {weather.place ? `${weather.place} · ` : ''}
                  {weather.precip != null ? `${weather.precip}% precip · ` : ''}
                  wind {weather.windKph} km/h
                </div>
              </div>
              <span className="wx-tag">Gameday weather</span>
            </div>
          )}

          {/* Real broadcasters for this game */}
          <div className="section-title" style={{ paddingLeft: 0 }}>📺 Where to watch</div>
          {broadcasters === null ? (
            <div className="empty" style={{ height: 90 }}><div className="spinner" /></div>
          ) : broadcasters.length > 0 ? (
            <div className="watch-list">
              {broadcasters.map((b, i) => {
                const mine = matchBroadcasterChannels(b.channel, channels)
                return (
                  <div className={'watch-item' + (mine.length ? '' : ' no-play')} key={i}
                    onClick={mine.length ? () => onPlay(mine[0]) : undefined}>
                    {b.logo ? <img className="watch-logo" src={b.logo} alt="" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
                      : <div className="watch-logo placeholder">{countryFlag(b.country)}</div>}
                    <div className="watch-main">
                      <div className="watch-name">{b.channel}</div>
                      <div className="watch-sub">
                        {countryFlag(b.country)} {b.country || 'Broadcast'}
                        {mine.length ? ` · in your playlist` : ''}
                      </div>
                    </div>
                    {mine.length ? (
                      <button className="watch-play" onClick={(e) => { e.stopPropagation(); onPlay(mine[0]) }}>
                        <Play style={{ width: 16, height: 16 }} /> Watch
                      </button>
                    ) : (
                      <span className="watch-note">not in your channels</span>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="source-sub">
              No official broadcast listing found for this game
              {watchChannels.length ? '. Based on your playlist it may be on:' : '.'}
            </div>
          )}

          {/* Fallback: EPG-matched / sport channels from the user's playlist */}
          {(broadcasters?.length === 0 || matched.length > 0) && watchChannels.length > 0 && (
            <>
              <div className="section-title" style={{ paddingLeft: 0 }}>
                {matched.length ? 'Airing now on your channels' : 'Sports channels in your playlist'}
              </div>
              <div className="watch-list">
                {watchChannels.map((ch) => {
                  const m = matched.find((x) => x.channel.id === ch.id)
                  return (
                    <div className="watch-item" key={ch.id} onClick={() => onPlay(ch)}>
                      <ChLogo channel={ch} className="watch-logo" />
                      <div className="watch-main">
                        <div className="watch-name">{ch.name}</div>
                        <div className="watch-sub">{m ? m.programme.title : ch.group || 'Sports'}</div>
                      </div>
                      <button className="watch-play" onClick={(e) => { e.stopPropagation(); onPlay(ch) }}>
                        <Play style={{ width: 16, height: 16 }} /> Watch
                      </button>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          <div className="section-title" style={{ paddingLeft: 0 }}>Recent form</div>
          <div className="form-box">
            <FormRow label={game.away} form={forms.away} teamName={game.away} />
            <FormRow label={game.home} form={forms.home} teamName={game.home} />
          </div>

          {video && (
            <>
              <div className="section-title" style={{ paddingLeft: 0 }}>Highlights</div>
              <div className="highlight-wrap">
                <iframe
                  className="highlight-frame"
                  src={ytEmbed(video)}
                  title="Highlights"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </>
          )}

          <div className="section-title" style={{ paddingLeft: 0 }}>Match info</div>
          <div className="stat-grid">
            <div className="stat"><span>League</span><b>{game.league}</b></div>
            <div className="stat"><span>Status</span><b>{statusText}</b></div>
            <div className="stat"><span>Start</span><b>{fmtDate}</b></div>
            <div className="stat"><span>Venue</span><b>{game.venue || '—'}</b></div>
            <div className="stat"><span>Sport</span><b>{game.sport || '—'}</b></div>
          </div>
          <div className="stat-credit">Stats, scores & highlights by TheSportsDB</div>
        </>
      )}

      {tab === 'stats' && <StatsPanel stats={stats} away={game.away} home={game.home} />}
      {tab === 'lineups' && <LineupPanel lineups={lineups} game={game} onOpenPlayer={onOpenPlayer} />}
      {tab === 'timeline' && <TimelinePanel tl={tl} game={game} />}
      {tab === 'h2h' && <H2HPanel h2h={h2h} game={game} />}
    </div>
  )
}

function StatsPanel({ stats, away, home }) {
  if (stats === null) return <div className="empty" style={{ height: 140 }}><div className="spinner" /></div>
  if (!stats.length) return <div className="source-sub">No stats available for this match yet.</div>
  return (
    <div className="statbars">
      <div className="statbars-head"><span>{away}</span><span>{home}</span></div>
      {stats.map((s, i) => {
        const h = +s.home || 0
        const a = +s.away || 0
        const tot = h + a || 1
        return (
          <div className="statbar" key={i}>
            <span className="sbnum">{s.away ?? 0}</span>
            <div className="sbtrack">
              <div className="sbfill away" style={{ width: `${(a / tot) * 100}%` }} />
              <div className="sblabel">{s.stat}</div>
              <div className="sbfill home" style={{ width: `${(h / tot) * 100}%` }} />
            </div>
            <span className="sbnum">{s.home ?? 0}</span>
          </div>
        )
      })}
    </div>
  )
}

function LineupPanel({ lineups, game, onOpenPlayer }) {
  if (lineups === null) return <div className="empty" style={{ height: 140 }}><div className="spinner" /></div>
  if (!lineups.home.length && !lineups.away.length)
    return <div className="source-sub">Lineups aren't published for this match.</div>
  const Col = ({ title, list }) => (
    <div className="lineup-col">
      <div className="lineup-team">{title}</div>
      {list.map((p) => (
        <button key={p.id + p.name} className="lineup-player" onClick={() => onOpenPlayer(p.id, p.name)}>
          <span className="lp-num">{p.number || '–'}</span>
          <span className="lp-name">{p.name}</span>
          <span className="lp-pos">{p.sub ? 'SUB' : p.position}</span>
        </button>
      ))}
    </div>
  )
  return (
    <div className="lineups">
      <Col title={game.away} list={lineups.away} />
      <Col title={game.home} list={lineups.home} />
    </div>
  )
}

function TimelinePanel({ tl, game }) {
  if (tl === null) return <div className="empty" style={{ height: 140 }}><div className="spinner" /></div>
  if (!tl.length) return <div className="source-sub">No play-by-play events yet.</div>
  const icon = (t) => (/goal/i.test(t) ? '⚽' : /card/i.test(t) ? '🟨' : /subst/i.test(t) ? '🔁' : '•')
  return (
    <div className="timeline">
      {tl.map((e, i) => (
        <div className={'tl-item' + (e.home ? ' home' : ' away')} key={i}>
          <span className="tl-min">{e.minute ? e.minute + "'" : ''}</span>
          <span className="tl-icon">{icon(e.type)}</span>
          <span className="tl-text">
            <b>{e.detail || e.type}</b>
            {e.player ? ` — ${e.player}` : ''}
            {e.assist ? ` (assist ${e.assist})` : ''}
          </span>
          <span className="tl-side">{e.home ? game.home : game.away}</span>
        </div>
      ))}
    </div>
  )
}

function H2HPanel({ h2h, game }) {
  if (!h2h.length) return <div className="source-sub">No recent head-to-head meetings found.</div>
  let homeW = 0, awayW = 0, draws = 0
  for (const e of h2h) {
    const hs = +e.homeScore, as = +e.awayScore
    if (!Number.isFinite(hs) || !Number.isFinite(as)) continue
    const winner = hs > as ? e.home : as > hs ? e.away : null
    if (!winner) draws++
    else if (winner === game.home) homeW++
    else awayW++
  }
  return (
    <div className="h2h">
      <div className="h2h-summary">
        <div className="h2h-side"><b>{homeW}</b><span>{game.home}</span></div>
        <div className="h2h-side draw"><b>{draws}</b><span>Draws</span></div>
        <div className="h2h-side"><b>{awayW}</b><span>{game.away}</span></div>
      </div>
      <div className="glist">
        {h2h.map((e) => (
          <div className="grow" key={e.id} style={{ cursor: 'default' }}>
            <span className="grow-state final">{e.date || 'Final'}</span>
            <span className="grow-teams">
              <span className="grow-team">{e.away}<b className="grow-score">{e.awayScore ?? 0}</b></span>
              <span className="grow-team">{e.home}<b className="grow-score">{e.homeScore ?? 0}</b></span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ytEmbed(url) {
  const m = /(?:v=|youtu\.be\/|embed\/)([\w-]{11})/.exec(url || '')
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : url
}
