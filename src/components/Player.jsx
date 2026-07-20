import { useEffect, useRef, useState, useCallback } from 'react'
import { Back, Heart } from './Icons.jsx'
import { nowProgram } from '../lib/guide.js'
import { useEpg } from '../lib/epgContext.js'
import { usePlayer } from '../lib/usePlayer.js'
import { useRecorder } from '../lib/useRecorder.js'

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]
const fmtDur = (s) => {
  s = Math.max(0, Math.floor(s))
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function Player({ channel, onClose, onMinimize, isFav, onToggleFav, onRecordingSaved }) {
  const epg = useEpg()
  const videoRef = useRef(null)
  const { status, errMsg, caps, controls } = usePlayer(videoRef, channel)
  const { recording, elapsed, start, stop, supported } = useRecorder(videoRef, channel, onRecordingSaved)
  const isLive = channel.kind === 'live'

  const [atLive, setAtLive] = useState(true)
  const [pip, setPip] = useState(false)
  const [hint, setHint] = useState('')
  const [menu, setMenu] = useState(false)
  const [rate, setRate] = useState(1)
  const [level, setLevelState] = useState(-1)

  const flash = useCallback((msg) => {
    setHint(msg)
    clearTimeout(flash._t)
    flash._t = setTimeout(() => setHint(''), 1400)
  }, [])

  const seekBy = useCallback((delta) => {
    const v = videoRef.current
    if (!v) return
    try {
      const end = v.seekable.length ? v.seekable.end(v.seekable.length - 1) : v.duration
      const start = v.seekable.length ? v.seekable.start(0) : 0
      v.currentTime = Math.min(Math.max(v.currentTime + delta, start), end || v.currentTime + delta)
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

  const applyRate = (r) => { setRate(r); controls.setRate(r); flash(`${r}×`) }
  const applyLevel = (i) => { setLevelState(i); controls.setLevel(i); flash(i < 0 ? 'Auto' : `${caps.levels[i]?.height}p`) }

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
        case 'l': if (isLive) jumpLive(); break
        default: break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, seekBy, jumpLive, togglePip, toggleFullscreen, flash, isLive])

  const prog = isLive ? nowProgram(channel, epg) : null
  const fmt = (t) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  return (
    <div className="player-overlay">
      <div className="player-video-wrap">
        <video ref={videoRef} controls autoPlay playsInline />

        <div className="player-top">
          <button className="player-back" onClick={onClose} title="Back (Esc)"><Back /></button>
          <div>
            <div className="ptitle">{prog ? prog.title : channel.name}</div>
            <div className="psub">
              {channel.name}
              {channel.group ? ` · ${channel.group}` : ''}
              {prog && prog.real ? ` · ${fmt(prog.start)} – ${fmt(prog.end)}` : ''}
            </div>
          </div>

          <div className="player-tools">
            {recording && <span className="rec-indicator">● REC {fmtDur(elapsed)}</span>}
            {supported && (
              <button
                className={'ptool' + (recording ? ' recording' : '')}
                onClick={() => {
                  try { recording ? stop() : start() } catch (e) { flash(String(e.message || e)) }
                }}
                title={recording ? 'Stop recording' : 'Record'}
              >
                {recording ? '■' : '⏺'}
              </button>
            )}
            <div className="settings-wrap">
              <button className="ptool" onClick={() => setMenu((m) => !m)} title="Settings">⚙</button>
              {menu && (
                <div className="settings-menu" onMouseLeave={() => setMenu(false)}>
                  {caps.levels.length > 0 && (
                    <div className="sm-group">
                      <div className="sm-title">Quality</div>
                      <button className={level === -1 ? 'sm-item on' : 'sm-item'} onClick={() => applyLevel(-1)}>Auto</button>
                      {caps.levels.map((l) => (
                        <button key={l.index} className={level === l.index ? 'sm-item on' : 'sm-item'} onClick={() => applyLevel(l.index)}>
                          {l.height ? `${l.height}p` : `${Math.round(l.bitrate / 1000)}k`}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="sm-group">
                    <div className="sm-title">Speed</div>
                    {SPEEDS.map((r) => (
                      <button key={r} className={rate === r ? 'sm-item on' : 'sm-item'} onClick={() => applyRate(r)}>{r}×</button>
                    ))}
                  </div>
                  {caps.audioTracks.length > 1 && (
                    <div className="sm-group">
                      <div className="sm-title">Audio</div>
                      {caps.audioTracks.map((t) => (
                        <button key={t.id} className="sm-item" onClick={() => { controls.setAudioTrack(t.id); flash(t.name) }}>{t.name}</button>
                      ))}
                    </div>
                  )}
                  {caps.subtitleTracks.length > 0 && (
                    <div className="sm-group">
                      <div className="sm-title">Subtitles</div>
                      <button className="sm-item" onClick={() => { controls.setSubtitleTrack(-1); flash('Subtitles off') }}>Off</button>
                      {caps.subtitleTracks.map((t) => (
                        <button key={t.id} className="sm-item" onClick={() => { controls.setSubtitleTrack(t.id); flash(t.name) }}>{t.name}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {onMinimize && <button className="ptool" onClick={() => onMinimize(channel)} title="Minimize">▭</button>}
            <button className="ptool" onClick={togglePip} title="Picture-in-picture (i)">{pip ? '⤢' : '⧉'}</button>
            <button className="ptool" onClick={toggleFullscreen} title="Fullscreen (f)">⛶</button>
            <button className={'player-fav' + (isFav ? ' on' : '')} onClick={() => onToggleFav(channel.id)}
              title={isFav ? 'Remove from favorites' : 'Add to favorites'}>
              <Heart />
            </button>
          </div>

          {isLive && (
            <button className={'player-live-pill' + (atLive ? '' : ' behind')} onClick={jumpLive} title="Jump to live (l)">
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
              {atLive ? 'LIVE' : 'GO LIVE'}
            </button>
          )}
        </div>

        {isLive && status === 'playing' && (
          <div className="dvr-bar">
            <button onClick={startOver} title="Start over">⏮ Start over</button>
            <button onClick={() => seekBy(-30)} title="Rewind 30s (←)">⟲ 30s</button>
            <button onClick={() => seekBy(30)} title="Forward 30s (→)">30s ⟳</button>
            <button className={atLive ? 'live on' : 'live'} onClick={jumpLive}>● LIVE</button>
          </div>
        )}

        {hint && <div className="player-hint">{hint}</div>}

        {status === 'loading' && (
          <div className="player-loading"><div className="spinner" /><div>Tuning in…</div></div>
        )}
        {status === 'error' && (
          <div className="player-error">
            <div className="big">Can’t play this {isLive ? 'channel' : 'title'}</div>
            <div>{errMsg}</div>
            <div style={{ fontSize: 13 }}>The source may be offline, geo-blocked, or in a codec your browser can’t decode.</div>
          </div>
        )}
      </div>
    </div>
  )
}
