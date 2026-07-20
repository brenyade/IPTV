// XMLTV EPG parsing + lookup, and sports classification.
//
// Parsing is done with a targeted string scan rather than DOMParser: EPG feeds
// are frequently multi-megabyte, and building a full DOM for tens of thousands
// of <programme> nodes is slow and memory hungry. We only need a handful of
// fields per programme, so we extract them directly.

const SPORTS_RE =
  /sport|football|soccer|basketball|baseball|hockey|tennis|golf|rugby|cricket|boxing|\bmma\b|\bufc\b|wrestling|racing|motogp|formula|\bf1\b|nascar|\bnfl\b|\bnba\b|\bnhl\b|\bmlb\b|\bepl\b|premier league|la liga|bundesliga|serie a|champions league|europa|olympic|athletic|espn|\bbein\b|\bdazn\b|sky spor|tnt spor|fox spor|\bnbc sports?\b|willow|fanduel|\bgolf channel\b|tennis channel|\bsec network\b|\bacc network\b|\bbtn\b|\bwwe\b/i

export function isSportsText(...vals) {
  return SPORTS_RE.test(vals.filter(Boolean).join(' '))
}

// Parse XMLTV "20260720123000 +0000" (offset optional) into epoch ms.
function parseXmltvTime(s) {
  if (!s) return NaN
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?\s*([+-]\d{4})?/.exec(s.trim())
  if (!m) return NaN
  const [, Y, Mo, D, H, Mi, S, tz] = m
  let ms = Date.UTC(+Y, +Mo - 1, +D, +H, +Mi, +(S || 0))
  if (tz) {
    const sign = tz[0] === '-' ? -1 : 1
    const oh = +tz.slice(1, 3)
    const om = +tz.slice(3, 5)
    ms -= sign * (oh * 60 + om) * 60000
  }
  return ms
}

function decodeEntities(str) {
  if (!str || str.indexOf('&') === -1) return str
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&amp;/g, '&')
}

function firstTag(block, tag) {
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(block)
  return m ? decodeEntities(m[1].trim()) : ''
}
function allTags(block, tag) {
  const out = []
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi')
  let m
  while ((m = re.exec(block))) out.push(decodeEntities(m[1].trim()))
  return out
}

// Returns Map<channelId(lowercased), programme[]> sorted by start.
export function parseXMLTV(text) {
  const byChannel = new Map()
  const re = /<programme\b([^>]*)>([\s\S]*?)<\/programme>/gi
  let m
  while ((m = re.exec(text))) {
    const attrs = m[1]
    const body = m[2]
    const chMatch = /channel="([^"]+)"/i.exec(attrs)
    if (!chMatch) continue
    const ch = chMatch[1].toLowerCase()
    const start = parseXmltvTime((/start="([^"]+)"/i.exec(attrs) || [])[1])
    const stop = parseXmltvTime((/stop="([^"]+)"/i.exec(attrs) || [])[1])
    if (!Number.isFinite(start)) continue
    const title = firstTag(body, 'title') || 'Program'
    const desc = firstTag(body, 'desc')
    const cats = allTags(body, 'category')
    byChannel.get(ch)?.push({ start, stop, title, desc, cats }) ||
      byChannel.set(ch, [{ start, stop, title, desc, cats }])
  }
  for (const arr of byChannel.values()) arr.sort((a, b) => a.start - b.start)
  return byChannel
}

// Lookup helpers over the parsed Map.
export function programmesFor(epg, tvgId) {
  if (!epg || !tvgId) return null
  return epg.get(String(tvgId).toLowerCase()) || null
}

export function programmeAt(epg, tvgId, at = Date.now()) {
  const arr = programmesFor(epg, tvgId)
  if (!arr) return null
  // Programmes are sorted; small linear scan is fine for a single channel.
  for (const p of arr) {
    const end = Number.isFinite(p.stop) ? p.stop : p.start + 60 * 60000
    if (at >= p.start && at < end) return p
  }
  return null
}

export function programmeIsSports(p) {
  return !!p && (p.cats?.some((c) => SPORTS_RE.test(c)) || SPORTS_RE.test(p.title))
}
