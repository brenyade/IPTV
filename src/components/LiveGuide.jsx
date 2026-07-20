import { useMemo, useRef, useState, useEffect } from 'react'
import { PX_PER_MIN, SLOT_MIN, floorToSlot, buildSchedule } from '../lib/guide.js'
import { useEpg } from '../lib/epgContext.js'
import { ChLogo } from './ChannelCard.jsx'

const HOURS_AHEAD = 12
const HOURS_BEHIND = 1

function fmtTime(d) {
  return new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default function LiveGuide({ channels, groups, activeGroup, onGroup, onPlay }) {
  const [now, setNow] = useState(Date.now())
  const scrollRef = useRef(null)
  const epg = useEpg()

  // Tick the "now" line every 30s.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  const windowStart = useMemo(() => floorToSlot(now - HOURS_BEHIND * 3600 * 1000).getTime(), [now])
  const windowEnd = windowStart + (HOURS_AHEAD + HOURS_BEHIND) * 3600 * 1000
  const totalMin = (windowEnd - windowStart) / 60000
  const gridWidth = totalMin * PX_PER_MIN

  const timeLabels = useMemo(() => {
    const labels = []
    for (let t = windowStart; t < windowEnd; t += SLOT_MIN * 60 * 1000) {
      labels.push({ t, left: ((t - windowStart) / 60000) * PX_PER_MIN })
    }
    return labels
  }, [windowStart, windowEnd])

  const nowLeft = ((now - windowStart) / 60000) * PX_PER_MIN

  // Scroll so "now" is near the left on first mount.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = Math.max(0, nowLeft - 40)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rows = useMemo(
    () =>
      channels.map((ch) => ({
        ch,
        progs: buildSchedule(ch, windowStart, windowEnd, epg)
      })),
    [channels, windowStart, windowEnd, epg]
  )

  return (
    <div className="guide">
      <div className="guide-filters">
        {['All', ...groups].map((g) => (
          <button
            key={g}
            className={'chip' + (activeGroup === g ? ' active' : '')}
            onClick={() => onGroup(g)}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="guide-scroll" ref={scrollRef}>
        <div className="guide-inner" style={{ width: `calc(var(--guide-rail) + ${gridWidth}px)` }}>
          {/* time header */}
          <div className="guide-timerow">
            <div className="corner">{new Date(now).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</div>
            <div className="time-labels" style={{ width: gridWidth }}>
              {timeLabels.map((l) => (
                <div key={l.t} className="time-label" style={{ left: l.left, width: SLOT_MIN * PX_PER_MIN }}>
                  {fmtTime(l.t)}
                </div>
              ))}
            </div>
          </div>

          {/* now line spanning all rows */}
          {nowLeft >= 0 && (
            <div className="nowline" style={{ left: `calc(var(--guide-rail) + ${nowLeft}px)` }} />
          )}

          {/* channel rows */}
          {rows.map(({ ch, progs }) => (
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
        </div>
      </div>
    </div>
  )
}
