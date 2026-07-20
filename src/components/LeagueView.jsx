import { useEffect, useMemo, useState } from 'react'
import { gamesOnDate, leagueTable } from '../lib/sportsApi.js'
import { useLeagueBadge } from '../lib/leagueBadges.js'
import { Back } from './Icons.jsx'

function dstr(offsetDays) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}
function label(offset) {
  if (offset === 0) return 'Today'
  if (offset === -1) return 'Yesterday'
  if (offset === 1) return 'Tomorrow'
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

function GameRow({ g, onOpen }) {
  const time =
    g.state === 'live'
      ? g.progress || g.status || 'LIVE'
      : g.state === 'final'
      ? 'Final'
      : g.startMs
      ? new Date(g.startMs).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : 'TBD'
  return (
    <button className="grow" onClick={() => onOpen(g)}>
      <span className={'grow-state ' + g.state}>
        {g.state === 'live' && <span className="livedot">● </span>}
        {time}
      </span>
      {g.home || g.away ? (
        <span className="grow-teams">
          <span className="grow-team">
            {g.awayBadge && <img src={g.awayBadge} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />}
            {g.away}
            {g.state !== 'upcoming' && <b className="grow-score">{g.awayScore ?? 0}</b>}
          </span>
          <span className="grow-team">
            {g.homeBadge && <img src={g.homeBadge} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />}
            {g.home}
            {g.state !== 'upcoming' && <b className="grow-score">{g.homeScore ?? 0}</b>}
          </span>
        </span>
      ) : (
        <span className="grow-teams"><span className="grow-team">{g.name}</span></span>
      )}
      <span className="grow-go">›</span>
    </button>
  )
}

export default function LeagueView({ league, onOpenGame, onBack }) {
  const badge = useLeagueBadge(league.id)
  const [offset, setOffset] = useState(0)
  const [tab, setTab] = useState('games') // games | standings
  const [games, setGames] = useState(null)
  const [table, setTable] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setGames(null)
    gamesOnDate(league.id, dstr(offset))
      .then((g) => alive && setGames(g))
      .catch(() => alive && setGames([]))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [league.id, offset])

  useEffect(() => {
    if (tab !== 'standings' || table) return
    leagueTable(league.id, league.season)
      .then(setTable)
      .catch(() => setTable([]))
  }, [tab, league, table])

  const dayOffsets = [-2, -1, 0, 1, 2, 3, 4]

  return (
    <div className="page league-view">
      <button className="text-back" onClick={onBack}>
        <Back style={{ width: 18, height: 18 }} /> All sports
      </button>

      <div className="league-head">
        {badge ? <img className="league-head-badge" src={badge} alt="" /> : <span className="league-emoji">{league.emoji}</span>}
        <h1>{league.name}</h1>
        <span className="league-sport">{league.sport}</span>
      </div>

      <div className="modal-tabs" style={{ padding: '0 0 8px' }}>
        <button className={'modal-tab' + (tab === 'games' ? ' active' : '')} onClick={() => setTab('games')}>
          Games
        </button>
        <button
          className={'modal-tab' + (tab === 'standings' ? ' active' : '')}
          onClick={() => setTab('standings')}
        >
          Standings
        </button>
      </div>

      {tab === 'games' && (
        <>
          <div className="guide-filters" style={{ padding: '4px 0 12px', borderBottom: 'none' }}>
            {dayOffsets.map((o) => (
              <button
                key={o}
                className={'chip' + (offset === o ? ' active' : '')}
                onClick={() => setOffset(o)}
              >
                {label(o)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="empty" style={{ height: 200 }}>
              <div className="spinner" />
            </div>
          ) : games && games.length ? (
            <div className="glist">
              {games.map((g) => (
                <GameRow key={g.id} g={g} onOpen={onOpenGame} />
              ))}
            </div>
          ) : (
            <div className="source-sub">No games scheduled for {label(offset).toLowerCase()}.</div>
          )}
        </>
      )}

      {tab === 'standings' &&
        (table === null ? (
          <div className="empty" style={{ height: 160 }}>
            <div className="spinner" />
          </div>
        ) : table.length ? (
          <div className="standings">
            <div className="st-row st-head">
              <span>#</span>
              <span className="st-team">Team</span>
              <span>P</span>
              <span>W</span>
              <span>{league.sport === 'Soccer' ? 'D' : 'L'}</span>
              <span>{league.sport === 'Soccer' ? 'Pts' : 'L'}</span>
            </div>
            {table.map((r) => (
              <div className="st-row" key={r.teamId || r.rank}>
                <span>{r.rank}</span>
                <span className="st-team">
                  {r.badge && <img src={r.badge} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />}
                  {r.team}
                </span>
                <span>{r.played}</span>
                <span>{r.win}</span>
                <span>{league.sport === 'Soccer' ? r.draw : r.loss}</span>
                <span>{league.sport === 'Soccer' ? r.points : r.loss}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="source-sub">Standings aren't available for this league right now.</div>
        ))}
    </div>
  )
}
