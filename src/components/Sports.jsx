import { useEffect, useMemo, useState } from 'react'
import ChannelCard from './ChannelCard.jsx'
import LiveGuide from './LiveGuide.jsx'
import ScoreTicker from './ScoreTicker.jsx'
import LeagueView from './LeagueView.jsx'
import GameView from './GameView.jsx'
import TeamView from './TeamView.jsx'
import PlayerView from './PlayerView.jsx'
import SportsSearch from './SportsSearch.jsx'
import LiveNow from './LiveNow.jsx'
import MySports from './MySports.jsx'
import { useEpg } from '../lib/epgContext.js'
import { isSportsText, programmeAt, programmeIsSports } from '../lib/epg.js'
import { LEAGUES, SPORT_CATEGORIES, teamNextGames } from '../lib/sportsApi.js'
import { Back } from './Icons.jsx'

function useSportsChannels(channels, epg) {
  return useMemo(() => {
    const now = Date.now()
    return channels.filter((ch) => {
      if (isSportsText(ch.name, ch.group)) return true
      if (epg && ch.tvgId) return programmeIsSports(programmeAt(epg, ch.tvgId, now))
      return false
    })
  }, [channels, epg])
}

function GameCard({ g, onOpen }) {
  const time =
    g.state === 'live' ? g.progress || g.status || 'LIVE'
    : g.state === 'final' ? 'Final'
    : g.startMs
      ? new Date(g.startMs).toLocaleDateString([], { weekday: 'short' }) + ' ' +
        new Date(g.startMs).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : 'TBD'
  return (
    <button className="gamecard" onClick={() => onOpen(g)}>
      <div className={'gc-state ' + g.state}>{g.state === 'live' ? '● ' + time : time}</div>
      <div className="gc-row">{g.awayBadge && <img src={g.awayBadge} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />}<span>{g.away}</span>{g.state !== 'upcoming' && <b>{g.awayScore ?? 0}</b>}</div>
      <div className="gc-row">{g.homeBadge && <img src={g.homeBadge} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />}<span>{g.home}</span>{g.state !== 'upcoming' && <b>{g.homeScore ?? 0}</b>}</div>
      <div className="gc-league">{g.league}</div>
    </button>
  )
}

