// Minimal iCalendar (.ics) generation for game reminders — no dependencies.

function fmt(ms) {
  // UTC basic format: YYYYMMDDTHHMMSSZ
  return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}
function esc(s) {
  return String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')
}

function vevent(g) {
  const start = g.startMs || Date.now()
  const end = start + 3 * 3600e3
  return [
    'BEGIN:VEVENT',
    `UID:${g.id || g.gameId || start}@youtubetv-iptv`,
    `DTSTAMP:${fmt(Date.now())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(g.name || g.label || 'Game')}`,
    g.venue ? `LOCATION:${esc(g.venue)}` : '',
    g.league ? `DESCRIPTION:${esc(g.league)}` : '',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(g.name || g.label || 'Game starting soon')}`,
    'END:VALARM',
    'END:VEVENT'
  ]
    .filter(Boolean)
    .join('\r\n')
}

export function buildIcs(games) {
  const list = Array.isArray(games) ? games : [games]
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//YouTube TV IPTV//Sports//EN',
    'CALSCALE:GREGORIAN',
    ...list.map(vevent),
    'END:VCALENDAR'
  ].join('\r\n')
}

export function downloadIcs(games, filename = 'games.ics') {
  const blob = new Blob([buildIcs(games)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
