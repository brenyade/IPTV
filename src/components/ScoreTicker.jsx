import { useEffect, useState } from 'react'
import { LEAGUES, todayAcross } from '../lib/sportsApi.js'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

// Auto-refreshing horizontal ticker of today's games across the major leagues.
export default function ScoreTicker({ onOpenGame }) {
  const [games, setGames] = useState([])

  useEffect(() => {
    let alive = true
    const load = () =>
      todayAcross(LEAGUES.map((l) => l.id), todayStr())
        .then((g) => alive && setGames(g))
        .catch(() => {})
    load()
    const t = setInterval(load, 60000) // refresh every minute
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])

  if (!games.length) return null

  return (
    <div className="ticker">
      <div className="ticker-label">SCORES</div>
      <div className="ticker-track">
        {games.map((g) => (
          <button key={g.id} className="ticker-item" onClick={() => onOpenGame(g)}>
            <span className={'ticker-state ' + g.state}>
              {g.state === 'live' ? (g.progress || g.status || 'LIVE') : g.state === 'final' ? 'FINAL' : timeOf(g)}
            </span>
            <span className="ticker-teams">
              {abbr(g.away)} {g.awayScore ?? ''}{g.state !== 'upcoming' ? ' @ ' : ' @ '}{abbr(g.home)} {g.homeScore ?? ''}
            </span>
            <span className="ticker-league">{g.league}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function timeOf(g) {
  if (!g.startMs) return 'TBD'
  return new Date(g.startMs).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}
function abbr(name) {
  if (!name) return ''
  const w = name.split(' ')
  return w[w.length - 1]
}
