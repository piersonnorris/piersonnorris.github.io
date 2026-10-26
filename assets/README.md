# assets/ — shared design system + JS modules

Plain CSS and dependency-free vanilla JS. No npm, no bundler. Every module attaches one global and is loaded with a plain `<script>` tag. Match this style when editing: ES5-flavored, IIFE-wrapped, comments explain constraints rather than restating code.

## CSS

- `css/site.css` — the design system: tokens (`--bg`, `--acc` Fern green, platform brand colors), nav/panel/button/table/metric components, chart + vault-graph styles. Dark-only by design; body background always explicit.
- `css/notes.css` — the Obsidian-style notes UI (lock card, sidebar, editor, rendered markdown) and the `.pg-*` vault-connectivity graph.

## JS modules (load order matters only as noted)

| File | Global | What it does |
|---|---|---|
| `js/vault.js` | `PNVault` | Encrypted note storage: PBKDF2(600k) → AES-256-GCM → localStorage, per scope (`general`, `stocks`). Markdown+YAML round-trip with Obsidian, store-only `.zip` export, subset markdown renderer (escapes first; NUL-sentinel code-block stashing is deliberate). `importBundle()` takes the JSON bundle from `tools/obsidian-sync.js` and **upserts** by `sourcePath` (the `.md` path only ever added, so repeat imports were useless); it never deletes. |
| `js/notes-graph.js` | `PNGraphify` | The vault connectivity graph. `build(notes, {tags, missing})` is pure and unit-tested — it decides what counts as a link, an orphan and an unresolved `[[wikilink]]`; `mount(el, {getNotes, onOpen, onCreate, onTag})` is the force-directed SVG on top, with pan/zoom, node dragging and a hidden node list for screen readers. Lays out synchronously before the first paint: `requestAnimationFrame` never fires in a background tab, and nodes are positioned by a group transform. Separate from `PNCharts.graph`, the tracker Projects tab’s projects-and-thoughts map, which left this repo with the tracker. |
| `js/notes-ui.js` | `PNNotes` | The mounted notes app (lock screen, list, editor, outlook fields in stock mode) plus an integration API — `upsertNote`, position journals, calendar/board persistence, `openTicker`, `openNoteById` — that only the portfolio tracker used. The tracker keeps its own copy in the private `stock-trackers` repo, so stock mode is dormant here. A **Graph** toolbar button swaps the main pane for `PNGraphify` when it is loaded; `renderAll()` always leaves that view (it means “show me a note”), while `refresh()` redraws in place. |
| `js/calendar.js` | `PNCalendar` | Date math, event normalization, `.ics` generation. On this site only `/island/`'s tide chart uses it. Storage-agnostic on purpose. |
| `js/taskboard.js` | `PNTaskboard` | Project-board columns, normalize/metrics/move, and `seed()` — **seed mirrors `docs/ROADMAP.md`; keep them in sync.** |
| `js/nightfall.js` | `PNNightfall` | The home hero's evening: press the Firefly Jar under the Lake Michigan photo and the light drains from the sky, night and the stars come on, the fireflies leave the jar, and the page hands over to `/jar/#open`. `frame(t, layout)` is pure and unit-tested (`nightfall.test.js`); `mount()` is the DOM half. Needs `js/atlas-flight.js` (`PNFlight.pointAt`) loaded first, so the fireflies fly the Atlas's path. `?nightfall-t=<ms>` freezes any moment for checking. |

Tests live in `tools/tests/*.test.js` (plain Node, no test framework): `atlas-links`, `calendar`, `markdown`, `notes-graph` (graph model + `tools/obsidian-sync.js`), `taskboard`, `vault-groups` and `vault-publish`. The chart and build-seam tests left with the tracker.

## Image credits

| File | Source | Licence |
|---|---|---|
| `img/home/lake-sunset-800.jpg`, `-480.jpg` | [Chicago Lakefront Sunset – Lake Michigan Harbor](https://commons.wikimedia.org/wiki/File:Chicago_Lakefront_Sunset_-_Lake_Michigan_Harbor.jpg), **Tony Webster**, via Wikimedia Commons | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) — **attribution required**, credited under the photo on the home page. Cropped to a 2:3 portrait (full height, from 55.5% across, which keeps the speedboat and its passengers out of frame) by `tools/img/crop-hero.ps1`. The 22 MB original is not committed. |

| `img/home/headshot.jpg` | Pierson's own LinkedIn profile photo (595×595), chosen by him 2026-10-25 | His own photo. Re-encoded, so no camera metadata. |
| `img/home/crypto-night-1`, `screencastify-1`, `ai-summit-1…3`, `ai-public-good-1…3`, `dad-duke-1…3`, `pse-nationals-1…4,7`, `techstars-dsm-1,3` (`.jpg`) | Pierson's own LinkedIn posts (Oct 1, Jul 16, May 6, Apr 19, Feb 6, Mar 30, 2026; Apr 8, 2025), chosen at his request 2026-10-25 | His own posts. Resized to 480 px tall, aspect kept, re-encoded (no EXIF/GPS). |
| `img/home/applied-ai-1.jpg` … `-5.jpg` | The five photos from Pierson's own Oct 20, 2026 LinkedIn post on the Oct 13 Applied AI event, chosen by him 2026-10-25 | His own post. Cropped to 3:4 at 480×640 and re-encoded (no EXIF/GPS). |

CC BY is satisfied only while the credit stays visible next to the photo: if the photo moves, the credit moves with it.

---

Vault category: [[Website Project Index]]  
Tags: #category/website


