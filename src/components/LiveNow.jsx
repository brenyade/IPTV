import { useEffect, useState } from 'react'
import { LEAGUES, liveAcross } from '../lib/sportsApi.js'
import { Back } from './Icons.jsx'

const today = () => new Date().toISOString().slice(0, 10)

// One screen of every live game across the major leagues, auto-refreshing.
export default function LiveNow({ onBack, onOpenGame }) {
  const [games, setGames] = useState(null)

  useEffect(() => {
    let alive = true
    const load = () => liveAcross(LEAGUES.map((l) => l.id), today()).then((g) => alive && setGames(g)).catch(() => alive && setGames([]))
    load()
    const t = setInterval(load, 30000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  return (
    <div className="page live-now">
      <button className="text-back" onClick={onBack}><Back style={{ width: 18, height: 18 }} /> Sports</button>
      <div className="league-head">
        <span className="league-emoji">🔴</span>
        <h1>Live now</h1>
        <span className="league-sport">across all sports</span>
      </div>

      {games === null ? (
        <div className="empty" style={{ height: 180 }}><div className="spinner" /></div>
      ) : games.length === 0 ? (
        <div className="source-sub">No games are live right now. Check back at game time.</div>
      ) : (
        <div className="livenow-grid">
          {games.map((g) => (
            <button className="livenow-card" key={g.id} onClick={() => onOpenGame(g)}>
              <div className="ln-league">{g.league}</div>
              <div className="ln-team">
                {g.awayBadge && <img src={g.awayBadge} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />}
                <span>{g.away}</span><b>{g.awayScore ?? 0}</b>
              </div>
              <div className="ln-team">
                {g.homeBadge && <img src={g.homeBadge} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />}
                <span>{g.home}</span><b>{g.homeScore ?? 0}</b>
              </div>
              <div className="ln-status">● {g.progress || g.status || 'LIVE'}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
