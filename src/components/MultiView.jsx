import { useEffect, useRef, useState } from 'react'
import { usePlayer } from '../lib/usePlayer.js'
import { Close } from './Icons.jsx'

function Tile({ channel, active, muted, onFocus, onRemove }) {
  const videoRef = useRef(null)
  const { status, errMsg } = usePlayer(videoRef, channel, { muted })
  return (
    <div className={'mv-tile' + (active ? ' active' : '')} onClick={onFocus}>
      <video ref={videoRef} autoPlay playsInline muted={muted} />
      <div className="mv-tile-bar">
        <span className="mv-tile-name">{channel.name}</span>
        {!muted && <span className="mv-audio">🔊</span>}
        <button
          className="mv-remove"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(channel.id)
          }}
          title="Remove"
        >
          <Close style={{ width: 16, height: 16 }} />
        </button>
      </div>
      {status === 'loading' && <div className="mv-tile-status"><div className="spinner" /></div>}
      {status === 'error' && <div className="mv-tile-status err">{errMsg || 'Unavailable'}</div>}
    </div>
  )
}

export default function MultiView({ channels, onClose, onRemove }) {
  // Which tile has audio (others muted), YouTube-TV Multiview style.
  const [focusId, setFocusId] = useState(channels[0]?.id)
  const cols = channels.length <= 1 ? 1 : channels.length <= 4 ? 2 : 3

  // Number keys 1-9 move audio focus between tiles; Esc closes.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') return onClose()
      const n = parseInt(e.key, 10)
      if (n >= 1 && n <= channels.length) setFocusId(channels[n - 1].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [channels, onClose])

  return (
    <div className="player-overlay mv-overlay">
      <div className="mv-head">
        <div className="mv-title">Multiview · {channels.length} streams</div>
        <button className="player-back" onClick={onClose} title="Close">
          <Close />
        </button>
      </div>
      <div className="mv-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {channels.map((ch) => (
          <Tile
            key={ch.id}
            channel={ch}
            active={ch.id === focusId}
            muted={ch.id !== focusId}
            onFocus={() => setFocusId(ch.id)}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  )
}
