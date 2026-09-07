# assets/ — shared design system + JS modules

Plain CSS and dependency-free vanilla JS. No npm, no bundler. Every module attaches one global and is loaded with a plain `<script>` tag. Match this style when editing: ES5-flavored, IIFE-wrapped, comments explain constraints rather than restating code.

## CSS

- `css/site.css` — the design system: tokens (`--bg`, `--acc` Fern green, platform brand colors), nav/panel/button/table/metric components, chart + vault-graph styles. Dark-only by design; body background always explicit.
- `css/notes.css` — the Obsidian-style notes UI (lock card, sidebar, editor, rendered markdown) and the `.pg-*` vault-connectivity graph.

## JS modules (load order matters only as noted)

| File | Global | What it does |
|---|---|---|
| `js/charts.js` | `PNCharts` | SVG charts: `donut`, `bars` (opt `keepOrder`), `stack`, `line`, `spark`, `market` (interactive price+volume; accepts `opts.overlays` for EMA lines), `graph` (force-directed vault graph). Every chart carries a `<title>/<desc>` and a hidden data table for screen readers. Use `Number.isFinite` for overlay guards — `isFinite(null)` is true and once dragged the price scale to zero. |
| `js/prices.js` | `PNPrices` | Counts → dollars. `classify` (Shares/Units/USD rows), `resolve` (quote order: payload-baked → 15-min cache → provider → manual), `history` (daily OHLCV), `ema(values, period)`, `sampleHistory` (deterministic fake series for the demo), `valuate`, `sumBy`, `total`. The `baked quotes` map is the seam for the Robinhood MCP feed (ROADMAP R1). API keys live in localStorage only. |
| `js/vault.js` | `PNVault` | Encrypted note storage: PBKDF2(600k) → AES-256-GCM → localStorage, per scope (`general`, `stocks`). Markdown+YAML round-trip with Obsidian, store-only `.zip` export, subset markdown renderer (escapes first; NUL-sentinel code-block stashing is deliberate). `importBundle()` takes the JSON bundle from `tools/obsidian-sync.js` and **upserts** by `sourcePath` (the `.md` path only ever added, so repeat imports were useless); it never deletes. |
| `js/notes-graph.js` | `PNGraphify` | The vault connectivity graph. `build(notes, {tags, missing})` is pure and unit-tested — it decides what counts as a link, an orphan and an unresolved `[[wikilink]]`; `mount(el, {getNotes, onOpen, onCreate, onTag})` is the force-directed SVG on top, with pan/zoom, node dragging and a hidden node list for screen readers. Lays out synchronously before the first paint: `requestAnimationFrame` never fires in a background tab, and nodes are positioned by a group transform. Separate from `PNCharts.graph`, which stays the tracker Projects tab’s projects-and-thoughts map. |
| `js/notes-ui.js` | `PNNotes` | The mounted notes app (lock screen, list, editor, outlook fields in stock mode) plus the tracker integration API: `upsertNote`, position journals, calendar/board persistence, `openTicker`, `openNoteById`. A **Graph** toolbar button swaps the main pane for `PNGraphify` when it is loaded; `renderAll()` always leaves that view (it means “show me a note”), while `refresh()` redraws in place. |
| `js/calendar.js` | `PNCalendar` | Date math, event normalization, `.ics` generation for the portfolio calendar. Storage-agnostic on purpose. |
| `js/taskboard.js` | `PNTaskboard` | Project-board columns, normalize/metrics/move, and `seed()` — **seed mirrors `docs/ROADMAP.md`; keep them in sync.** |

Tests live in `tools/tracker/*.test.js` (plain Node, no test framework): `calendar`, `taskboard`, `charts` (indicator maths) and `notes-graph` (graph model + `tools/obsidian-sync.js` + the `build.js` payload seam).
