// Xtream Codes client. Talks to a panel's player_api.php through our proxy and
// normalizes live streams, VOD and series into the same channel shape the rest
// of the app uses. Also builds direct stream URLs.

import { fetchJson } from './api.js'

function base(server) {
  let s = server.trim().replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(s)) s = 'http://' + s
  return s
}

function apiUrl(account, params) {
  const u = new URL(base(account.server) + '/player_api.php')
  u.searchParams.set('username', account.username)
  u.searchParams.set('password', account.password)
  for (const [k, v] of Object.entries(params || {})) u.searchParams.set(k, v)
  return u.toString()
}

export async function xtreamAuth(account) {
  const data = await fetchJson(apiUrl(account, {}))
  if (!data || !data.user_info) throw new Error('Invalid response from panel')
  if (String(data.user_info.auth) === '0') throw new Error('Authentication failed (bad username/password)')
  return data
}

// Live stream playback URL (HLS preferred, falls back handled by player).
export function liveUrl(account, streamId, ext = 'm3u8') {
  return `${base(account.server)}/live/${account.username}/${account.password}/${streamId}.${ext}`
}
export function vodUrl(account, streamId, ext) {
  return `${base(account.server)}/movie/${account.username}/${account.password}/${streamId}.${ext || 'mp4'}`
}
export function seriesUrl(account, episodeId, ext) {
  return `${base(account.server)}/series/${account.username}/${account.password}/${episodeId}.${ext || 'mp4'}`
}

// Full XMLTV EPG for the whole account (one fetch instead of per-channel calls).
export function xtreamEpgUrl(account) {
  return `${base(account.server)}/xmltv.php?username=${encodeURIComponent(
    account.username
  )}&password=${encodeURIComponent(account.password)}`
}

export async function loadXtreamChannels(account) {
  const [liveCats, liveStreams] = await Promise.all([
    fetchJson(apiUrl(account, { action: 'get_live_categories' })).catch(() => []),
    fetchJson(apiUrl(account, { action: 'get_live_streams' })).catch(() => [])
  ])

  const catName = {}
  for (const c of liveCats || []) catName[c.category_id] = c.category_name

  const channels = (liveStreams || []).map((s) => ({
    id: `xt_${account.id}_${s.stream_id}`,
    name: s.name || `Channel ${s.stream_id}`,
    logo: s.stream_icon || '',
    group: catName[s.category_id] || 'Live',
    tvgId: s.epg_channel_id || '',
    chno: s.num || '',
    kind: 'live',
    streamId: s.stream_id,
    accountId: account.id,
    url: liveUrl(account, s.stream_id, 'm3u8')
  }))

  return channels
}

// VOD + series are loaded lazily (they can be huge) but exposed for the Library.
export async function loadXtreamVod(account) {
  const [cats, streams] = await Promise.all([
    fetchJson(apiUrl(account, { action: 'get_vod_categories' })).catch(() => []),
    fetchJson(apiUrl(account, { action: 'get_vod_streams' })).catch(() => [])
  ])
  const catName = {}
  for (const c of cats || []) catName[c.category_id] = c.category_name
  return (streams || []).map((s) => ({
    id: `xtv_${account.id}_${s.stream_id}`,
    name: s.name || `Movie ${s.stream_id}`,
    logo: s.stream_icon || '',
    group: catName[s.category_id] || 'Movies',
    rating: s.rating,
    kind: 'vod',
    accountId: account.id,
    url: vodUrl(account, s.stream_id, s.container_extension)
  }))
}

// Series list (metadata only; episodes are fetched on demand per series).
export async function loadXtreamSeries(account) {
  const [cats, series] = await Promise.all([
    fetchJson(apiUrl(account, { action: 'get_series_categories' })).catch(() => []),
    fetchJson(apiUrl(account, { action: 'get_series' })).catch(() => [])
  ])
  const catName = {}
  for (const c of cats || []) catName[c.category_id] = c.category_name
  return (series || []).map((s) => ({
    id: `xts_${account.id}_${s.series_id}`,
    seriesId: s.series_id,
    name: s.name || `Series ${s.series_id}`,
    logo: s.cover || '',
    group: catName[s.category_id] || 'Series',
    plot: s.plot,
    rating: s.rating,
    kind: 'series',
    accountId: account.id
  }))
}

// Seasons + episodes for one series.
export async function getSeriesInfo(account, seriesId) {
  const data = await fetchJson(apiUrl(account, { action: 'get_series_info', series_id: seriesId }))
  const epsBySeason = data?.episodes || {}
  const seasons = Object.keys(epsBySeason)
    .sort((a, b) => Number(a) - Number(b))
    .map((seasonNum) => ({
      season: seasonNum,
      episodes: (epsBySeason[seasonNum] || []).map((e) => ({
        id: `xte_${account.id}_${e.id}`,
        episodeId: e.id,
        num: e.episode_num,
        name: e.title || `Episode ${e.episode_num}`,
        logo: e.info?.movie_image || data?.info?.cover || '',
        plot: e.info?.plot,
        duration: e.info?.duration,
        kind: 'vod',
        accountId: account.id,
        url: seriesUrl(account, e.id, e.container_extension)
      }))
    }))
  return { info: data?.info || {}, seasons }
}
