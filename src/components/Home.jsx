import { useMemo } from 'react'
import ChannelCard from './ChannelCard.jsx'
import { nowProgram } from '../lib/guide.js'
import { useEpg } from '../lib/epgContext.js'
import { Play } from './Icons.jsx'

function Shelf({ title, items, onPlay }) {
  if (!items.length) return null
  return (
    <section className="shelf">
      <div className="shelf-head">
        <span className="shelf-title">{title}</span>
        <span className="shelf-count">{items.length}</span>
      </div>
      <div className="shelf-track">
        {items.map((ch) => (
          <ChannelCard key={ch.id} channel={ch} onPlay={onPlay} />
        ))}
      </div>
    </section>
  )
}

export default function Home({ channels, groups, favorites, recents, onPlay }) {
  const epg = useEpg()
  const featured = channels[0]
  const prog = featured ? nowProgram(featured, epg) : null

  const favChannels = useMemo(
    () => favorites.map((id) => channels.find((c) => c.id === id)).filter(Boolean),
    [favorites, channels]
  )
  const recentChannels = useMemo(
    () => recents.map((id) => channels.find((c) => c.id === id)).filter(Boolean),
    [recents, channels]
  )

  const byGroup = useMemo(() => {
    const map = new Map()
    for (const ch of channels) {
      const g = ch.group || 'Live'
      if (!map.has(g)) map.set(g, [])
      map.get(g).push(ch)
    }
    return map
  }, [channels])

  return (
    <div className="page">
      {featured && (
        <div className="hero" onClick={() => onPlay(featured)}>
          {featured.logo && <img className="hero-art" src={featured.logo} alt="" />}
          <div className="hero-grad" />
          <div className="hero-content">
            <div className="hero-badge">
              <span className="dot" /> LIVE NOW
            </div>
            <h1 className="hero-title">{prog ? prog.title : featured.name}</h1>
            <div className="hero-sub">
              {featured.name}
              {featured.group ? ` · ${featured.group}` : ''}
            </div>
            <button className="hero-play">
              <Play style={{ width: 18, height: 18 }} /> Watch live
            </button>
          </div>
        </div>
      )}

      <Shelf title="Continue watching" items={recentChannels} onPlay={onPlay} />
      <Shelf title="Your favorites" items={favChannels} onPlay={onPlay} />
      {[...byGroup.entries()].slice(0, 30).map(([g, items]) => (
        <Shelf key={g} title={g} items={items.slice(0, 30)} onPlay={onPlay} />
      ))}
    </div>
  )
}
