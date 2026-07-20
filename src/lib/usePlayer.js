// Reusable playback engine: attaches the right player (hls.js / mpegts.js /
// native) to a <video> for a given channel, reports status, and exposes
// playback capabilities (quality levels, audio & subtitle tracks). Shared by
// the full-screen Player, Multiview tiles and the mini-player.

import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import mpegts from 'mpegts.js'
import { streamUrl } from './api.js'

const extOf = (u) => (u || '').toLowerCase().split('?')[0].split('.').pop()
const isDirect = (u) => /^(blob:|data:)/.test(u || '')

export function usePlayer(videoRef, channel, { muted = false } = {}) {
  const [status, setStatus] = useState('loading') // loading | playing | error
  const [errMsg, setErrMsg] = useState('')
  const [caps, setCaps] = useState({ levels: [], audioTracks: [], subtitleTracks: [] })
  const hlsRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !channel) return
    let hls, mts, cancelled = false
    setStatus('loading')
    setErrMsg('')
    setCaps({ levels: [], audioTracks: [], subtitleTracks: [] })
    video.muted = muted

    // Recordings / blobs play straight from the element; everything else is
    // routed through the proxy so cross-origin + mixed content works.
    const proxied = isDirect(channel.url) ? channel.url : streamUrl(channel.url)
    const ext = extOf(channel.url)
    const onPlaying = () => !cancelled && setStatus('playing')
    video.addEventListener('playing', onPlaying)

    const fail = (msg) => { if (!cancelled) { setErrMsg(msg); setStatus('error') } }

    async function start() {
      try {
        if (!isDirect(channel.url) && (ext === 'm3u8' || ext === 'm3u')) {
          if (video.canPlayType('application/vnd.apple.mpegurl') && !Hls.isSupported()) {
            video.src = proxied
            await video.play().catch(() => {})
          } else if (Hls.isSupported()) {
            hls = new Hls({ enableWorker: true, lowLatencyMode: false, backBufferLength: 90 })
            hlsRef.current = hls
            hls.loadSource(proxied)
            hls.attachMedia(video)
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              video.play().catch(() => {})
              publishCaps(hls)
            })
            hls.on(Hls.Events.LEVEL_SWITCHED, () => publishCaps(hls))
            hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => publishCaps(hls))
            hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => publishCaps(hls))
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
        } else if (!isDirect(channel.url) && (ext === 'ts' || ext === 'mpegts' || ext === 'mpg')) {
          if (mpegts.getFeatureList().mseLivePlayback) {
            mts = mpegts.createPlayer(
              { type: 'mpegts', isLive: channel.kind === 'live', url: proxied },
              { enableWorker: true, liveBufferLatencyChasing: channel.kind === 'live' }
            )
            mts.attachMediaElement(video)
            mts.load()
            mts.play().catch(() => {})
            mts.on(mpegts.Events.ERROR, () => fail('This MPEG-TS stream could not be played.'))
          } else {
            fail('MPEG-TS playback is not supported in this browser.')
          }
        } else {
          video.src = proxied
          await video.play().catch(() => {})
        }
      } catch (e) {
        fail(String(e.message || e))
      }
    }

    function publishCaps(h) {
      if (cancelled) return
      setCaps({
        levels: (h.levels || []).map((l, i) => ({ index: i, height: l.height, bitrate: l.bitrate })),
        audioTracks: (h.audioTracks || []).map((t) => ({ id: t.id, name: t.name || t.lang || `Track ${t.id}` })),
        subtitleTracks: (h.subtitleTracks || []).map((t) => ({ id: t.id, name: t.name || t.lang || `Sub ${t.id}` }))
      })
    }

    start()

    return () => {
      cancelled = true
      video.removeEventListener('playing', onPlaying)
      if (hls) hls.destroy()
      hlsRef.current = null
      if (mts) { try { mts.destroy() } catch {} }
      video.removeAttribute('src')
      video.load()
    }
  }, [channel, videoRef, muted])

  // Imperative controls used by the player UI.
  const controls = {
    setLevel: (i) => { if (hlsRef.current) hlsRef.current.currentLevel = i }, // -1 = auto
    currentLevel: () => (hlsRef.current ? hlsRef.current.currentLevel : -1),
    setAudioTrack: (id) => { if (hlsRef.current) hlsRef.current.audioTrack = id },
    setSubtitleTrack: (id) => { if (hlsRef.current) hlsRef.current.subtitleTrack = id },
    setRate: (r) => { if (videoRef.current) videoRef.current.playbackRate = r }
  }

  return { status, errMsg, caps, controls }
}
