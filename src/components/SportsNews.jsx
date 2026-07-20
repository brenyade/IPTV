import { useEffect, useState } from 'react'
import { fetchTopNews } from '../lib/news.js'
import { Back } from './Icons.jsx'

function ago(ts) {
  if (!ts) return ''
  const s = (Date.now() - new Date(ts).getTime()) / 1000
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86400)}d ago`
}

export default function SportsNews({ onBack }) {
  const [items, setItems] = useState(null)

  useEffect(() => {
    let alive = true
    fetchTopNews().then((n) => alive && setItems(n)).catch(() => alive && setItems([]))
    return () => { alive = false }
  }, [])

  return (
    <div className="page sports-news">
      <button className="text-back" onClick={onBack}><Back style={{ width: 18, height: 18 }} /> Sports</button>
      <div className="league-head"><span className="league-emoji">📰</span><h1>Sports news</h1></div>

      {items === null ? (
        <div className="empty" style={{ height: 200 }}><div className="spinner" /></div>
      ) : items.length === 0 ? (
        <div className="source-sub">Couldn’t load news right now.</div>
      ) : (
        <div className="news-grid">
          {items.slice(0, 40).map((a) => (
            <a className="news-card" key={a.id} href={a.link} target="_blank" rel="noreferrer">
              <div className="news-thumb">
                {a.image ? <img src={a.image} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} /> : null}
                <span className="news-cat">{a.category}</span>
              </div>
              <div className="news-body">
                <div className="news-headline">{a.headline}</div>
                {a.description && <div className="news-desc">{a.description}</div>}
                <div className="news-meta">{a.byline ? `${a.byline} · ` : ''}{ago(a.published)}</div>
              </div>
            </a>
          ))}
        </div>
      )}
      <div className="stat-credit">News by ESPN</div>
    </div>
  )
}
