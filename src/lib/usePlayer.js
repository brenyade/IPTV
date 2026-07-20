// Reusable playback engine: attaches the right player (hls.js / mpegts.js /
// native) to a <video> for a given channel, and reports status. Shared by the
// full-screen Player and Multiview tiles.

import { useEffect, useState } from 'react'
import Hls from 'hls.js'
import mpegts from 'mpegts.js'
import { streamUrl } from './api.js'

const extOf = (u) => (u || '').toLowerCase().split('?')[0].split('.').pop()

export function usePlayer(videoRef, channel, { muted = false } = {}) {
  const [status, setStatus] = useState('loading') // loading | playing | error
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    const video = videoRef.current
    if (!video || !channel) return
    let hls, mts, cancelled = false
    setStatus('loading')
    setErrMsg('')
    video.muted = muted

    const proxied = streamUrl(channel.url)
    const ext = extOf(channel.url)
    const onPlaying = () => !cancelled && setStatus('playing')
    video.addEventListener('playing', onPlaying)

    const fail = (msg) => {
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
  }, [channel, videoRef, muted])

  return { status, errMsg }
}
