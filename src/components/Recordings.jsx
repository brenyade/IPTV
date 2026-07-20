import { useEffect, useState } from 'react'
import { listRecordings, getRecording, deleteRecording } from '../lib/recordings.js'

const fmtSize = (b) => (b > 1e9 ? (b / 1e9).toFixed(1) + ' GB' : (b / 1e6).toFixed(0) + ' MB')
const fmtDur = (s) => {
  s = Math.floor(s || 0)
  const m = Math.floor(s / 60)
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m ${s % 60}s`
}

export default function Recordings({ onPlay, refreshKey }) {
  const [list, setList] = useState(null)

  const reload = () => listRecordings().then(setList).catch(() => setList([]))
  useEffect(() => { reload() }, [refreshKey])

  async function playRec(meta) {
    const full = await getRecording(meta.id)
    if (!full?.blob) return
    const url = URL.createObjectURL(full.blob)
    onPlay({ id: meta.id, name: meta.name, group: 'Recording', logo: meta.logo, kind: 'recording', url })
  }
  async function download(meta) {
    const full = await getRecording(meta.id)
    if (!full?.blob) return
    const url = URL.createObjectURL(full.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(meta.name || 'recording').replace(/\W+/g, '_')}.webm`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  async function remove(id) {
    await deleteRecording(id)
    reload()
  }

  if (list === null) return <div className="empty" style={{ height: 160 }}><div className="spinner" /></div>
  if (!list.length)
    return (
      <div className="source-list">
        <div className="source-sub">No recordings yet. Press the ⏺ Record button while watching to save a clip here.</div>
      </div>
    )

  return (
    <div className="source-list">
      {list.map((r) => (
        <div className="source-item" key={r.id}>
          <div className="source-icon" style={{ color: '#ff556' }}>●</div>
          <div className="source-main">
            <div className="source-name">{r.name}</div>
            <div className="source-sub">
              {new Date(r.ts).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              {' · '}{fmtDur(r.duration)}{' · '}{fmtSize(r.size)}
            </div>
          </div>
          <button className="watch-play" onClick={() => playRec(r)}>▶ Play</button>
          <button className="linkbtn" onClick={() => download(r)}>Download</button>
          <button className="linkbtn" onClick={() => remove(r.id)}>Delete</button>
        </div>
      ))}
    </div>
  )
}
