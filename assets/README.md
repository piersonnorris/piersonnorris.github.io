# assets/ — shared design system + JS modules

Plain CSS and dependency-free vanilla JS. No npm, no bundler. Every module attaches one global and is loaded with a plain `<script>` tag. Match this style when editing: ES5-flavored, IIFE-wrapped, comments explain constraints rather than restating code.

## CSS

- `css/site.css` — the design system: tokens (`--bg`, `--acc` Fern green, platform brand colors), nav/panel/button/table/metric components, chart + vault-graph styles. Dark-only by design; body background always explicit.
- `css/notes.css` — the Obsidian-style notes UI (lock card, sidebar, editor, rendered markdown).

## JS modules (load order matters only as noted)

| File | Global | What it does |
|---|---|---|
| `js/charts.js` | `PNCharts` | SVG charts: `donut`, `bars` (opt `keepOrder`), `stack`, `line`, `spark`, `market` (interactive price+volume; accepts `opts.overlays` for EMA lines), `graph` (force-directed vault graph). Every chart carries a `<title>/<desc>` and a hidden data table for screen readers. Use `Number.isFinite` for overlay guards — `isFinite(null)` is true and once dragged the price scale to zero. |
| `js/prices.js` | `PNPrices` | Counts → dollars. `classify` (Shares/Units/USD rows), `resolve` (quote order: payload-baked → 15-min cache → provider → manual), `history` (daily OHLCV), `ema(values, period)`, `sampleHistory` (deterministic fake series for the demo), `valuate`, `sumBy`, `total`. The `baked quotes` map is the seam for the Robinhood MCP feed (ROADMAP R1). API keys live in localStorage only. |
| `js/vault.js` | `PNVault` | Encrypted note storage: PBKDF2(600k) → AES-256-GCM → localStorage, per scope (`general`, `stocks`). Markdown+YAML round-trip with Obsidian, store-only `.zip` export, subset markdown renderer (escapes first; NUL-sentinel code-block stashing is deliberate). |
| `js/notes-ui.js` | `PNNotes` | The mounted notes app (lock screen, list, editor, outlook fields in stock mode) plus the tracker integration API: `upsertNote`, position journals, calendar/board persistence, `openTicker`, `openNoteById`. |
| `js/calendar.js` | `PNCalendar` | Date math, event normalization, `.ics` generation for the portfolio calendar. Storage-agnostic on purpose. |
| `js/taskboard.js` | `PNTaskboard` | Project-board columns, normalize/metrics/move, and `seed()` — **seed mirrors `docs/ROADMAP.md`; keep them in sync.** |

Tests for calendar and taskboard live in `tools/tracker/*.test.js` (plain Node, no test framework).
