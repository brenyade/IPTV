// Persists user sources (M3U playlists + Xtream accounts), favorites and
// recents to localStorage.

const KEY = 'iptv.sources.v1'
const FAV = 'iptv.favorites.v1'
const RECENT = 'iptv.recents.v1'

export function loadSources() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}
export function saveSources(list) {
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function loadFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAV) || '[]')
  } catch {
    return []
  }
}
export function saveFavorites(ids) {
  localStorage.setItem(FAV, JSON.stringify(ids))
}

export function loadRecents() {
  try {
    return JSON.parse(localStorage.getItem(RECENT) || '[]')
  } catch {
    return []
  }
}
export function pushRecent(channelId) {
  const cur = loadRecents().filter((id) => id !== channelId)
  cur.unshift(channelId)
  const trimmed = cur.slice(0, 20)
  localStorage.setItem(RECENT, JSON.stringify(trimmed))
  return trimmed
}
