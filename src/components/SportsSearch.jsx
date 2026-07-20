import { useEffect, useState } from 'react'
import { searchTeams, searchPlayers, searchEvents } from '../lib/sportsApi.js'
import { Back } from './Icons.jsx'

export default function SportsSearch({ onBack, onOpenTeam, onOpenPlayer, onOpenGame }) {
  const [q, setQ] = useState('')
  const [res, setRes] = useState({ teams: [], players: [], events: [] })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const term = q.trim()
    if (term.length < 3) {
      setRes({ teams: [], players: [], events: [] })
      return
    }
    setBusy(true)
    const t = setTimeout(async () => {
      const [teams, players, events] = await Promise.all([
        searchTeams(term).catch(() => []),
        searchPlayers(term).catch(() => []),
        searchEvents(term).catch(() => [])
      ])
      setRes({ teams: teams.filter(Boolean).slice(0, 12), players: players.filter(Boolean).slice(0, 12), events: events.slice(0, 12) })
      setBusy(false)
    }, 350)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div className="page sports-search">
      <button className="text-back" onClick={onBack}><Back style={{ width: 18, height: 18 }} /> Sports</button>
      <div className="nav-search" style={{ width: '100%', maxWidth: 560, margin: '6px 0 18px' }}>
        <input autoFocus placeholder="Search teams, players, matches…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {busy && <div className="source-sub">Searching…</div>}

      {res.teams.length > 0 && (
        <>
          <div className="section-title" style={{ paddingLeft: 0 }}>Teams</div>
          <div className="roster">
            {res.teams.map((t) => (
              <button key={t.id} className="roster-card" onClick={() => onOpenTeam(t.id, t.name)}>
                {t.badge ? <img src={t.badge} alt="" /> : <div className="roster-noimg">{(t.name || '?')[0]}</div>}
                <div className="roster-name">{t.name}</div>
                <div className="roster-pos">{t.league || t.sport}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {res.players.length > 0 && (
        <>
          <div className="section-title" style={{ paddingLeft: 0 }}>Players</div>
          <div className="roster">
            {res.players.map((p) => (
              <button key={p.id} className="roster-card" onClick={() => onOpenPlayer(p.id, p.name)}>
                {p.thumb ? <img src={p.thumb} alt="" /> : <div className="roster-noimg">{(p.name || '?')[0]}</div>}
                <div className="roster-name">{p.name}</div>
                <div className="roster-pos">{p.team || p.position}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {res.events.length > 0 && (
        <>
          <div className="section-title" style={{ paddingLeft: 0 }}>Matches</div>
          <div className="glist">
            {res.events.map((g) => (
              <button className="grow" key={g.id} onClick={() => onOpenGame(g)}>
                <span className={'grow-state ' + g.state}>{g.date || ''}</span>
                <span className="grow-teams">
                  <span className="grow-team">{g.away}{g.awayScore != null && <b className="grow-score">{g.awayScore}</b>}</span>
                  <span className="grow-team">{g.home}{g.homeScore != null && <b className="grow-score">{g.homeScore}</b>}</span>
                </span>
                <span className="grow-go">›</span>
              </button>
            ))}
          </div>
        </>
      )}

      {q.trim().length >= 3 && !busy && !res.teams.length && !res.players.length && !res.events.length && (
        <div className="source-sub">No results for “{q}”.</div>
      )}
    </div>
  )
}
