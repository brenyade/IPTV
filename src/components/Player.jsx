import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import mpegts from 'mpegts.js'
import { streamUrl } from '../lib/api.js'
import { Back, Heart } from './Icons.jsx'
import { nowProgram } from '../lib/guide.js'

function extOf(u) {
  return (u || '').toLowerCase().split('?')[0].split('.').pop()
}

export default function Player({ channel, onClose, isFav, onToggleFav }) {
  const videoRef = useRef(null)
  const [status, setStatus] = useState('loading') // loading | playing | error
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let hls, mts, cancelled = false
    setStatus('loading')
    setErrMsg('')

    const proxied = streamUrl(channel.url)
    const ext = extOf(channel.url)

    const onPlaying = () => !cancelled && setStatus('playing')
    video.addEventListener('playing', onPlaying)

    function fail(msg) {
      if (!cancelled) {
        setErrMsg(msg)
        setStatus('error')
      }
    }

    async function start() {
      try {
        if (ext === 'm3u8' || ext === 'm3u') {
          if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = proxied
            await video.play().catch(() => {})
          } else if (Hls.isSupported()) {
            hls = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 30 })
            hls.loadSource(proxied)
            hls.attachMedia(video)
            hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}))
            hls.on(Hls.Events.ERROR, (_e, data) => {
              if (data.fatal) {
                if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad()
                else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError()
                else fail('This stream could not be played (fatal HLS error).')
              }
            })
          } else {
            fail('HLS is not supported in this browser.')
          }
        } else if (ext === 'ts' || ext === 'mpegts' || ext === 'mpg') {
          if (mpegts.getFeatureList().mseLivePlayback) {
            mts = mpegts.createPlayer(
              { type: 'mpegts', isLive: channel.kind === 'live', url: proxied },
              { enableWorker: true, liveBufferLatencyChasing: true }
            )
            mts.attachMediaElement(video)
            mts.load()
            mts.play().catch(() => {})
            mts.on(mpegts.Events.ERROR, () => fail('This MPEG-TS stream could not be played.'))
          } else {
            fail('MPEG-TS playback is not supported in this browser.')
          }
        } else {
          // mp4/mkv/webm and other direct media.
          video.src = proxied
          await video.play().catch(() => {})
        }
      } catch (e) {
        fail(String(e.message || e))
      }
    }

    start()

    return () => {
      cancelled = true
      video.removeEventListener('playing', onPlaying)
      if (hls) hls.destroy()
      if (mts) {
        try {
          mts.destroy()
        } catch {}
      }
      video.removeAttribute('src')
      video.load()
    }
  }, [channel])

  // Close on Escape.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const prog = channel.kind === 'live' ? nowProgram(channel) : null

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
