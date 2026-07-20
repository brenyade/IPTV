import { useEffect, useRef, useState, useCallback } from 'react'
import { Back, Heart } from './Icons.jsx'
import { nowProgram } from '../lib/guide.js'
import { useEpg } from '../lib/epgContext.js'
import { usePlayer } from '../lib/usePlayer.js'

export default function Player({ channel, onClose, onMinimize, isFav, onToggleFav }) {
  const epg = useEpg()
  const videoRef = useRef(null)
  const { status, errMsg } = usePlayer(videoRef, channel)
  const [atLive, setAtLive] = useState(true)
  const [pip, setPip] = useState(false)
  const [hint, setHint] = useState('')

  const flash = useCallback((msg) => {
    setHint(msg)
    clearTimeout(flash._t)
    flash._t = setTimeout(() => setHint(''), 1400)
  }, [])

  // Seekable DVR window helpers (works when the live stream carries a DVR window).
  const seekBy = useCallback((delta) => {
    const v = videoRef.current
    if (!v) return
    try {
      const end = v.seekable.length ? v.seekable.end(v.seekable.length - 1) : v.duration
      const start = v.seekable.length ? v.seekable.start(0) : 0
      v.currentTime = Math.min(Math.max(v.currentTime + delta, start), end)
      flash(delta < 0 ? `⟲ ${Math.abs(delta)}s` : `⟳ ${delta}s`)
    } catch {}
  }, [flash])

  const jumpLive = useCallback(() => {
    const v = videoRef.current
    if (!v || !v.seekable.length) return
    v.currentTime = v.seekable.end(v.seekable.length - 1)
    v.play().catch(() => {})
    flash('● LIVE')
  }, [flash])

  const startOver = useCallback(() => {
    const v = videoRef.current
    if (!v || !v.seekable.length) return
    v.currentTime = v.seekable.start(0)
    flash('Start over')
  }, [flash])

  const togglePip = useCallback(async () => {
    const v = videoRef.current
    if (!v) return
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture()
      else await v.requestPictureInPicture()
    } catch {}
  }, [])

  const toggleFullscreen = useCallback(() => {
    const el = videoRef.current?.closest('.player-video-wrap')
    if (!document.fullscreenElement) el?.requestFullscreen?.()
    else document.exitFullscreen?.()
  }, [])

  // Track live-edge state to toggle the "jump to live" affordance.
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onTime = () => {
      if (!v.seekable.length) return
      const end = v.seekable.end(v.seekable.length - 1)
      setAtLive(end - v.currentTime < 8)
    }
    const onEnter = () => setPip(true)
    const onLeave = () => setPip(false)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('enterpictureinpicture', onEnter)
    v.addEventListener('leavepictureinpicture', onLeave)
    return () => {
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('enterpictureinpicture', onEnter)
      v.removeEventListener('leavepictureinpicture', onLeave)
    }
  }, [channel])

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return
      const v = videoRef.current
      switch (e.key) {
        case 'Escape': onClose(); break
        case ' ': case 'k':
          e.preventDefault()
          if (v) (v.paused ? v.play() : v.pause(), flash(v.paused ? '❚❚' : '►'))
          break
        case 'f': toggleFullscreen(); break
        case 'i': case 'p': togglePip(); break
        case 'm': if (v) { v.muted = !v.muted; flash(v.muted ? 'Muted' : 'Unmuted') } break
        case 'ArrowLeft': seekBy(-10); break
        case 'ArrowRight': seekBy(10); break
        case 'l': jumpLive(); break
        default: break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, seekBy, jumpLive, togglePip, toggleFullscreen, flash])

  const prog = channel.kind === 'live' ? nowProgram(channel, epg) : null
  const fmt = (t) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  return (
    <div className="player-overlay">
      <div className="player-video-wrap">
        <video ref={videoRef} controls autoPlay playsInline />

        <div className="player-top">
          <button className="player-back" onClick={onClose} title="Back (Esc)">
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

          <div className="player-tools">
            {onMinimize && (
              <button className="ptool" onClick={() => onMinimize(channel)} title="Minimize (mini player)">▭</button>
            )}
            <button className="ptool" onClick={togglePip} title="Picture-in-picture (i)">{pip ? '⤢' : '⧉'}</button>
            <button className="ptool" onClick={toggleFullscreen} title="Fullscreen (f)">⛶</button>
            <button
              className={'player-fav' + (isFav ? ' on' : '')}
              onClick={() => onToggleFav(channel.id)}
              title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart />
            </button>
          </div>

          {channel.kind === 'live' && (
            <button className={'player-live-pill' + (atLive ? '' : ' behind')} onClick={jumpLive} title="Jump to live (l)">
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
              {atLive ? 'LIVE' : 'GO LIVE'}
            </button>
          )}
        </div>

        {/* DVR transport */}
        {channel.kind === 'live' && status === 'playing' && (
          <div className="dvr-bar">
            <button onClick={startOver} title="Start over">⏮ Start over</button>
            <button onClick={() => seekBy(-30)} title="Rewind 30s (←)">⟲ 30s</button>
            <button onClick={() => seekBy(30)} title="Forward 30s (→)">30s ⟳</button>
            <button className={atLive ? 'live on' : 'live'} onClick={jumpLive}>● LIVE</button>
          </div>
        )}

        {hint && <div className="player-hint">{hint}</div>}

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
