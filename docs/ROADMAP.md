# ROADMAP — piersonnorris.com

The shared task list for the three people building this site: **Pierce** (owner, decisions, secrets), **Claude** (gated tooling, docs, Drive research, build pipeline), and **ChatGPT** (public pages per `BLUEPRINT.md`, stock-update workflow). Read this first; it says what's in flight, what's next, and who owns it.

Sync rule: this file is canonical. The same list is mirrored to `TASKS.md` (Pierce's local Obsidian vault note, untracked) and seeded into the tracker's **Projects** board (`assets/js/taskboard.js → seed()`), which is also what `/island/` reads — so a card added there shows up in three places automatically. When a task changes state, update this file and the mirror you touched — whoever commits next reconciles the third.

Updated: 2026-09-06 — added §3a, the 22-item UI polish backlog from that day's site audit.

---

## 1. Now — in flight

### R1. Robinhood MCP connection — **Pierce**, then Claude
Pierce is setting up the Robinhood MCP on his side. Once connected, Claude wires it into the price seam that already exists: `PNPrices.resolve()` prefers a `quotes` map baked into the encrypted payload (`tools/tracker/build.js` emits `quotes: {}` today). The goal: scheduled builds carry real prices so the tracker values itself with **zero** browser API calls.
- Blocked on: Pierce's backend setup.
- Never: brokerage credentials in the repo, in Obsidian, or in chat. Read-only data only. Claude does not execute trades or transfers under any setup.

### R2. Tracker refresh secrets in GitHub Actions — **Pierce**
`.github/workflows/refresh-tracker.yml` exists but cannot run until repo secrets are set: `TRACKER_PASSWORD` (the tracker PIN), `GOOGLE_SERVICE_ACCOUNT_JSON`, `SHEET_ID`. Until then the tracker is rebuilt locally with `node tools/tracker/build.js --local-snapshot`.
- Done when: the scheduled workflow runs green and commits a refreshed `tools/tracker/index.html`.

### R3. Investment handoff file — **Pierce → Claude**
Pierce is passing off the next investment file shortly. When it lands: refresh `private/STOCK_HANDOFF.md` from the Sheet (or run the `stock-portfolio-update` skill with screenshots), create the new month tab, rebuild the tracker. Multiple month tabs light up the month switcher and the value-over-time chart automatically.

### R4. Content decisions — **Pierce** (blocking Claude + ChatGPT)
Open questions that block copy on the public pages (details in `CONTENT.md` `[OPEN]` markers):
1. Club title: still "incoming president" or president now? (five files change together)
2. The LLC's legal name — docs disagree: True North **Services** vs **Maintenance** vs North Shore Services (see CONTENT.md §3a).
3. Name Ryan Cravens publicly, or keep "operations lead"?
4. Oasis → True North: one continuous story or two chapters?
5. Keep Student Maintenance LLC (2025) on the public site?
6. Keep the "before Elon" prologue?
7. Anything to add for the thin 2024/2025 years?

## 2. Next — ready to build

### R5. Live prices — **mostly done 2026-09-05**
Pierce supplied a Twelve Data key; it now lives in `private/.twelvedata-key` (gitignored) and `build.js` bakes a spot price for every holding symbol into the encrypted payload (chunked 8/minute for the free tier — a local build takes ~4 minutes). All value charts work with zero browser API calls. Remaining:
- **Pierce:** paste the same key into the unlocked tracker's **Price source** panel once — that's what powers the Charts tab's *history* fetches (EMA lines on real candles), which happen client-side.
- **Pierce, with R2:** add the key as the optional `TWELVEDATA_API_KEY` repo secret so scheduled CI builds bake fresh quotes too.

### R6. Dividend research refresh — **Claude**, quarterly
`private/tracker/dividend-calendar.json` holds researched ex/pay dates for ET, VDE, VZ, UPS, SGOV, NEE, VST, BOTZ. Dates go stale each quarter — re-verify against issuer IR pages, update the JSON, rebuild. Always recheck with the issuer before trading around a date.

### R7. Public pages M2/M3 — **ChatGPT** (copy from CONTENT.md only)
About, Projects, Contact, Tools hub, 404, `sitemap.xml`, per-page OG tags. Blocked partly on R4. Rules: copy verbatim from `CONTENT.md`, `[OPEN]` means ask Pierce, no frameworks, no build steps, keep `llms.txt` in sync.

### R8. Résumé PDF — **Pierce**
Produce the PDF; it drops in at `/assets/resume/pierson-norris-resume.pdf`. The Experience page button already points there.

## 3. Later — parked on purpose

- **R9. Two-way Google Calendar sync** — needs a private OAuth backend design that keeps tokens off the public site. One-way `.ics` export already works.
- **R10. Obsidian visual style** — pick a direction from `notes/visual-options/` (local exploration) and apply it to `/notes/` and the tracker's Obsidian tab.
- **R11. Real launch hardening** — before promoting the site: revisit the template page's deliberate demo login (`tools/tracker/index.template.html`, fake by design "for now" per Pierce 2026-09-05), run the BLUEPRINT §10 definition-of-done list, attach the `piersonnorris.com` domain (CNAME + absolute-URL sweep).
- **R12. Chart indicators v2** — candlesticks, RSI/MACD, and EMA-crossover flags on the vault graph, only if Pierce actually uses v1.

## 3a. UI polish backlog — audited 2026-09-06, catalogued only

A full pass over the live site (Home, Experience, Notes, Tracker, Island), verified against the actual code rather than assumed — contrast ratios were measured, the favicon/skip-link/og:image gaps were grepped for, not guessed. All 22 mirror the taskboard seed (`assets/js/taskboard.js`) in the `backlog` column, so they show up on both the private Projects board and the public `/island/` page. **Nothing below is built yet** — move a card to `planned` before starting it.

**Accessibility & standards**
- **U1 — Fix low-contrast meta text.** `--dim` (#5c6675) on `--bg` measures 3.25:1, below the 4.5:1 WCAG AA floor for normal text. It's used for timestamps, footnotes, and dimmed labels across every page.
- **U2 — Restore visible focus rings.** `site.css` sets `outline:none` on all input/textarea/select focus (border-color only takes over); the vault graph's `.vg-node:focus` does the same. Keyboard users lose a clear focus indicator in both places.
- **U3 — Add a skip-to-content link.** None of the five pages has one.
- **U4 — Ship the favicon.** Confirmed zero pages declare one, despite BLUEPRINT.md calling for a dark-ground "PN" mark since the start.
- **U5 — Complete Open Graph + og:image.** Home has og:title/description; no page has an og:image, so shared links preview blank.

**Navigation & information architecture**
- **U6 — Mobile nav menu.** Six nav links plus `·pin`/`·soon` tags now share one flex-wrap row; needs a hamburger/drawer under narrow widths.
- **U7 — One real icon set.** Emoji are ad hoc today (🏝 in nav, 🐚⭐🦀 on the island, plain "·pin" text elsewhere) with no shared visual language.
- **U8 — Wire the home feed to `updates.js`.** The homepage "Recent" list is hand-typed static HTML that will silently go stale; point it at the same data the tracker's Updates tab already reads.
- **U9 — Site-wide "last updated" stamp**, sourced from U8's feed once it exists.

**Tracker-specific UI**
- **U10 — Sticky first column** on the platform tables, which now run 8 columns wide.
- **U11 — Show/hide toggle on the API-key field** (currently a plain `type=password` with no reveal option).
- **U12 — Compact agenda view for the calendar on mobile**, replacing the forced 680px-min horizontal scroll.
- **U13 — Loading skeletons** instead of plain "Loading…" text in Charts/Positions.
- **U14 — Group the Charts tab's control rows** (ticker chips / range / EMA toggles read as one dense stack today).
- **U15 — Friendlier empty states** for a brand-new Obsidian vault, calendar, or project board.
- **U16 — Row-hover highlight** across tracker tables.

**Visual polish & consistency**
- **U17 — Consolidate duplicated component CSS.** `.tile`/card/button patterns are redefined slightly differently per page.
- **U18 — Subtle entrance animation** on Home's console tiles and the Experience timeline, respecting `prefers-reduced-motion`.
- **U19 — Build the 404 page** (spec'd in BLUEPRINT.md, never built).
- **U20 — `theme-color` meta tag** so mobile browser chrome matches the dark background.
- **U21 — One radius/shadow scale.** `--r`/`--r-lg` exist, but notes.css/island.css/tracker inline styles each pick extra one-off values.
- **U22 — Tie the Island page's look back to the brand** — a bit more depth/texture, and confirm its type pairing reads as an extension of the site system rather than a break from it.

## 4. Standing rules (all three of us)

1. **Secrets never in the repo.** No PIN, keys, tokens, holdings, or client data in tracked files, commit messages, or chat meant for the public build. `private/` is never allowlisted in `.gitignore`.
2. **`docs/CONTENT.md` is the source of truth for public copy.** `docs/BLUEPRINT.md` for architecture. Don't invent facts; ask Pierce.
3. **Plain HTML/CSS/JS.** No frameworks, npm dependencies, or build steps for the site itself (the tracker's Node build script is the one sanctioned build).
4. **The tracker ships encrypted.** Only `tools/tracker/build.js` writes `tools/tracker/index.html`; verify no plaintext holdings after every build.
5. **Board ↔ Obsidian ↔ this file stay in sync** (see sync rule at top).
6. **Local rebuild + test loop:** `node tools/tracker/build.js --local-snapshot`, `node tools/tracker/calendar.test.js`, `node tools/tracker/taskboard.test.js`, then click through the demo page.
