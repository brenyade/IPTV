import { useEffect, useState } from 'react'
import { lookupTeamFull, teamForm, teamNextGames, teamRoster } from '../lib/sportsApi.js'
import { Back, Heart } from './Icons.jsx'

export default function TeamView({ teamId, teamName, onBack, onOpenGame, onOpenPlayer, favTeams, onToggleFavTeam }) {
  const [team, setTeam] = useState(null)
  const [form, setForm] = useState([])
  const [next, setNext] = useState([])
  const [roster, setRoster] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    lookupTeamFull(teamId).then((t) => alive && (setTeam(t), setLoading(false)))
    teamForm(teamId).then((f) => alive && setForm(f))
    teamNextGames(teamId).then((g) => alive && setNext(g))
    teamRoster(teamId).then((r) => alive && setRoster(r))
    return () => { alive = false }
  }, [teamId])

  const isFav = favTeams.some((t) => t.id === teamId)
  const name = team?.name || teamName

  return (
    <div className="page team-view">
      <button className="text-back" onClick={onBack}><Back style={{ width: 18, height: 18 }} /> Back</button>

      <div className="team-hero" style={team?.color ? { background: `linear-gradient(120deg, ${team.color}55, #141414 70%)` } : undefined}>
        {team?.badge && <img className="team-badge" src={team.badge} alt="" />}
        <div className="team-hero-main">
          <h1>{name || (loading ? 'Loading…' : 'Team')}</h1>
          {team && <div className="team-sub">{team.league} · {team.sport}{team.formed ? ` · est. ${team.formed}` : ''}</div>}
          <button className={'gbtn' + (isFav ? ' on' : '')} style={{ marginTop: 10 }}
            onClick={() => onToggleFavTeam({ id: teamId, name, badge: team?.badge })}>
            <Heart style={{ width: 15, height: 15, verticalAlign: '-2px' }} /> {isFav ? 'Following' : 'Follow team'}
          </button>
        </div>
      </div>

      {team && (
        <div className="stat-grid">
          {team.stadium && <div className="stat"><span>Stadium</span><b>{team.stadium}</b></div>}
          {team.stadiumLoc && <div className="stat"><span>Location</span><b>{team.stadiumLoc}</b></div>}
          {team.capacity && <div className="stat"><span>Capacity</span><b>{Number(team.capacity).toLocaleString()}</b></div>}
          {team.website && <div className="stat"><span>Website</span><b>{team.website}</b></div>}
        </div>
      )}

      {form.length > 0 && (
        <>
          <div className="section-title" style={{ paddingLeft: 0 }}>Recent results</div>
          <div className="glist">
            {form.slice(0, 5).map((g) => (
              <button className="grow" key={g.id} onClick={() => onOpenGame(g)}>
                <span className="grow-state final">Final</span>
                <span className="grow-teams">
                  <span className="grow-team">{g.away}<b className="grow-score">{g.awayScore ?? 0}</b></span>
                  <span className="grow-team">{g.home}<b className="grow-score">{g.homeScore ?? 0}</b></span>
                </span>
                <span className="grow-go">›</span>
              </button>
            ))}
          </div>
        </>
      )}

      {next.length > 0 && (
        <>
          <div className="section-title" style={{ paddingLeft: 0 }}>Upcoming</div>
          <div className="glist">
            {next.slice(0, 5).map((g) => (
              <button className="grow" key={g.id} onClick={() => onOpenGame(g)}>
                <span className="grow-state upcoming">
                  {g.startMs ? new Date(g.startMs).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'TBD'}
                </span>
                <span className="grow-teams">
                  <span className="grow-team">{g.away}</span>
                  <span className="grow-team">{g.home}</span>
                </span>
                <span className="grow-go">›</span>
              </button>
            ))}
          </div>
        </>
      )}

      {roster.length > 0 && (
        <>
          <div className="section-title" style={{ paddingLeft: 0 }}>Squad</div>
          <div className="roster">
            {roster.map((p) => (
              <button className="roster-card" key={p.id} onClick={() => onOpenPlayer(p.id, p.name)}>
                {p.thumb ? <img src={p.thumb} alt="" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} /> : <div className="roster-noimg">{(p.name || '?')[0]}</div>}
                <div className="roster-name">{p.name}</div>
                <div className="roster-pos">{p.position || ''}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {team?.desc && (
        <>
          <div className="section-title" style={{ paddingLeft: 0 }}>About</div>
          <p className="team-desc">{team.desc}</p>
        </>
      )}
      <div className="stat-credit">Data by TheSportsDB</div>
    </div>
  )
}
