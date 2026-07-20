// Builds the Live Guide program grid. Real EPG data (XMLTV) is used when
// available; otherwise we synthesize a stable, plausible schedule so the guide
// always renders like YouTube TV's Live tab.

import { programmesFor, programmeAt } from './epg.js'

export const SLOT_MIN = 30 // guide granularity in minutes
export const PX_PER_MIN = 6 // horizontal density of the timeline

const FILLERS = [
  'Live Programming',
  'On Air Now',
  'Prime Time',
  'Top Stories',
  'Feature Presentation',
  'The Evening Show',
  'Headline News',
  'Sports Tonight',
  'Documentary',
  'Movie of the Week',
  'Talk of the Town',
  'Morning Briefing',
  'World Report',
  'Encore Presentation',
  'Studio Live'
]

// Deterministic pseudo-random from a string so a channel's schedule is stable.
function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function floorToSlot(date) {
  const d = new Date(date)
  d.setSeconds(0, 0)
  d.setMinutes(d.getMinutes() - (d.getMinutes() % SLOT_MIN))
  return d
}

// Returns [{ title, start(ms), end(ms), real, desc }] covering the window.
// Uses real EPG programmes when the channel has them, else a stable synthetic
// schedule so the grid is never empty.
export function buildSchedule(channel, windowStart, windowEnd, epg) {
  const ws = new Date(windowStart).getTime()
  const we = new Date(windowEnd).getTime()

  const real = programmesFor(epg, channel.tvgId)
  if (real && real.length) {
    const out = []
    for (const p of real) {
      const end = Number.isFinite(p.stop) ? p.stop : p.start + 30 * 60000
      if (end <= ws || p.start >= we) continue
      out.push({ title: p.title, start: p.start, end, real: true, desc: p.desc, cats: p.cats })
    }
    if (out.length) return out
  }

  const seed = hash(channel.id + channel.name)
  const progs = []
  let t = new Date(windowStart).getTime()
  const end = new Date(windowEnd).getTime()
  let i = 0
  while (t < end) {
    // Program length: 30, 60 or 90 minutes, chosen deterministically.
    const lenChoices = [30, 30, 60, 60, 90]
    const len = lenChoices[(seed + i * 7) % lenChoices.length]
    const dur = len * 60 * 1000
    const title = FILLERS[(seed + i * 13) % FILLERS.length]
    progs.push({ title: `${title}`, start: t, end: t + dur, real: false })
    t += dur
    i++
  }
  return progs
}

export function nowProgram(channel, epg, at = Date.now()) {
  const live = programmeAt(epg, channel.tvgId, at)
  if (live) {
    return {
      title: live.title,
      start: live.start,
      end: Number.isFinite(live.stop) ? live.stop : live.start + 30 * 60000,
      real: true,
      desc: live.desc,
      cats: live.cats
    }
  }
  const start = floorToSlot(new Date(at - 3 * 60 * 60 * 1000))
  const progs = buildSchedule(channel, start, new Date(at + 6 * 60 * 60 * 1000))
  return progs.find((p) => at >= p.start && at < p.end) || progs[0]
}
