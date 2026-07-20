import { useCallback, useEffect, useMemo, useState } from 'react'
import TopNav from './components/TopNav.jsx'
import LiveGuide from './components/LiveGuide.jsx'
import Home from './components/Home.jsx'
import Library from './components/Library.jsx'
import SearchView from './components/SearchView.jsx'
import AddSourceModal from './components/AddSourceModal.jsx'
import Player from './components/Player.jsx'
import Sports from './components/Sports.jsx'

import { fetchText, fetchEpg } from './lib/api.js'
import { parseM3U, extractEpgUrl } from './lib/m3uParser.js'
import { xtreamAuth, loadXtreamChannels, xtreamEpgUrl } from './lib/xtream.js'
import { parseXMLTV } from './lib/epg.js'
import { EpgContext } from './lib/epgContext.js'
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
  const [epgBySource, setEpgBySource] = useState({}) // sourceId -> Map<tvgId, programme[]>
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

  // Load an EPG feed in the background (never blocks channel display).
  const loadSourceEpg = useCallback(async (source, epgUrl) => {
    if (!epgUrl) return
    setSourceState(source.id, { epg: 'loading' })
    try {
      const xml = await fetchEpg(epgUrl)
      const map = parseXMLTV(xml)
      if (map.size) {
        setEpgBySource((prev) => ({ ...prev, [source.id]: map }))
        setSourceState(source.id, { epg: 'ok', epgCount: map.size })
      } else {
        setSourceState(source.id, { epg: 'none' })
      }
    } catch {
      setSourceState(source.id, { epg: 'error' })
    }
  }, [setSourceState])

  const loadSourceChannels = useCallback(
    async (source) => {
      setSourceState(source.id, { status: 'loading', error: '' })
      try {
        let channels = []
        let epgUrl = ''
        if (source.type === 'm3u') {
          const text = source.text || (await fetchText(source.url))
          channels = parseM3U(text)
          epgUrl = source.epgUrl || extractEpgUrl(text)
        } else if (source.type === 'xtream') {
          await xtreamAuth(source)
          channels = await loadXtreamChannels(source)
          epgUrl = xtreamEpgUrl(source)
        }
        setChannelsBySource((prev) => ({ ...prev, [source.id]: channels }))
        setSourceState(source.id, { status: 'ok', count: channels.length })
        loadSourceEpg(source, epgUrl) // fire-and-forget
      } catch (e) {
        setChannelsBySource((prev) => ({ ...prev, [source.id]: [] }))
        setSourceState(source.id, { status: 'error', error: String(e.message || e) })
      }
    },
    [setSourceState, loadSourceEpg]
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
      // strip runtime-only fields; keep epgUrl (a user setting)
      sources.map(({ status, count, error, epg, epgCount, ...rest }) => rest)
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
    setEpgBySource((prev) => {
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

  // Merge every source's EPG into one Map<tvgId, programme[]>.
  const epg = useMemo(() => {
    const maps = Object.values(epgBySource)
    if (!maps.length) return null
    if (maps.length === 1) return maps[0]
    const merged = new Map()
    for (const m of maps) {
      for (const [k, v] of m) {
        if (merged.has(k)) merged.get(k).push(...v)
        else merged.set(k, v.slice())
      }
    }
    for (const arr of merged.values()) arr.sort((a, b) => a.start - b.start)
    return merged
  }, [epgBySource])

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
    if (view === 'sports') return <Sports channels={channels} onPlay={play} />
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
    <EpgContext.Provider value={epg}>
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
    </EpgContext.Provider>
  )
}
