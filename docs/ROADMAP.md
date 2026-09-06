# ROADMAP — piersonnorris.com

The shared task list for the three people building this site: **Pierce** (owner, decisions, secrets), **Claude** (gated tooling, docs, Drive research, build pipeline), and **ChatGPT** (public pages per `BLUEPRINT.md`, stock-update workflow). Read this first; it says what's in flight, what's next, and who owns it.

Sync rule: this file is canonical. The same list is mirrored to `TASKS.md` (Pierce's local Obsidian vault note, untracked) and seeded into the tracker's **Projects** board (`assets/js/taskboard.js → seed()`), which is also what `/island/` reads — so a card added there shows up in three places automatically. When a task changes state, update this file and the mirror you touched — whoever commits next reconciles the third.

Updated: 2026-09-06 — §5 PN Tasks added (Pierce's open-questions queue + idea backlog); §3a: 14 of the 22-item UI backlog built same-day, 8 deliberately deferred (each says why).

---

## 1. Now — in flight

### R1. Robinhood MCP connection — **Pierce**, then Claude
Pierce is setting up the Robinhood MCP on his side. Once connected, Claude wires it into the price seam that already exists: `PNPrices.resolve()` prefers a `quotes` map baked into the encrypted payload (`tools/tracker/build.js` emits `quotes: {}` today). The goal: scheduled builds carry real prices so the tracker values itself with **zero** browser API calls.
- Blocked on: Pierce's backend setup.
- Never: brokerage credentials in the repo, in Obsidian, or in chat. Read-only data only. Claude does not execute trades or transfers under any setup.

### R2. Tracker refresh secrets in GitHub Actions — **Pierce**
`.github/workflows/refresh-tracker.yml` exists but cannot run until repo secrets are set: `TRACKER_PASSWORD` (the tracker PIN), `GOOGLE_SERVICE_ACCOUNT_JSON`, `SHEET_ID`. Until then the tracker is rebuilt locally with `node tools/tracker/build.js --local-snapshot`.
- Done when: the scheduled workflow runs green and commits a refreshed `tools/tracker/index.html`.

### R3. Investment handoff file — ✅ done 2026-09-06
September 2026 (48 holdings) confirmed by Pierce and sealed into the tracker alongside August. Month switcher and value-over-time chart both show two points now. Reopens automatically next time a new month lands: refresh `private/STOCK_HANDOFF.md` from the Sheet (or run the `stock-portfolio-update` skill with screenshots), create the new tab, rebuild.

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
- **R12. Chart indicators v2** — candlesticks, RSI/MACD, and EMA-crossover flags on the *stock chart* (corrected 2026-09-06 — this previously said "vault graph," which is a different feature entirely), only if Pierce actually uses v1. Dividend markers and normalized comparison mode (the plan's own "recommended next milestone") shipped 2026-09-06 — see `docs/STOCK_CHART_PLAN.md` Version 2 status. Portfolio-aggregate line, total-return toggle, and a benchmark line stay parked until a dated transaction ledger exists — faking one off today's share counts would misrepresent performance.

## 3a. UI polish backlog — audited 2026-09-06, 15/22 built

A full pass over the live site (Home, Experience, Notes, Tracker, Island), verified against the actual code rather than assumed — contrast ratios were measured, the favicon/skip-link/og:image gaps were grepped for, not guessed. All 22 mirror the taskboard seed (`assets/js/taskboard.js`), so they show up on both the private Projects board and the public `/island/` page. 14 were built the same day; 8 stayed in `backlog` on purpose (see each item).

**Accessibility & standards**
- ✅ **U1 — Fix low-contrast meta text.** `--dim` measured 3.25:1 on `--bg`, below the 4.5:1 WCAG AA floor. Bumped to `#7a8392` (4.94:1).
- ✅ **U2 — Restore visible focus rings.** Correction made *while* fixing this: input/textarea/select were already fine (a later `:focus-visible` rule with equal specificity already wins the outline back in the cascade) — only `.pnchart-graph .vg-node:focus` was genuinely broken, because its two-class selector (0,0,3,0) outranks the generic `[tabindex]:focus-visible` rule (0,0,2,0) regardless of source order. Added `.vg-node:focus-visible` with its own ring.
- ✅ **U3 — Add a skip-to-content link.** Added to all five pages + 404.
- ✅ **U4 — Ship the favicon.** A bold green "P" mark, dark rounded-square ground, as an SVG (`assets/img/favicon.svg`) linked from every `<head>`.
- 🔲 **U5 — Complete Open Graph + og:image.** Still open: a compliant og:image needs a real raster (PNG/JPG) asset — Facebook/Twitter's crawlers don't reliably render SVG og:images, and this session has no image-generation tool. Needs a dedicated design pass.

**Navigation & information architecture**
- ✅ **U6 — Mobile nav menu** (built 2026-09-06, its own pass). Hamburger toggle (`assets/js/nav.js`) shared across all six pages, collapsing `.navlinks` under 760px into a push-down panel. Caught a real trap: Experience defines its own unconditional `.navlinks{display:flex}` which — equal specificity, later in the cascade than site.css — would have silently beaten a site.css-only fix, so it got its own matching override. Verified at true desktop width (toggle hidden) and mobile (opens, closes, auto-closes on link click) on all six pages including the real encrypted tracker.
- 🔲 **U7 — One real icon set.** Deferred as a real design project; U15's empty-state icon is a first small step toward it.
- ✅ **U8 — Wire the home feed to `updates.js`.** Re-scoped before building: `updates.js` tracks *website-engineering* changes, wrong subject matter for a career-facing homepage. Pinned an explicit sync-note comment to the real source of truth (the Experience page / CONTENT.md §3) instead.
- 🔲 **U9 — Site-wide "last updated" stamp.** Re-scoped: `updates.js` is the wrong source here too, for the same reason as U8. Needs someone to decide what "last updated" should mean for a *public* page before anything gets built.

**Tracker-specific UI**
- ✅ **U10 — Sticky first column** on wide platform tables (verified via computed style: `position:sticky`).
- ✅ **U11 — Show/hide toggle on the API-key field.**
- 🔲 **U12 — Compact agenda view for the calendar on mobile.** Deferred: touching the calendar's rendering carries real regression risk; wanted its own focused pass.
- 🔲 **U13 — Loading skeletons.** Deferred for time.
- ✅ **U14 — Group the Charts tab's control rows** into three labeled groups (Stock / Range / Indicators).
- ✅ **U15 — Friendlier empty states.** Checked all three named cases first: the Obsidian vault's blank state really was plain text (got an icon); the Calendar's per-day state and the board's per-column state were already dashed-box/friendly-copy — left those two alone.
- ✅ **U16 — Row-hover highlight** across tracker tables.

**Visual polish & consistency**
- 🔲 **U17 — Consolidate duplicated component CSS.** Deferred: real but risky, needs its own careful pass rather than a rushed refactor.
- ✅ **U18 — Subtle entrance animation** on Home's console tiles and the Experience timeline's year sections, via a shared `.enter-fade` keyframe respecting `prefers-reduced-motion`.
- ✅ **U19 — Build the 404 page.**
- ✅ **U20 — `theme-color` meta tag** on every page (island uses its own sky-blue).
- 🔲 **U21 — One radius/shadow scale.** Actually counted it: 13 distinct border-radius values (2–16px) across the repo, not a small drift. Forcing them all onto the existing two tokens would visibly break small elements (a 3px nail dot doesn't want a 10px radius) — the real fix is a proper 4–5 step scale mapped by hand, not a blind find-replace. Deferred rather than done carelessly.
- ✅ **U22 — Tie the Island page's look back to the brand** — added a soft ground shadow under the sign board so it reads as sitting in the sand.

## 4. Standing rules (all three of us)

1. **Secrets never in the repo.** No PIN, keys, tokens, holdings, or client data in tracked files, commit messages, or chat meant for the public build. `private/` is never allowlisted in `.gitignore`.
2. **`docs/CONTENT.md` is the source of truth for public copy.** `docs/BLUEPRINT.md` for architecture. Don't invent facts; ask Pierce.
3. **Plain HTML/CSS/JS.** No frameworks, npm dependencies, or build steps for the site itself (the tracker's Node build script is the one sanctioned build).
4. **The tracker ships encrypted.** Only `tools/tracker/build.js` writes `tools/tracker/index.html`; verify no plaintext holdings after every build.
5. **Board ↔ Obsidian ↔ this file stay in sync** (see sync rule at top).
6. **Questions for Pierce get logged, not just asked in chat.** Anything Claude or ChatGPT can't resolve without Pierce goes in **§5 PN Tasks → Open questions** so it survives past one session.
7. **Local rebuild + test loop:** `node tools/tracker/build.js --local-snapshot`, `node tools/tracker/calendar.test.js`, `node tools/tracker/taskboard.test.js`, then click through the demo page.

## 5. PN Tasks — Pierce's queue

A dedicated inbox for anything that specifically needs Pierce: an open question Claude or ChatGPT can't resolve alone, or a feature idea that needs his call before anyone starts building. Standing rule (also in §4): **log it here as soon as it comes up — don't just ask in chat and let the answer evaporate.** Every entry — question or idea — carries a **Source** line (who raised it, where, when) so it's traceable later instead of a bare, unattributed bullet. Mirrors `TASKS.md` and the taskboard seed (`assets/js/taskboard.js`) like everything else in this file.

### Open questions for Pierce

*(none open right now — the next one lands here, not buried in a reply)*

### Idea backlog — needs Pierce's decision before anyone builds it

- **Ship-in-a-bottle Easter egg.** A bottle-and-ship graphic somewhere on the site — click the bottle and the cork pops, pull the ship free; click the ship and it opens an embedded Obsidian-vault viewer with a genuinely polished UI, not just an iframe dump. Directly overlaps **R10 (Obsidian visual style)** — the viewer's look *is* that open design question, so picking one direction answers both. Pierce also wants something similarly small-footprint-but-high-impact on the home page itself. **Owner: Pierce.** Needs a design direction first — single-note view vs. graph view, colors/typography carried over from R10's pick, where the bottle actually lives (home vs. `/notes/`) — before Claude or ChatGPT should build any of it.
  **Source:** Pierce, Cowork chat with Claude, 2026-09-06 — his own words: "reaching a visual obsidian with some [Easter] eggs on the website like a shipping [bottle] ... in addition to something like that on the home site too that looks small, but has impact."
