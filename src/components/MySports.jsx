import { useEffect, useState } from 'react'
import { teamNextGames } from '../lib/sportsApi.js'
import { downloadIcs } from '../lib/ics.js'
import { Back } from './Icons.jsx'

// Personalized dashboard: followed teams, their next games, and your reminders.
export default function MySports({ favTeams, reminders, onBack, onOpenGame, onOpenTeam, onToggleReminder }) {
  const [teamGames, setTeamGames] = useState([])

  useEffect(() => {
    let alive = true
    if (!favTeams.length) return setTeamGames([])
    Promise.all(favTeams.map((t) => teamNextGames(t.id).then((g) => g.slice(0, 2)).catch(() => []))).then(
      (lists) => alive && setTeamGames(lists.flat())
    )
    return () => { alive = false }
  }, [favTeams])

  const upcomingReminders = [...reminders].sort((a, b) => (a.startMs || 0) - (b.startMs || 0))

  return (
    <div className="page my-sports">
      <button className="text-back" onClick={onBack}><Back style={{ width: 18, height: 18 }} /> Sports</button>
      <div className="league-head">
        <span className="league-emoji">⭐</span>
        <h1>My Sports</h1>
      </div>

      <div className="section-title" style={{ paddingLeft: 0 }}>Teams you follow</div>
      {favTeams.length === 0 ? (
        <div className="source-sub">Follow teams from any game or team page to build your feed.</div>
      ) : (
        <div className="team-chips">
          {favTeams.map((t) => (
            <button key={t.id} className="team-chip" onClick={() => onOpenTeam(t.id, t.name)}>
              {t.badge && <img src={t.badge} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />}
              {t.name}
            </button>
          ))}
        </div>
      )}

      {teamGames.length > 0 && (
        <>
          <div className="section-title" style={{ paddingLeft: 0 }}>Next up for your teams</div>
          <div className="glist">
            {teamGames.map((g) => (
              <button className="grow" key={g.id} onClick={() => onOpenGame(g)}>
                <span className={'grow-state ' + g.state}>
                  {g.startMs ? new Date(g.startMs).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : 'TBD'}
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

      <div className="section-title" style={{ paddingLeft: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
        Your reminders
        {upcomingReminders.length > 0 && (
          <button className="gbtn" style={{ padding: '6px 12px', fontSize: 12 }}
            onClick={() => downloadIcs(upcomingReminders.map((r) => ({ id: r.gameId, name: r.label, startMs: r.startMs })), 'my-games.ics')}>
            📅 Export all
          </button>
        )}
      </div>
      {upcomingReminders.length === 0 ? (
        <div className="source-sub">No reminders yet. Tap “Remind me” on an upcoming game.</div>
      ) : (
        <div className="reminders-list">
          {upcomingReminders.map((r) => (
            <div className="reminder-item" key={r.gameId}>
              <div className="reminder-when">
                {r.startMs ? new Date(r.startMs).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'TBD'}
              </div>
              <div className="reminder-name">{r.label}</div>
              <button className="linkbtn" onClick={() => onToggleReminder({ id: r.gameId, name: r.label, startMs: r.startMs })}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
