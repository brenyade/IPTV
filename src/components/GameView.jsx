import { useEffect, useMemo, useState } from 'react'
import { useEpg } from '../lib/epgContext.js'
import { lookupEvent } from '../lib/sportsApi.js'
import { channelsForGame, likelyChannels } from '../lib/gameMatch.js'
import { ChLogo } from './ChannelCard.jsx'
import { Back, Play, Heart } from './Icons.jsx'

function TeamBadge({ src, name }) {
  const [fail, setFail] = useState(false)
  if (src && !fail) return <img className="tv-badge" src={src} alt="" onError={() => setFail(true)} />
  return <div className="tv-badge placeholder">{(name || '?').slice(0, 3).toUpperCase()}</div>
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
  onMultiview
}) {
  const epg = useEpg()
  const [game, setGame] = useState(initial)

  // Refresh score/status/venue from the API when opening.
  useEffect(() => {
    let alive = true
    lookupEvent(initial.id)
      .then((full) => alive && full && setGame((g) => ({ ...g, ...full })))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [initial.id])

  const matched = useMemo(() => channelsForGame(game, channels, epg), [game, channels, epg])
  const fallback = useMemo(
    () => (matched.length ? [] : likelyChannels(game, channels)),
    [matched, game, channels]
  )

  const watchChannels = matched.length ? matched.map((m) => m.channel) : fallback
  const reminded = reminders.some((r) => r.gameId === game.id)
  const isFav = (id) => favTeams.some((t) => t.id === id)
  const upcoming = game.state === 'upcoming'

  const fmtDate = game.startMs
    ? new Date(game.startMs).toLocaleString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    : `${game.date || ''} ${game.time || ''}`

  const statusText =
    game.state === 'live'
      ? game.progress || game.status || 'LIVE'
      : game.state === 'final'
      ? 'Final'
      : fmtDate

  return (
    <div className="page game-view">
      <button className="text-back" onClick={onBack}>
        <Back style={{ width: 18, height: 18 }} /> {game.league}
      </button>

      {/* Scoreboard */}
      <div className={'scoreboard state-' + game.state}>
        <div className="sb-team">
          <TeamBadge src={game.awayBadge} name={game.away} />
          <div className="sb-name">{game.away}</div>
          <button
            className={'sb-fav' + (isFav(game.awayId) ? ' on' : '')}
            onClick={() => onToggleFavTeam({ id: game.awayId, name: game.away, badge: game.awayBadge })}
            title="Favorite team"
          >
            <Heart style={{ width: 16, height: 16 }} />
          </button>
        </div>
        <div className="sb-center">
          {game.state !== 'upcoming' ? (
            <div className="sb-score">
              <span>{game.awayScore ?? 0}</span>
              <span className="sb-dash">–</span>
              <span>{game.homeScore ?? 0}</span>
            </div>
          ) : (
            <div className="sb-vs">VS</div>
          )}
          <div className={'sb-status ' + game.state}>{statusText}</div>
          {game.venue && <div className="sb-venue">{game.venue}</div>}
        </div>
        <div className="sb-team">
          <TeamBadge src={game.homeBadge} name={game.home} />
          <div className="sb-name">{game.home}</div>
          <button
            className={'sb-fav' + (isFav(game.homeId) ? ' on' : '')}
            onClick={() => onToggleFavTeam({ id: game.homeId, name: game.home, badge: game.homeBadge })}
            title="Favorite team"
          >
            <Heart style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="game-actions">
        {upcoming && (
          <button
            className={'gbtn' + (reminded ? ' on' : '')}
            onClick={() => onToggleReminder(game)}
          >
            {reminded ? '✓ Reminder set' : '🔔 Remind me'}
          </button>
        )}
        {watchChannels.length > 1 && (
          <button className="gbtn" onClick={() => onMultiview(watchChannels.slice(0, 4))}>
            ⊞ Watch in Multiview
          </button>
        )}
      </div>

      {/* Where to watch */}
      <div className="section-title" style={{ paddingLeft: 0 }}>
        {matched.length ? 'Airing now on your channels' : 'Sports channels that may carry this'}
      </div>
      {watchChannels.length === 0 ? (
        <div className="source-sub">
          No matching channels found in your sources. Add a sports playlist or an EPG feed that lists
          this game.
        </div>
      ) : (
        <div className="watch-list">
          {watchChannels.map((ch) => {
            const m = matched.find((x) => x.channel.id === ch.id)
            return (
              <div className="watch-item" key={ch.id} onClick={() => onPlay(ch)}>
                <ChLogo channel={ch} className="watch-logo" />
                <div className="watch-main">
                  <div className="watch-name">{ch.name}</div>
                  <div className="watch-sub">
                    {m ? m.programme.title : ch.group || 'Sports'}
                  </div>
                </div>
                <button className="watch-play" onClick={(e) => { e.stopPropagation(); onPlay(ch) }}>
                  <Play style={{ width: 16, height: 16 }} /> Watch
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Match info / stats */}
      <div className="section-title" style={{ paddingLeft: 0 }}>Match info</div>
      <div className="stat-grid">
        <div className="stat"><span>League</span><b>{game.league}</b></div>
        <div className="stat"><span>Status</span><b>{statusText}</b></div>
        <div className="stat"><span>Start</span><b>{fmtDate}</b></div>
        <div className="stat"><span>Venue</span><b>{game.venue || '—'}</b></div>
        {game.state !== 'upcoming' && (
          <div className="stat"><span>Score</span><b>{game.away} {game.awayScore ?? 0} – {game.homeScore ?? 0} {game.home}</b></div>
        )}
        <div className="stat"><span>Sport</span><b>{game.sport || '—'}</b></div>
      </div>
      {game.thumb && <img className="game-thumb" src={game.thumb} alt="" />}
      <div className="stat-credit">Stats & scores by TheSportsDB</div>
    </div>
  )
}
