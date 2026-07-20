// Records the currently-playing <video> to a local file via MediaRecorder on
// the element's captured stream. Produces a WebM saved into IndexedDB.

import { useEffect, useRef, useState } from 'react'
import { saveRecording } from './recordings.js'

function pickMime() {
  const opts = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
  return opts.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || ''
}

export function useRecorder(videoRef, channel, onSaved) {
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const recRef = useRef(null)
  const chunksRef = useRef([])
  const startedRef = useRef(0)
  const supported = typeof window !== 'undefined' && !!window.MediaRecorder

  useEffect(() => {
    if (!recording) return
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedRef.current) / 1000)), 1000)
    return () => clearInterval(t)
  }, [recording])

  function start() {
    const video = videoRef.current
    if (!video || recording) return
    const stream = video.captureStream ? video.captureStream() : video.mozCaptureStream?.()
    if (!stream) throw new Error('This browser can’t capture the video stream.')
    const mimeType = pickMime()
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    chunksRef.current = []
    rec.ondataavailable = (e) => e.data && e.data.size && chunksRef.current.push(e.data)
    rec.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mimeType || 'video/webm' })
      const dur = Math.floor((Date.now() - startedRef.current) / 1000)
      const meta = {
        id: `rec_${Date.now()}`,
        name: channel.name,
        group: channel.group || '',
        logo: channel.logo || '',
        ts: Date.now(),
        duration: dur,
        size: blob.size,
        mime: blob.type
      }
      await saveRecording({ ...meta, blob })
      onSaved?.(meta)
    }
    startedRef.current = Date.now()
    setElapsed(0)
    rec.start(1000) // gather in 1s chunks
    recRef.current = rec
    setRecording(true)
  }

  function stop() {
    if (recRef.current && recording) {
      try { recRef.current.stop() } catch {}
      recRef.current = null
      setRecording(false)
    }
  }

  // Stop cleanly if the player unmounts while recording.
  useEffect(() => () => { if (recRef.current) try { recRef.current.stop() } catch {} }, [])

  return { recording, elapsed, start, stop, supported }
}
