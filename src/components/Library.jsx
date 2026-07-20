import { useMemo } from 'react'
import ChannelCard from './ChannelCard.jsx'

export default function Library({ sources, channels, favorites, onPlay, onAdd, onRemoveSource }) {
  const favChannels = useMemo(
    () => favorites.map((id) => channels.find((c) => c.id === id)).filter(Boolean),
    [favorites, channels]
  )

  return (
    <div className="page">
      <div className="section-title">Your sources</div>
      <div className="source-list">
        {sources.length === 0 && (
          <div className="source-sub" style={{ padding: '4px 0' }}>
            No playlists or accounts yet.
          </div>
        )}
        {sources.map((s) => (
          <div className="source-item" key={s.id}>
            <div className="source-icon">{s.type === 'xtream' ? 'XC' : 'M3U'}</div>
            <div className="source-main">
              <div className="source-name">{s.name}</div>
              <div className="source-sub">
                {s.type === 'xtream' ? `${s.server} · ${s.username}` : s.url}
              </div>
            </div>
            <div className={'source-status ' + (s.status === 'ok' ? 'ok' : s.status === 'error' ? 'err' : '')}>
              {s.status === 'ok'
                ? `${s.count || 0} channels`
                : s.status === 'error'
                ? s.error || 'Error'
                : 'Loading…'}
              {s.status === 'ok' && s.epg === 'ok' ? ` · EPG: ${s.epgCount} ch` : ''}
              {s.status === 'ok' && s.epg === 'loading' ? ' · EPG…' : ''}
            </div>
            <button className="linkbtn" onClick={() => onRemoveSource(s.id)}>
              Remove
            </button>
          </div>
        ))}
        <div style={{ marginTop: 6 }}>
          <button className="linkbtn" onClick={onAdd}>
            + Add another source
          </button>
        </div>
      </div>

      <div className="section-title">Favorites</div>
      {favChannels.length ? (
        <div className="grid">
          {favChannels.map((ch) => (
            <ChannelCard key={ch.id} channel={ch} onPlay={onPlay} />
          ))}
        </div>
      ) : (
        <div className="source-list">
          <div className="source-sub">Tap the heart on any channel to save it here.</div>
        </div>
      )}
    </div>
  )
}