export default function Sports({
  channels, onPlay, favTeams, onToggleFavTeam, reminders, onToggleReminder, onMultiview
}) {
  const epg = useEpg()
  const sports = useSportsChannels(channels, epg)
  const [nav, setNav] = useState({ level: 'hub' })
  const [group, setGroup] = useState('All')
  const [teamGames, setTeamGames] = useState([])

  // Navigation stack via linked back-pointers so Back always returns to origin.
  const push = (node) => setNav((cur) => ({ ...node, back: cur }))
  const back = () => setNav((n) => n.back || { level: 'hub' })
  const openGame = (g) => push({ level: 'game', game: g })
  const openTeam = (teamId, teamName) => teamId && push({ level: 'team', teamId, teamName })
  const openPlayer = (playerId, playerName) => push({ level: 'player', playerId, playerName })

  useEffect(() => {
    let alive = true
    if (!favTeams.length) return setTeamGames([])
    Promise.all(favTeams.map((t) => teamNextGames(t.id).then((g) => g[0]).catch(() => null))).then(
      (list) => alive && setTeamGames(list.filter(Boolean))
    )
    return () => { alive = false }
  }, [favTeams])

  const liveNow = useMemo(() => {
    if (!epg) return []
    const now = Date.now()
    return sports.filter((ch) => programmeIsSports(programmeAt(epg, ch.tvgId, now)))
  }, [sports, epg])

  const groups = useMemo(() => {
    const set = new Set()
    for (const c of sports) if (c.group) set.add(c.group)
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [sports])
  const guideChannels = group === 'All' ? sports : sports.filter((c) => c.group === group)

  // ---- routed sub-views -----------------------------------------------------
  if (nav.level === 'league')
    return <LeagueView league={nav.league} onOpenGame={openGame} onBack={back} />
  if (nav.level === 'game')
    return (
      <GameView game={nav.game} channels={channels} onPlay={onPlay} onBack={back}
        favTeams={favTeams} onToggleFavTeam={onToggleFavTeam} reminders={reminders}
        onToggleReminder={onToggleReminder} onMultiview={onMultiview}
        onOpenTeam={openTeam} onOpenPlayer={openPlayer} />
    )
  if (nav.level === 'team')
    return (
      <TeamView teamId={nav.teamId} teamName={nav.teamName} onBack={back} onOpenGame={openGame}
        onOpenPlayer={openPlayer} favTeams={favTeams} onToggleFavTeam={onToggleFavTeam} />
    )
  if (nav.level === 'player')
    return <PlayerView playerId={nav.playerId} playerName={nav.playerName} onBack={back} onOpenTeam={openTeam} />
  if (nav.level === 'search')
    return <SportsSearch onBack={back} onOpenTeam={openTeam} onOpenPlayer={openPlayer} onOpenGame={openGame} />
  if (nav.level === 'livenow')
    return <LiveNow onBack={back} onOpenGame={openGame} />
  if (nav.level === 'mysports')
    return (
      <MySports favTeams={favTeams} reminders={reminders} onBack={back} onOpenGame={openGame}
        onOpenTeam={openTeam} onToggleReminder={onToggleReminder} />
    )
  if (nav.level === 'channels')
    return (
      <div className="sports-view">
        <div className="sports-guide-head" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="text-back" onClick={back} style={{ margin: 0 }}><Back style={{ width: 18, height: 18 }} /> Sports</button>
          <span className="shelf-title">Sports channel guide</span>
        </div>
        <div className="sports-guide">
          <LiveGuide channels={guideChannels} groups={groups} activeGroup={group} onGroup={setGroup} onPlay={onPlay} />
        </div>
      </div>
    )

  // ---- hub ------------------------------------------------------------------
  return (
    <div className="page sports-hub">
      <ScoreTicker onOpenGame={openGame} />

      <div className="hub-chips">
        <button className="gbtn" onClick={() => push({ level: 'livenow' })}>🔴 Live now</button>
        <button className="gbtn" onClick={() => push({ level: 'mysports' })}>⭐ My Sports</button>
        <button className="gbtn" onClick={() => push({ level: 'search' })}>🔍 Search sports</button>
      </div>

      {SPORT_CATEGORIES.map((cat) => (
        <div key={cat}>
          <div className="section-title">{cat}</div>
          <div className="league-grid">
            {LEAGUES.filter((l) => l.sport === cat).map((l) => (
              <button key={l.key} className="league-card" onClick={() => push({ level: 'league', league: l })}>
                <span className="lc-emoji">{l.emoji}</span>
                <span className="lc-name">{l.name}</span>
                <span className="lc-sport">{l.sport}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {teamGames.length > 0 && (
        <section className="shelf">
          <div className="shelf-head"><span className="shelf-title">Your teams — next up</span></div>
          <div className="shelf-track">{teamGames.map((g) => <GameCard key={g.id} g={g} onOpen={openGame} />)}</div>
        </section>
      )}

      <section className="shelf">
        <div className="shelf-head">
          <span className="shelf-title">On your channels now</span>
          <span className="shelf-count">{(liveNow.length ? liveNow : sports).length}</span>
        </div>
        <div className="shelf-track">
          {(liveNow.length ? liveNow : sports).slice(0, 30).map((ch) => (
            <ChannelCard key={ch.id} channel={ch} onPlay={onPlay} />
          ))}
        </div>
      </section>

      <div className="hub-actions">
        <button className="gbtn" onClick={() => push({ level: 'channels' })}>☰ Sports channel guide</button>
        {sports.length > 1 && (
          <button className="gbtn" onClick={() => onMultiview(sports.slice(0, 4))}>⊞ Multiview top sports</button>
        )}
      </div>
    </div>
  )
}
