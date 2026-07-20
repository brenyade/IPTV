// Persists user sources (M3U playlists + Xtream accounts), favorites and
// recents to localStorage.

const KEY = 'iptv.sources.v1'
const FAV = 'iptv.favorites.v1'
const RECENT = 'iptv.recents.v1'
const FAVTEAMS = 'iptv.favteams.v1'
const REMINDERS = 'iptv.reminders.v1'
const PINNED_LEAGUES = 'iptv.pinnedleagues.v1'

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

// Favorite teams: [{ id, name, badge }]
export function loadFavTeams() {
  try {
    return JSON.parse(localStorage.getItem(FAVTEAMS) || '[]')
  } catch {
    return []
  }
}
export function saveFavTeams(list) {
  localStorage.setItem(FAVTEAMS, JSON.stringify(list))
}

// Game reminders: [{ gameId, startMs, label }]
export function loadReminders() {
  try {
    return JSON.parse(localStorage.getItem(REMINDERS) || '[]')
  } catch {
    return []
  }
}
export function saveReminders(list) {
  localStorage.setItem(REMINDERS, JSON.stringify(list))
}

// Pinned league keys (strings).
export function loadPinnedLeagues() {
  try {
    return JSON.parse(localStorage.getItem(PINNED_LEAGUES) || '[]')
  } catch {
    return []
  }
}
export function savePinnedLeagues(keys) {
  localStorage.setItem(PINNED_LEAGUES, JSON.stringify(keys))
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
