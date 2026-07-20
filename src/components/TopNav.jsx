import { Search, Plus } from './Icons.jsx'

const TABS = ['Library', 'Home', 'Live']

export default function TopNav({ view, onView, onAdd, query, onQuery }) {
  return (
    <header className="topnav">
      <div className="yt-logo" onClick={() => onView('home')} role="button" title="YouTube TV">
        <span className="glyph" />
        <span className="word">YouTube</span>
        <span className="tv">TV</span>
      </div>

      <nav className="nav-tabs">
        {TABS.map((t) => {
          const key = t.toLowerCase()
          return (
            <button
              key={t}
              className={'nav-tab' + (view === key ? ' active' : '')}
              onClick={() => onView(key)}
            >
              {t}
            </button>
          )
        })}
      </nav>

      <div className="nav-spacer" />

      <div className="nav-right">
        {view === 'search' ? (
          <div className="nav-search">
            <Search />
            <input
              autoFocus
              placeholder="Search channels and shows"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
            />
          </div>
        ) : (
          <button className="icon-btn" title="Search" onClick={() => onView('search')}>
            <Search />
          </button>
        )}
        <button className="add-btn" onClick={onAdd} title="Add playlist or account">
          <Plus />
          <span>Add source</span>
        </button>
        <div className="avatar" title="Account">U</div>
      </div>
    </header>
  )
}
