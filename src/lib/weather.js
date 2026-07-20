// Gameday weather via Open-Meteo (free, no key), routed through our proxy.

import { fetchJson } from './api.js'

// WMO weather codes -> label + emoji.
const WMO = {
  0: ['Clear', '☀️'], 1: ['Mainly clear', '🌤️'], 2: ['Partly cloudy', '⛅'], 3: ['Overcast', '☁️'],
  45: ['Fog', '🌫️'], 48: ['Rime fog', '🌫️'],
  51: ['Light drizzle', '🌦️'], 53: ['Drizzle', '🌦️'], 55: ['Heavy drizzle', '🌧️'],
  61: ['Light rain', '🌦️'], 63: ['Rain', '🌧️'], 65: ['Heavy rain', '🌧️'],
  71: ['Light snow', '🌨️'], 73: ['Snow', '🌨️'], 75: ['Heavy snow', '❄️'],
  80: ['Rain showers', '🌦️'], 81: ['Showers', '🌧️'], 82: ['Violent showers', '⛈️'],
  95: ['Thunderstorm', '⛈️'], 96: ['Thunderstorm', '⛈️'], 99: ['Hailstorm', '⛈️']
}

// Accepts a string or an ordered list of candidate place strings and returns the
// first that geocodes. Stadium names rarely geocode, so callers pass fallbacks
// (venue → city/region → country).
export async function geocode(query) {
  const candidates = []
  for (const c of Array.isArray(query) ? query : [query]) {
    if (!c) continue
    candidates.push(c) // whole string
    if (c.includes(',')) {
      candidates.push(c.split(',')[0]) // city part
      candidates.push(c.split(',').pop()) // country part
    }
  }
  for (const q of candidates) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim())}&count=1`
    const d = await fetchJson(url).catch(() => null)
    const r = d?.results?.[0]
    if (r) return { lat: r.latitude, lon: r.longitude, name: [r.name, r.country_code].filter(Boolean).join(', ') }
  }
  return null
}

// Forecast for a specific moment. Returns null if beyond the forecast horizon.
export async function forecastAt(lat, lon, whenMs) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m&forecast_days=16&timezone=UTC`
  const d = await fetchJson(url).catch(() => null)
  const h = d?.hourly
  if (!h?.time?.length) return null
  // Find the closest hour to the requested time.
  const target = new Date(whenMs || Date.now())
  const iso = target.toISOString().slice(0, 13) // yyyy-mm-ddThh
  let idx = h.time.findIndex((t) => t.slice(0, 13) === iso)
  if (idx < 0) idx = 0
  const [text, emoji] = WMO[h.weather_code[idx]] || ['—', '🌡️']
  return {
    tempC: Math.round(h.temperature_2m[idx]),
    precip: h.precipitation_probability?.[idx] ?? null,
    windKph: Math.round(h.wind_speed_10m[idx]),
    text,
    emoji
  }
}
