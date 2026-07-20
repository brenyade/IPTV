import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import { PX_PER_MIN, SLOT_MIN, floorToSlot, buildSchedule } from '../lib/guide.js'
import { useEpg } from '../lib/epgContext.js'
import { ChLogo } from './ChannelCard.jsx'

const HOURS_AHEAD = 12
const HOURS_BEHIND = 1
const ROW_H = 76 // keep in sync with --guide-row
const BUFFER = 6 // rows rendered above/below the viewport

function fmtTime(d) {
  return new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default function LiveGuide({ channels, groups, activeGroup, onGroup, onPlay }) {
  const [now, setNow] = useState(Date.now())
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportH, setViewportH] = useState(800)
  const scrollRef = useRef(null)
  const epg = useEpg()

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  const windowStart = useMemo(() => floorToSlot(now - HOURS_BEHIND * 3600 * 1000).getTime(), [now])
  const windowEnd = windowStart + (HOURS_AHEAD + HOURS_BEHIND) * 3600 * 1000
  const gridWidth = ((windowEnd - windowStart) / 60000) * PX_PER_MIN

  const timeLabels = useMemo(() => {
    const labels = []
    for (let t = windowStart; t < windowEnd; t += SLOT_MIN * 60 * 1000) {
      labels.push({ t, left: ((t - windowStart) / 60000) * PX_PER_MIN })
    }
    return labels
  }, [windowStart, windowEnd])

  const nowLeft = ((now - windowStart) / 60000) * PX_PER_MIN

  // Measure the scroll viewport; scroll horizontally to "now" on first mount.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    setViewportH(el.clientHeight || 800)
    el.scrollLeft = Math.max(0, nowLeft - 40)
    const onResize = () => setViewportH(el.clientHeight || 800)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reset vertical scroll when the channel set changes (e.g. category filter).
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    setScrollTop(0)
  }, [channels])

  const onScroll = useCallback((e) => setScrollTop(e.currentTarget.scrollTop), [])

  // ---- Row virtualization ---------------------------------------------------
  const total = channels.length
  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - BUFFER)
  const visibleCount = Math.ceil(viewportH / ROW_H) + BUFFER * 2
  const end = Math.min(total, start + visibleCount)
  const topPad = start * ROW_H
  const bottomPad = Math.max(0, (total - end) * ROW_H)

  const visibleRows = useMemo(() => {
    const out = []
    for (let i = start; i < end; i++) {
      const ch = channels[i]
      out.push({ ch, progs: buildSchedule(ch, windowStart, windowEnd, epg) })
    }
    return out
  }, [channels, start, end, windowStart, windowEnd, epg])

  return (
    <div className="guide">
      <div className="guide-filters">
        {['All', ...groups].map((g) => (
          <button key={g} className={'chip' + (activeGroup === g ? ' active' : '')} onClick={() => onGroup(g)}>
            {g}
          </button>
        ))}
      </div>

      <div className="guide-scroll" ref={scrollRef} onScroll={onScroll}>
        <div className="guide-inner" style={{ width: `calc(var(--guide-rail) + ${gridWidth}px)` }}>
          {/* time header */}
          <div className="guide-timerow">
            <div className="corner">
              {new Date(now).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
            <div className="time-labels" style={{ width: gridWidth }}>
              {timeLabels.map((l) => (
                <div key={l.t} className="time-label" style={{ left: l.left, width: SLOT_MIN * PX_PER_MIN }}>
                  {fmtTime(l.t)}
                </div>
              ))}
            </div>
          </div>

          {nowLeft >= 0 && <div className="nowline" style={{ left: `calc(var(--guide-rail) + ${nowLeft}px)` }} />}

          {/* virtualized channel rows */}
          {topPad > 0 && <div style={{ height: topPad }} />}
          {visibleRows.map(({ ch, progs }) => (
            <div className="guide-row" key={ch.id}>
              <div className="guide-railcell" onClick={() => onPlay(ch)} title={ch.name}>
                <ChLogo channel={ch} className="rail-logo" />
                <div className="rail-meta">
                  {ch.chno ? <div className="rail-num">{ch.chno}</div> : null}
                  <div className="rail-name">{ch.name}</div>
                </div>
              </div>
              <div className="guide-progs" style={{ width: gridWidth }}>
                {progs.map((p, i) => {
                  const left = ((p.start - windowStart) / 60000) * PX_PER_MIN
                  const width = ((p.end - p.start) / 60000) * PX_PER_MIN - 4
                  const isLive = now >= p.start && now < p.end
                  return (
                    <div
                      key={i}
                      className={'prog' + (isLive ? ' live' : '')}
                      style={{ left, width }}
                      onClick={() => onPlay(ch)}
                      title={p.desc ? `${p.title}\n\n${p.desc}` : p.title}
                    >
                      <div className="prog-title">
                        {isLive && <span className="livedot">● LIVE</span>}
                        {p.title}
                      </div>
                      <div className="prog-sub">
                        {fmtTime(p.start)} – {fmtTime(p.end)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          {bottomPad > 0 && <div style={{ height: bottomPad }} />}
        </div>
      </div>
    </div>
  )
}
