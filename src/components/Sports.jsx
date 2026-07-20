import { useMemo, useState } from 'react'
import ChannelCard from './ChannelCard.jsx'
import LiveGuide from './LiveGuide.jsx'
import { useEpg } from '../lib/epgContext.js'
import { isSportsText, programmeAt, programmeIsSports } from '../lib/epg.js'
import { nowProgram } from '../lib/guide.js'
import { Play } from './Icons.jsx'

// A channel counts as "sports" if its name/group reads as sports, OR its EPG
// says it's currently (or soon) airing a sports programme.
function useSportsChannels(channels, epg) {
  return useMemo(() => {
    const now = Date.now()
    return channels.filter((ch) => {
      if (isSportsText(ch.name, ch.group)) return true
      if (epg && ch.tvgId) {
        const p = programmeAt(epg, ch.tvgId, now)
        if (programmeIsSports(p)) return true
      }
      return false
    })
  }, [channels, epg])
}

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

export default function Sports({ channels, onPlay }) {
  const epg = useEpg()
  const sports = useSportsChannels(channels, epg)
  const [group, setGroup] = useState('All')

  // Channels whose *current* programme is a live sporting event.
  const liveNow = useMemo(() => {
    if (!epg) return []
    const now = Date.now()
    return sports.filter((ch) => programmeIsSports(programmeAt(epg, ch.tvgId, now)))
  }, [sports, epg])

  const groups = useMemo(() => {
    const set = new Set()
    for (const c of sports) if (c.group) set.add(c.group)
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [sports])

  const guideChannels = useMemo(
    () => (group === 'All' ? sports : sports.filter((c) => c.group === group)),
    [sports, group]
  )

  if (!sports.length) {
    return (
      <div className="empty">
        <div className="big">No sports channels found</div>
        <div className="small">
          We look for sports across your channel names, categories and EPG. Add a source with
          sports channels (or an EPG feed) and they'll show up here automatically.
        </div>
      </div>
    )
  }

  const featured = liveNow[0] || sports[0]
  const prog = featured ? nowProgram(featured, epg) : null

  return (
    <div className="sports-view">
      <div className="sports-hero-wrap">
        {featured && (
          <div className="hero sports-hero" onClick={() => onPlay(featured)}>
            {featured.logo && <img className="hero-art" src={featured.logo} alt="" />}
            <div className="hero-grad" />
            <div className="hero-content">
              <div className="hero-badge">
                <span className="dot" /> LIVE SPORTS
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

        <Shelf title="Live sports right now" items={liveNow} onPlay={onPlay} />
        {liveNow.length === 0 && <Shelf title="Sports channels" items={sports.slice(0, 30)} onPlay={onPlay} />}
      </div>

      <div className="sports-guide-head">
        <span className="shelf-title">Sports guide</span>
      </div>
      <div className="sports-guide">
        <LiveGuide
          channels={guideChannels}
          groups={groups}
          activeGroup={group}
          onGroup={setGroup}
          onPlay={onPlay}
        />
      </div>
    </div>
  )
}
