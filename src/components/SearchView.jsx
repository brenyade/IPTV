import { useMemo } from 'react'
import ChannelCard from './ChannelCard.jsx'
import { Search } from './Icons.jsx'

export default function SearchView({ channels, query, onPlay }) {
  const q = query.trim().toLowerCase()
  const results = useMemo(() => {
    if (!q) return []
    return channels
      .filter((c) => c.name.toLowerCase().includes(q) || (c.group || '').toLowerCase().includes(q))
      .slice(0, 200)
  }, [q, channels])

  if (!q) {
    return (
      <div className="empty">
        <Search style={{ width: 40, height: 40, color: '#717171' }} />
        <div className="big">Search YouTube TV</div>
        <div className="small">Find live channels and shows across all your playlists and accounts.</div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="section-title">
        {results.length} result{results.length === 1 ? '' : 's'} for “{query}”
      </div>
      <div className="grid">
        {results.map((ch) => (
          <ChannelCard key={ch.id} channel={ch} onPlay={onPlay} />
        ))}
      </div>
    </div>
  )
}
