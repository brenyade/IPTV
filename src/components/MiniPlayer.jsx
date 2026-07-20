import { useRef } from 'react'
import { usePlayer } from '../lib/usePlayer.js'
import { Close } from './Icons.jsx'

// Persistent floating player so you can keep watching while browsing the app.
export default function MiniPlayer({ channel, onExpand, onClose }) {
  const videoRef = useRef(null)
  const { status } = usePlayer(videoRef, channel)
  return (
    <div className="mini-player">
      <div className="mini-video" onClick={onExpand} title="Expand">
        <video ref={videoRef} autoPlay playsInline muted />
        {status !== 'playing' && <div className="mini-status"><div className="spinner" /></div>}
      </div>
      <div className="mini-bar">
        <span className="mini-name" onClick={onExpand}>{channel.name}</span>
        <button className="mini-btn" onClick={onExpand} title="Expand">⤢</button>
        <button className="mini-btn" onClick={onClose} title="Close"><Close style={{ width: 15, height: 15 }} /></button>
      </div>
    </div>
  )
}
