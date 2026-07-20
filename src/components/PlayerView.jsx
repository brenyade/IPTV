import { useEffect, useState } from 'react'
import { lookupPlayer, searchPlayers } from '../lib/sportsApi.js'
import { Back } from './Icons.jsx'

export default function PlayerView({ playerId, playerName, onBack, onOpenTeam }) {
  const [p, setP] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    const done = (pl) => alive && (setP(pl), setLoading(false))
    if (playerId) lookupPlayer(playerId).then(done).catch(() => done(null))
    else if (playerName) searchPlayers(playerName).then((l) => done(l[0] || null)).catch(() => done(null))
    else done(null)
    return () => { alive = false }
  }, [playerId, playerName])

  if (loading) return <div className="page"><button className="text-back" onClick={onBack}><Back style={{ width: 18, height: 18 }} /> Back</button><div className="empty" style={{ height: 200 }}><div className="spinner" /></div></div>
  if (!p) return <div className="page"><button className="text-back" onClick={onBack}><Back style={{ width: 18, height: 18 }} /> Back</button><div className="source-sub">Player details aren't available.</div></div>

  return (
    <div className="page player-view">
      <button className="text-back" onClick={onBack}><Back style={{ width: 18, height: 18 }} /> Back</button>
      <div className="player-hero">
        {p.thumb ? <img className="player-photo" src={p.thumb} alt="" /> : <div className="player-photo placeholder">{(p.name || '?')[0]}</div>}
        <div>
          <h1>{p.name}</h1>
          <div className="team-sub">
            {p.position || ''}{p.team ? ` · ` : ''}
            {p.team && <span className="link" onClick={() => p.teamId && onOpenTeam(p.teamId, p.team)}>{p.team}</span>}
          </div>
        </div>
      </div>
      <div className="stat-grid">
        {p.nationality && <div className="stat"><span>Nationality</span><b>{p.nationality}</b></div>}
        {p.number && <div className="stat"><span>Number</span><b>{p.number}</b></div>}
        {p.born && <div className="stat"><span>Born</span><b>{p.born}</b></div>}
        {p.height && <div className="stat"><span>Height</span><b>{p.height}</b></div>}
        {p.weight && <div className="stat"><span>Weight</span><b>{p.weight}</b></div>}
        {p.sport && <div className="stat"><span>Sport</span><b>{p.sport}</b></div>}
      </div>
      {p.desc && (<><div className="section-title" style={{ paddingLeft: 0 }}>About</div><p className="team-desc">{p.desc}</p></>)}
      <div className="stat-credit">Data by TheSportsDB</div>
    </div>
  )
}
