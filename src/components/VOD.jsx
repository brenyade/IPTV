import { useEffect, useMemo, useState } from 'react'
import { loadXtreamVod, loadXtreamSeries, getSeriesInfo } from '../lib/xtream.js'
import { Back, Play } from './Icons.jsx'

function Poster({ item, onClick }) {
  const [fail, setFail] = useState(false)
  return (
    <button className="vod-card" onClick={onClick}>
      <div className="vod-thumb">
        {item.logo && !fail ? (
          <img src={item.logo} alt="" loading="lazy" onError={() => setFail(true)} />
        ) : (
          <div className="vod-noimg">{(item.name || '?').slice(0, 2).toUpperCase()}</div>
        )}
        {item.kind === 'series' && <span className="vod-tag">SERIES</span>}
      </div>
      <div className="vod-name">{item.name}</div>
      {item.rating ? <div className="vod-rating">★ {item.rating}</div> : null}
    </button>
  )
}

function SeriesDetail({ account, series, onBack, onPlay }) {
  const [data, setData] = useState(null)
  const [season, setSeason] = useState(null)

  useEffect(() => {
    let alive = true
    getSeriesInfo(account, series.seriesId)
      .then((d) => {
        if (!alive) return
        setData(d)
        setSeason(d.seasons[0]?.season ?? null)
      })
      .catch(() => alive && setData({ info: {}, seasons: [] }))
    return () => { alive = false }
  }, [account, series.seriesId])

  const cur = data?.seasons.find((s) => s.season === season)

  return (
    <div className="page">
      <button className="text-back" onClick={onBack}><Back style={{ width: 18, height: 18 }} /> On Demand</button>
      <div className="series-hero">
        {series.logo && <img className="series-cover" src={series.logo} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />}
        <div>
          <h1>{series.name}</h1>
          <div className="team-sub">{series.group}{series.rating ? ` · ★ ${series.rating}` : ''}</div>
          {(series.plot || data?.info?.plot) && <p className="team-desc" style={{ paddingBottom: 8 }}>{series.plot || data?.info?.plot}</p>}
        </div>
      </div>

      {!data ? (
        <div className="empty" style={{ height: 160 }}><div className="spinner" /></div>
      ) : data.seasons.length === 0 ? (
        <div className="source-sub">No episodes found for this series.</div>
      ) : (
        <>
          <div className="guide-filters" style={{ padding: '4px 0 12px', borderBottom: 'none' }}>
            {data.seasons.map((s) => (
              <button key={s.season} className={'chip' + (season === s.season ? ' active' : '')} onClick={() => setSeason(s.season)}>
                Season {s.season}
              </button>
            ))}
          </div>
          <div className="episode-list">
            {cur?.episodes.map((ep) => (
              <div className="episode-item" key={ep.id} onClick={() => onPlay(ep)}>
                <div className="ep-num">{ep.num}</div>
                <div className="ep-main">
                  <div className="ep-name">{ep.name}</div>
                  {ep.plot && <div className="ep-plot">{ep.plot}</div>}
                </div>
                <button className="watch-play" onClick={(e) => { e.stopPropagation(); onPlay(ep) }}>
                  <Play style={{ width: 16, height: 16 }} /> Play
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function VOD({ sources, onPlay }) {
  const accounts = useMemo(() => sources.filter((s) => s.type === 'xtream'), [sources])
  const [tab, setTab] = useState('movies') // movies | series
  const [movies, setMovies] = useState(null)
  const [series, setSeries] = useState(null)
  const [group, setGroup] = useState('All')
  const [openSeries, setOpenSeries] = useState(null) // { account, series }

  useEffect(() => {
    let alive = true
    if (!accounts.length) { setMovies([]); setSeries([]); return }
    Promise.all(accounts.map((a) => loadXtreamVod(a).catch(() => []))).then((l) => alive && setMovies(l.flat()))
    Promise.all(accounts.map((a) => loadXtreamSeries(a).catch(() => []))).then((l) => alive && setSeries(l.flat()))
    return () => { alive = false }
  }, [accounts])

  if (accounts.length === 0) {
    return (
      <div className="empty">
        <div className="big">On Demand needs an Xtream Codes account</div>
        <div className="small">Movies and series come from Xtream Codes panels. Add one under “Add source”, and your VOD library appears here.</div>
      </div>
    )
  }

  if (openSeries) {
    return <SeriesDetail account={openSeries.account} series={openSeries.series} onBack={() => setOpenSeries(null)} onPlay={onPlay} />
  }

  const items = tab === 'movies' ? movies : series
  const groups = items ? [...new Set(items.map((i) => i.group).filter(Boolean))].sort((a, b) => a.localeCompare(b)) : []
  const shown = items && group !== 'All' ? items.filter((i) => i.group === group) : items

  return (
    <div className="page vod-view">
      <div className="modal-tabs" style={{ padding: '8px 0 8px' }}>
        <button className={'modal-tab' + (tab === 'movies' ? ' active' : '')} onClick={() => { setTab('movies'); setGroup('All') }}>Movies</button>
        <button className={'modal-tab' + (tab === 'series' ? ' active' : '')} onClick={() => { setTab('series'); setGroup('All') }}>Series</button>
      </div>

      {items === null ? (
        <div className="empty" style={{ height: 240 }}><div className="spinner" /></div>
      ) : items.length === 0 ? (
        <div className="source-sub">No {tab} found in your account.</div>
      ) : (
        <>
          <div className="guide-filters" style={{ padding: '4px 0 12px', borderBottom: 'none' }}>
            {['All', ...groups].slice(0, 60).map((g) => (
              <button key={g} className={'chip' + (group === g ? ' active' : '')} onClick={() => setGroup(g)}>{g}</button>
            ))}
          </div>
          <div className="vod-grid">
            {shown.slice(0, 300).map((item) =>
              tab === 'movies' ? (
                <Poster key={item.id} item={item} onClick={() => onPlay(item)} />
              ) : (
                <Poster
                  key={item.id}
                  item={item}
                  onClick={() => setOpenSeries({ account: accounts.find((a) => a.id === item.accountId), series: item })}
                />
              )
            )}
          </div>
        </>
      )}
    </div>
  )
}
