import { useState } from 'react'
import { nowProgram } from '../lib/guide.js'

export function initials(name) {
  return (name || '?')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?'
}

// Small round channel logo that falls back to initials on load error.
export function ChLogo({ channel, className = 'card-chlogo' }) {
  const [failed, setFailed] = useState(false)
  if (channel.logo && !failed) {
    return <img className={className} src={channel.logo} alt="" onError={() => setFailed(true)} />
  }
  return <div className={className + ' placeholder'}>{initials(channel.name)}</div>
}

export default function ChannelCard({ channel, onPlay }) {
  const [thumbFailed, setThumbFailed] = useState(false)
  const prog = channel.kind === 'live' ? nowProgram(channel) : null
  return (
    <div className="card" onClick={() => onPlay(channel)}>
      <div className="card-thumb">
        {channel.logo && !thumbFailed ? (
          <img className="logo" src={channel.logo} alt="" loading="lazy" onError={() => setThumbFailed(true)} />
        ) : (
          <span className="noimg">{initials(channel.name)}</span>
        )}
        {channel.kind === 'live' && <span className="live-badge">LIVE</span>}
      </div>
      <div className="card-meta">
        <ChLogo channel={channel} />
        <div style={{ minWidth: 0 }}>
          <div className="card-name">{prog ? prog.title : channel.name}</div>
          <div className="card-grp">
            {channel.name}
            {channel.group ? ` · ${channel.group}` : ''}
          </div>
        </div>
      </div>
    </div>
  )
}
