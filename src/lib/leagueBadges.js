// Lazy, throttled, persisted loader for league crest images. Cards call
// useLeagueBadge(id); badges are fetched a few at a time and cached in
// localStorage so subsequent visits are instant. Emoji is the fallback.

import { useEffect, useReducer } from 'react'
import { leagueBadge } from './sportsApi.js'

const LS = 'iptv.leaguebadges.v1'
let cache // Map<id, url|''>
const requested = new Set()
const subs = new Set()
const queue = []
let active = 0
const MAX = 3

function load() {
  if (!cache) {
    try {
      cache = new Map(Object.entries(JSON.parse(localStorage.getItem(LS) || '{}')))
    } catch {
      cache = new Map()
    }
  }
  return cache
}
function persist() {
  try {
    localStorage.setItem(LS, JSON.stringify(Object.fromEntries(load())))
  } catch {}
}
function pump() {
  while (active < MAX && queue.length) {
    const id = queue.shift()
    active++
    leagueBadge(id)
      .then((url) => load().set(id, url || ''))
      .catch(() => load().set(id, ''))
      .finally(() => {
        active--
        persist()
        subs.forEach((f) => f())
        pump()
      })
  }
}

export function useLeagueBadge(id) {
  const [, force] = useReducer((x) => x + 1, 0)
  useEffect(() => {
    const f = () => force()
    subs.add(f)
    if (id && !load().has(id) && !requested.has(id)) {
      requested.add(id)
      queue.push(id)
      pump()
    }
    return () => subs.delete(f)
  }, [id])
  return load().get(id) // url string, '' (none), or undefined (pending)
}
