import { useCallback, useEffect, useMemo, useState } from 'react'
import TopNav from './components/TopNav.jsx'
import LiveGuide from './components/LiveGuide.jsx'
import Home from './components/Home.jsx'
import Library from './components/Library.jsx'
import SearchView from './components/SearchView.jsx'
import AddSourceModal from './components/AddSourceModal.jsx'
import Player from './components/Player.jsx'

import { fetchText } from './lib/api.js'
import { parseM3U } from './lib/m3uParser.js'
import { xtreamAuth, loadXtreamChannels } from './lib/xtream.js'
import {
  loadSources,
  saveSources,
  loadFavorites,
  saveFavorites,
  loadRecents,
  pushRecent
} from './lib/storage.js'

let sid = 0
const newId = () => `src_${Date.now().toString(36)}_${sid++}`

export default function App() {
  const [sources, setSources] = useState([]) // {id,type,name,...,status,count,error}
  const [channelsBySource, setChannelsBySource] = useState({}) // sourceId -> channel[]
  const [view, setView] = useState('live')
  const [query, setQuery] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [playing, setPlaying] = useState(null)
  const [activeGroup, setActiveGroup] = useState('All')
  const [favorites, setFavorites] = useState(loadFavorites())
  const [recents, setRecents] = useState(loadRecents())

  // ---- source loading -------------------------------------------------------
  const setSourceState = useCallback((id, patch) => {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }, [])

  const loadSourceChannels = useCallback(
    async (source) => {
      setSourceState(source.id, { status: 'loading', error: '' })
      try {
        let channels = []
        if (source.type === 'm3u') {
          const text = source.text || (await fetchText(source.url))
          channels = parseM3U(text)
        } else if (source.type === 'xtream') {
          await xtreamAuth(source)
          channels = await loadXtreamChannels(source)
        }
        setChannelsBySource((prev) => ({ ...prev, [source.id]: channels }))
        setSourceState(source.id, { status: 'ok', count: channels.length })
      } catch (e) {
        setChannelsBySource((prev) => ({ ...prev, [source.id]: [] }))
        setSourceState(source.id, { status: 'error', error: String(e.message || e) })
      }
    },
    [setSourceState]
  )

  // Initial load from storage.
  useEffect(() => {
    const stored = loadSources()
    if (stored.length) {
      setSources(stored.map((s) => ({ ...s, status: 'loading' })))
      stored.forEach((s) => loadSourceChannels(s))
      setView('live')
    } else {
      setView('home')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist source definitions (without transient status) whenever they change.
  useEffect(() => {
    saveSources(
      sources.map(({ status, count, error, ...rest }) => rest) // strip runtime fields
    )
  }, [sources])

  async function addSource(def) {
    const source = { id: newId(), ...def }
    setSources((prev) => [...prev, { ...source, status: 'loading' }])
    setShowAdd(false)
    await loadSourceChannels(source)
    setView('live')
  }

  function removeSource(id) {
    setSources((prev) => prev.filter((s) => s.id !== id))
    setChannelsBySource((prev) => {
      const cp = { ...prev }
      delete cp[id]
      return cp
    })
  }

  // ---- derived data ---------------------------------------------------------
  const channels = useMemo(
    () => Object.values(channelsBySource).flat(),
    [channelsBySource]
  )

  const groups = useMemo(() => {
    const set = new Set()
    for (const c of channels) if (c.group) set.add(c.group)
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [channels])

  const guideChannels = useMemo(
    () => (activeGroup === 'All' ? channels : channels.filter((c) => c.group === activeGroup)),
    [channels, activeGroup]
  )

  // ---- favorites / recents --------------------------------------------------
  const toggleFav = useCallback((id) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      saveFavorites(next)
      return next
    })
  }, [])

  const play = useCallback((channel) => {
    setPlaying(channel)
    setRecents(pushRecent(channel.id))
  }, [])

  const loadingAny = sources.some((s) => s.status === 'loading')
  const hasChannels = channels.length > 0

  // ---- render ---------------------------------------------------------------
  function renderBody() {
    if (!sources.length) {
      return (
        <div className="empty">
          <div className="big">Welcome to your IPTV player</div>
          <div className="small">
            Add an M3U / M3U8 playlist (URL or file) or an Xtream Codes account to start watching live
            channels in a YouTube TV–style guide.
          </div>
          <button className="cta" onClick={() => setShowAdd(true)}>
            Add your first source
          </button>
        </div>
      )
    }
    if (!hasChannels && loadingAny) {
      return (
        <div className="empty">
          <div className="spinner" />
          <div className="small" style={{ marginTop: 14 }}>
            Loading your channels…
          </div>
        </div>
      )
    }

    if (view === 'search') return <SearchView channels={channels} query={query} onPlay={play} />
    if (view === 'home')
      return (
        <Home
          channels={channels}
          groups={groups}
          favorites={favorites}
          recents={recents}
          onPlay={play}
        />
      )
    if (view === 'library')
      return (
        <Library
          sources={sources}
          channels={channels}
          favorites={favorites}
          onPlay={play}
          onAdd={() => setShowAdd(true)}
          onRemoveSource={removeSource}
        />
      )
    // default: live guide
    return (
      <LiveGuide
        channels={guideChannels}
        groups={groups}
        activeGroup={activeGroup}
        onGroup={setActiveGroup}
        onPlay={play}
      />
    )
  }

  return (
    <div className="app">
      <TopNav
        view={view}
        onView={setView}
        onAdd={() => setShowAdd(true)}
        query={query}
        onQuery={setQuery}
      />
      <div className="app-body">{renderBody()}</div>

      {showAdd && <AddSourceModal onClose={() => setShowAdd(false)} onAdd={addSource} />}
      {playing && (
        <Player
          channel={playing}
          onClose={() => setPlaying(null)}
          isFav={favorites.includes(playing.id)}
          onToggleFav={toggleFav}
        />
      )}
    </div>
  )
}
