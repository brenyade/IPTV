// Parses M3U / M3U8 extended playlists into normalized channel objects.
//
// Handles the common extended tags used by IPTV providers:
//   #EXTINF:-1 tvg-id="..." tvg-name="..." tvg-logo="..." group-title="News",Display Name
//   #EXTGRP:News
//   http://host/stream.m3u8

let uid = 0
const nextId = () => `m3u_${Date.now().toString(36)}_${uid++}`

function parseAttrs(line) {
  const attrs = {}
  const re = /([a-zA-Z0-9_-]+)="([^"]*)"/g
  let m
  while ((m = re.exec(line))) attrs[m[1].toLowerCase()] = m[2]
  return attrs
}

// The display name in an #EXTINF line is everything after the first comma that
// is NOT inside a quoted attribute value. Attribute values (e.g. a
// http-user-agent="Mozilla/5.0 ...like Gecko) Chrome/1,2...") can themselves
// contain commas, so a naive indexOf(',') splits in the wrong place.
function nameCommaIndex(line) {
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') inQuotes = !inQuotes
    else if (c === ',' && !inQuotes) return i
  }
  return -1
}

// Many playlists declare their EPG in the header, e.g.
//   #EXTM3U url-tvg="http://host/epg.xml" x-tvg-url="..."
// Returns the first such URL (may be comma-separated; we take the first).
export function extractEpgUrl(text) {
  const firstLine = (text || '').split(/\r?\n/, 1)[0] || ''
  const m = /(?:url-tvg|x-tvg-url|tvg-url)="([^"]+)"/i.exec(firstLine)
  if (!m) return ''
  return m[1].split(',')[0].trim()
}

export function parseM3U(text) {
  const lines = text.split(/\r?\n/)
  const channels = []
  let current = null
  let pendingGroup = null

  for (let raw of lines) {
    const line = raw.trim()
    if (!line) continue

    if (line.startsWith('#EXTINF')) {
      const attrs = parseAttrs(line)
      const commaIdx = nameCommaIndex(line)
      const name = commaIdx >= 0 ? line.slice(commaIdx + 1).trim() : attrs['tvg-name'] || 'Unknown'
      current = {
        id: nextId(),
        name: name || attrs['tvg-name'] || 'Unknown',
        logo: attrs['tvg-logo'] || '',
        group: attrs['group-title'] || pendingGroup || 'Uncategorized',
        tvgId: attrs['tvg-id'] || '',
        chno: attrs['tvg-chno'] || attrs['channel-number'] || '',
        kind: 'live',
        url: ''
      }
    } else if (line.startsWith('#EXTGRP')) {
      pendingGroup = line.split(':')[1]?.trim() || pendingGroup
      if (current) current.group = pendingGroup
    } else if (line.startsWith('#EXTVLCOPT') || line.startsWith('#EXTM3U') || line.startsWith('#')) {
      // Skip other directives.
      continue
    } else {
      // A URL line.
      if (current) {
        current.url = line
        channels.push(current)
        current = null
      } else {
        // URL with no preceding EXTINF — still usable.
        channels.push({
          id: nextId(),
          name: line.split('/').pop() || line,
          logo: '',
          group: pendingGroup || 'Uncategorized',
          tvgId: '',
          chno: '',
          kind: 'live',
          url: line
        })
      }
    }
  }
  return channels
}
