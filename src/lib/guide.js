// Builds the Live Guide program grid. Real EPG data (XMLTV / Xtream short_epg)
// is used when available; otherwise we synthesize a stable, plausible schedule
// so the guide always renders like YouTube TV's Live tab.

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

// Returns [{ title, start(ms), end(ms) }] covering [windowStart, windowEnd].
export function buildSchedule(channel, windowStart, windowEnd) {
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
    progs.push({ title: `${title}`, start: t, end: t + dur })
    t += dur
    i++
  }
  return progs
}

export function nowProgram(channel, at = Date.now()) {
  const start = floorToSlot(new Date(at - 3 * 60 * 60 * 1000))
  const progs = buildSchedule(channel, start, new Date(at + 6 * 60 * 60 * 1000))
  return progs.find((p) => at >= p.start && at < p.end) || progs[0]
}
