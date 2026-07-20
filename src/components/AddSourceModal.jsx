import { useRef, useState } from 'react'
import { Close } from './Icons.jsx'

export default function AddSourceModal({ onClose, onAdd }) {
  const [tab, setTab] = useState('m3u') // m3u | file | xtream
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [server, setServer] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const fileRef = useRef(null)
  const [fileText, setFileText] = useState(null)
  const [fileName, setFileName] = useState('')

  async function handleFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFileName(f.name)
    setFileText(await f.text())
    if (!name) setName(f.name.replace(/\.[^.]+$/, ''))
  }

  async function submit() {
    setError('')
    try {
      setBusy(true)
      if (tab === 'm3u') {
        if (!url.trim()) throw new Error('Enter a playlist URL')
        await onAdd({ type: 'm3u', name: name.trim() || hostOf(url), url: url.trim() })
      } else if (tab === 'file') {
        if (!fileText) throw new Error('Choose an .m3u / .m3u8 file')
        await onAdd({ type: 'm3u', name: name.trim() || fileName || 'Local playlist', text: fileText })
      } else {
        if (!server.trim() || !username.trim() || !password.trim())
          throw new Error('Server, username and password are required')
        await onAdd({
          type: 'xtream',
          name: name.trim() || hostOf(server),
          server: server.trim(),
          username: username.trim(),
          password: password.trim()
        })
      }
      onClose()
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h2>Add a source</h2>
          <button className="icon-btn" onClick={onClose}>
            <Close />
          </button>
        </div>

        <div className="modal-tabs">
          <button className={'modal-tab' + (tab === 'm3u' ? ' active' : '')} onClick={() => setTab('m3u')}>
            M3U / M3U8 URL
          </button>
          <button className={'modal-tab' + (tab === 'file' ? ' active' : '')} onClick={() => setTab('file')}>
            Upload file
          </button>
          <button className={'modal-tab' + (tab === 'xtream' ? ' active' : '')} onClick={() => setTab('xtream')}>
            Xtream Codes
          </button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label>Display name (optional)</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My playlist" />
          </div>

          {tab === 'm3u' && (
            <div className="field">
              <label>Playlist URL</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/playlist.m3u8"
              />
            </div>
          )}

          {tab === 'file' && (
            <div
              className="file-drop"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={async (e) => {
                e.preventDefault()
                const f = e.dataTransfer.files?.[0]
                if (f) {
                  setFileName(f.name)
                  setFileText(await f.text())
                  if (!name) setName(f.name.replace(/\.[^.]+$/, ''))
                }
              }}
            >
              <input ref={fileRef} type="file" accept=".m3u,.m3u8,text/plain" onChange={handleFile} />
              {fileName ? `Selected: ${fileName}` : 'Click or drop an .m3u / .m3u8 file here'}
            </div>
          )}

          {tab === 'xtream' && (
            <>
              <div className="field">
                <label>Server URL</label>
                <input
                  value={server}
                  onChange={(e) => setServer(e.target.value)}
                  placeholder="http://your-panel.com:8080"
                />
              </div>
              <div className="field">
                <label>Username</label>
                <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
              </div>
              <div className="field">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password"
                />
              </div>
            </>
          )}

          {error && <div className="form-error">{error}</div>}
        </div>

        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn primary" onClick={submit} disabled={busy}>
            {busy ? 'Adding…' : 'Add source'}
          </button>
        </div>
      </div>
    </div>
  )
}

function hostOf(u) {
  try {
    return new URL(u.includes('://') ? u : 'http://' + u).hostname
  } catch {
    return 'Playlist'
  }
}
