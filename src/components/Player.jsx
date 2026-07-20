import { useEffect, useRef } from 'react'
import { Back, Heart } from './Icons.jsx'
import { nowProgram } from '../lib/guide.js'
import { useEpg } from '../lib/epgContext.js'
import { usePlayer } from '../lib/usePlayer.js'

export default function Player({ channel, onClose, isFav, onToggleFav }) {
  const epg = useEpg()
  const videoRef = useRef(null)
  const { status, errMsg } = usePlayer(videoRef, channel)

  // Close on Escape.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const prog = channel.kind === 'live' ? nowProgram(channel, epg) : null
  const fmt = (t) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  return (
    <div className="player-overlay">
      <div className="player-video-wrap">
        <video ref={videoRef} controls autoPlay playsInline />

        <div className="player-top">
          <button className="player-back" onClick={onClose} title="Back">
            <Back />
          </button>
          <div>
            <div className="ptitle">{prog ? prog.title : channel.name}</div>
            <div className="psub">
              {channel.name}
              {channel.group ? ` · ${channel.group}` : ''}
              {prog && prog.real ? ` · ${fmt(prog.start)} – ${fmt(prog.end)}` : ''}
            </div>
          </div>
          <button
            className={'player-fav' + (isFav ? ' on' : '')}
            onClick={() => onToggleFav(channel.id)}
            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            style={{ marginLeft: 'auto' }}
          >
            <Heart />
          </button>
          {channel.kind === 'live' && (
            <span className="player-live-pill">
              <span
                style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', display: 'inline-block' }}
              />
              LIVE
            </span>
          )}
        </div>

        {status === 'loading' && (
          <div className="player-loading">
            <div className="spinner" />
            <div>Tuning in…</div>
          </div>
        )}
        {status === 'error' && (
          <div className="player-error">
            <div className="big">Can’t play this channel</div>
            <div>{errMsg}</div>
            <div style={{ fontSize: 13 }}>
              The source may be offline, geo-blocked, or in a codec your browser can’t decode.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
