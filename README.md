# YouTube TV — IPTV / M3U / M3U8 / Xtream Codes Player

A full, working IPTV player with a UI modeled on **YouTube TV** (tv.youtube.com) —
the live‑TV / cable‑replacement experience with **Library · Home · Live** tabs and a
classic **Live Guide** channel grid.

It plays:

- **M3U / M3U8** playlists — by URL or by uploading a local `.m3u` / `.m3u8` file
- **Xtream Codes** panels — server URL + username + password (live streams)
- HLS (`.m3u8`), MPEG‑TS (`.ts`) live streams, and direct media (`.mp4`, etc.)

…with a real **EPG** (program guide) and a dedicated **Sports** section.

![Live Guide](docs/guide.png)
![Sports](docs/sports.png)

## Why there's a small backend

Browsers block cross‑origin requests to most IPTV servers (no CORS headers), and
can't fetch `http://` streams from an `https://` page. So the app ships with a tiny
Express server that:

- proxies playlist/Xtream API fetches (`/api/fetch`, `/api/json`)
- fetches EPG feeds and transparently gunzips `.xml.gz` (`/api/epg`)
- relays HLS/TS streams and **rewrites manifest URLs** so nested playlists and
  segments keep flowing through the proxy (`/api/stream`)
- serves the built React app in production

Everything the browser talks to is same‑origin. Nothing is stored server‑side; your
playlists, favorites and history live in `localStorage`.

## Run it

```bash
npm install

# Development (Vite on :5173 + API on :5174, hot reload)
npm run dev
# open http://localhost:5173

# Production (build + single server on :5174)
npm run build
npm start
# open http://localhost:5174
```

Then click **Add source** and paste an M3U URL, upload a file, or enter your Xtream
Codes credentials.

### Try it instantly

Any public M3U works, e.g. from the open [iptv‑org](https://github.com/iptv-org/iptv)
project:

```
https://iptv-org.github.io/iptv/categories/news.m3u
```

## Features

- **Live Guide** — YouTube‑TV‑style grid: sticky channel rail with logos + numbers,
  scrollable time header, program blocks, a live red "now" line, and category filter
  chips.
- **EPG (XMLTV)** — real program data with titles, times, descriptions and a ● LIVE
  marker on the current show. Sources:
  - **M3U** — auto‑detected from the playlist header (`url-tvg` / `x-tvg-url`), or set
    an EPG URL manually in *Add source*. Plain `.xml` and gzipped `.xml.gz` feeds are
    both supported (the backend gunzips transparently).
  - **Xtream Codes** — pulled automatically from the panel's `xmltv.php`.
  Channels with no EPG fall back to a stable synthesized schedule so the grid is never
  empty.
- **Sports** — a dedicated section that finds sports across channel names, categories
  **and** EPG (so a general channel airing a live match shows up): a "Live sports right
  now" shelf (EPG‑driven) plus a sports‑only Live Guide.
- **Home** — featured hero + horizontal shelves (Continue watching, Favorites, and a
  row per category).
- **Search** — instant filtering across every channel in every source.
- **Library** — manage your playlists / accounts and see your favorites.
- **Player** — full‑screen with HLS.js + mpegts.js, favorite toggle, live pill,
  loading and graceful error states. `Esc` closes it.
- Favorites and "continue watching" history persisted locally.

## Tech

React + Vite frontend · Express proxy backend · hls.js · mpegts.js. No accounts,
no database, no telemetry.

## Notes / limitations

- A channel only plays if its stream is online and reachable from wherever the
  backend runs (geo‑blocking and provider auth still apply).
- Some providers encrypt or token‑gate segments; those may not play in a browser.
- This project ships **no** channels or credentials — you bring your own legally
  obtained playlist or account.
