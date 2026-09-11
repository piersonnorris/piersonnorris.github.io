# KNOWLEDGE ATLAS → ONE GREAT JAR

**Status 2026-09-10: steps 1, 2 and 3 done. The jar is sealed, real, and it opens — the swarm pours
out through the mouth and fills the scene, and seals back. Steps 4–7 remain; §9 questions 1 and 2 are
answered, 3 and 4 still need Pierce's call.**
Redesign of `/atlas/` as an Obsidian showcase: the vault as fireflies in one jar.

Decided by Pierce, 2026-09-10: direction **B**, one jar, real vault data, telescope + Ship's log kept,
rich-but-steady motion, scope is the Atlas page only.

Brief in his words: *"the idea is to make this page showcase obsidian in a visualy stunning way."*

Component: `assets/js/atlas-jar.js` + `assets/css/jar.css` + `assets/js/vault-groups.js`.
Scratch route: `vault/concepts/jar/` (local only, same as the Observatory's comps).
Companion: `docs/BOTTLE_SHOWCASE.md` (R18) — the home page's bottle, which this must not duplicate.

---

## 0. The one rule

The swarm is the real `[[wikilink]]` graph, drawn by `PNGraphify` from real notes. A pretty swarm that
isn't the actual structure is a screensaver, and it undercuts the only thing the page exists to prove.
Same rule the Bottle Observatory holds itself to.

## 1. What this is not

`/` (home) is becoming the **Bottle Observatory** — a bottle on an ocean, notes as a constellation behind
glass. This page must not read as a second version of that. The separation, stated so it can be checked:

| | Bottle Observatory (`/`) | Jar (`/atlas/`) |
|---|---|---|
| Object | bottle on its side, sea | mason jar standing on a plank, night |
| Notes are | still stars behind glass | **living fireflies** — they move on their own |
| Structure shown as | drawn lines | **clusters** — the vault's actual communities |
| The trick | glass, and the morph out of it | **the swarm organising itself** |
| Job | first impression of Pierce | how Pierce actually uses Obsidian |

Also inherited: the showcase never links to the tracker.

## 2. The composition

Three states on one page. No route changes, no page transitions.

**State 1 — SEALED.** Full-bleed night. One jar, centered, lid on, standing on a plank. Inside: every
note in the vault as a firefly, drifting, breathing, colliding softly with the glass. Fireflies are
already sorted into their real clusters, so the jar reads as several distinct glowing masses rather than
soup. Etched on the glass label: real counts — notes, links, links per note, orphans, unresolved.
Copy sits **outside** the glass, capped at `min(40ch, 36vw)` (the Observatory's phase-A finding, taken as
given rather than re-learned). One affordance: the lid.

**State 2 — OPEN.** Lift the lid. Fireflies rise out and spread across the whole viewport, each one
walking its own path from its place in the glass to its place in the room — a layout morph, not a zoom
(again, Observatory phase A: a zoom inflates nodes and drops half the vault off-screen). The jar demotes
to a rim vignette plus the base it's standing on, so you stay inside the metaphor. Labels appear at
readable size. This is the state the page lives in.

**State 3 — SELECTED.** *(Revised 2026-09-10 by Pierce's answer to §9 Q1: reading lives at `/vault/`.)*
Press a firefly. It holds still and brightens; its linked neighbours stay lit and named; everything else
dims to embers. The firefly's own card shows title, folder, tags and link counts, and the way to the
words themselves is a link out to `/vault/#docs/BLUEPRINT.md`. The jar does not render note bodies and
does not need a Markdown renderer — `/vault/` already is the reading surface and does it properly.

The cost of that answer, stated so it isn't a surprise later: pressing a firefly eventually leaves the
page, which is the one place §2's "no route changes, no page transitions" gives way. It buys not having
a second reader to keep in step with the first.

Phone is a **third composition, not a reflow**: jar upright in a band, copy above, controls below,
reading panel as a sheet.

## 3. What the fireflies encode

Every visual property is data. Nothing is decorative-only.

- **Cluster → hue.** Communities from label propagation over the link graph. Labels are *derived, never
  invented*: shared folder (≥60%) → shared tag (≥60%) → *"around HUB"* → **"unnamed group · 6 notes"**.
  Rule 4 is load-bearing: if the vault hasn't earned a name, the cluster doesn't get one.
- **Degree → brightness and size.** A hub note is a bright, slow, heavy firefly. A leaf is a faint spark.
- **Recency → flicker rate.** Recently-edited notes pulse quickly; stale notes fade to a slow ember.
- **Orphans → dark, drifting alone,** counted in the readout even though nothing connects to them.
  Hiding them flatters the vault; R15's argument.
- **Unresolved links → a firefly flying toward nothing** and winking out at the edge.

## 4. Controls

Four, all of them earning their place. Everything else stays cut.

1. **The lid** — seal / open. The only control in state 1.
2. **The telescope** *(kept from today's Atlas)* — draws the link filaments between fireflies. Off by
   default: the clusters read better as light, and the lines are the "prove it" toggle.
3. **Find groups** — hulls + earned labels over the clusters. Off by default; grouping is an
   interpretation laid over the honest view, and toggling it never re-lays out the swarm.
4. **Ship's log** *(kept)* — the vault by time. Not a separate crate any more: it re-sorts the swarm into
   a timeline band, newest fireflies near the surface, oldest settled low. Same fireflies, second axis.

**Cap, stated honestly.** ~90 fireflies drawn, ranked by degree then recency, with the readout
*"showing 90 of 312 — ranked by connections."* Never a silent truncation. Plus a largest-connected-
component toggle. This is what makes pointing the page at a few-hundred-note vault safe.

## 5. Motion budget — "rich but steady"

Every effect is an opacity, a transform, or a `stroke-dashoffset`. Nothing touches layout, nothing
reflows per frame.

Per-firefly drift on its own seeded path · brightness breathing · a slow warm wash inside the glass ·
dust motes outside it · a specular sweep on the jar shoulder and one rim light on the base (two marks,
not ten) · pulses running down filaments when the telescope is on · the lid's rise.

`prefers-reduced-motion` is a **path, not a switch**: the morph becomes an instant placement, drift stops,
flicker becomes static brightness. Page still works; it just stops moving.

Positioning and animation live on **separate nested groups** — a CSS animation on the same element the
script positions snaps it to the origin. Written down because it already bit the Observatory build.

## 6. Data

Pierce picked **his real Obsidian vault**, not the curated lesson notes.

Path: `tools/obsidian-sync.js --vault "<vault>" --report`, read the report, then `--public`. The publish
pipe, the scrubber and the `publish:false` / `#private` / `nopublish/` exclusions are already built
(BACKSTAGE_PLAN P1–P3). Until that runs, the page reads today's `assets/data/vault-public.js` snapshot
(13 notes, the site's own `docs/` folder) so the visual can be judged before anything irreversible.

**The flag, once, then out of the way:** the commit that publishes personal notes is permanent, git
history included. BACKSTAGE_PLAN §4 and §7 are unanswered — third-party names, whether the report changes
the answer. The design does not depend on which vault it points at; the swarm scales either way.

> **Amended by step 2, 2026-09-10.** That last sentence is now the one thing in this plan that step 2
> contradicted. The swarm *scales* either way, but it does not *read* either way — see finding 2. On the
> docs snapshot the page is a nice picture; at real-vault scale it is the page this document describes.

## 7. Files

| File | Change |
|---|---|
| `atlas/index.html` | rewritten — jar scene, copy, controls, reading panel, Ship's log |
| `assets/css/atlas.css` | rewritten — night palette kept, sea/sand/palms/star-sky removed |
| `assets/js/atlas-ui.js` | replaced by `atlas-jar.js` — swarm layout, morph, clustering, reading |
| `assets/js/notes-graph.js` | reused unchanged for link structure |
| `assets/data/vault-public.js` | data source (regenerated when Pierce runs the publish) |
| `assets/js/atlas-data.js` | kept on disk; the lesson notes become an optional second source |

Palette from today's `atlas.css` (`--n-top #060b1c` → `--n-horizon`, `--sky-ink`, `--n-paper`), fonts
Archivo / IBM Plex Sans / IBM Plex Mono / Kalam. Firefly hues from the six domain colors already in
`atlas-data.js` (`#5FAE5A`, `#E8A33D`, `#4CC9F0`, `#c084fc`, `#37d7c2`, `#a9bcd6`), hue-shifted per
cluster so a note's identity color survives grouping.

**As built in step 2**, the new code went to new files rather than over the old ones, so `/atlas/` keeps
working while §9's question 3 is open:

| File | State |
|---|---|
| `assets/js/vault-groups.js` | new — `PNVaultGroups.groups(notes)`, pure, seeded, 17 tests |
| `assets/js/atlas-jar.js` | new — `PNJar.mount(el, {data, cap, onOpen})`, the sealed jar |
| `assets/css/jar.css` | new — will become the rewritten `atlas.css` at swap time |
| `tools/tracker/vault-groups.test.js` | new — the D2 spec's four fixtures plus the labelling rules |
| `vault/concepts/jar/` | new scratch route, gitignored like the Observatory's comps |
| `atlas/index.html`, `atlas.css`, `atlas-ui.js` | **untouched** — the before-picture still runs |

## 8. Build order

Each step ends somewhere it's safe to stop.

| Step | What | Status |
|---|---|---|
| **1** | Recreate `/atlas/` as-is as the before-picture, from the real source files | ✅ done — the live page *is* the real source, so it was captured rather than rebuilt |
| **2** | **The jar, sealed** — geometry, glass marks, label etching, fireflies drifting, real counts. Judge at full size before anything else | ✅ **done 2026-09-10** — findings in §8a. Verdict: it holds, and it wants the real vault |
| **3** | Open + the morph — second layout, per-node paths, jar → vignette | ✅ **done 2026-09-10** — findings in §8b |
| **4** | Selection — neighbour highlighting, a card of title/folder/tags/counts, and a link out to `/vault/#<path>`. No in-page reader, no Markdown renderer | unblocked — §9 Q1 answered |
| **5** | Telescope, Find groups, the cap, the readout | the cap and readout are already built; clustering engine is done and tested |
| **6** | Ship's log as the timeline band | **blocked on data** — see finding 3 |
| **7** | Phone composition, then reduced-motion, keyboard, contrast | phone + reduced-motion + lid keyboard done in step 2; contrast pass outstanding |

## 8a. Step 2 — done 2026-09-10. What the jar decided.

Full viewport, real geometry, real type, and **13 real notes / 17 real links read straight out of
`assets/data/vault-public.js`** — plus a rehearsal switch that clones the snapshot up to 90 so the
composition could be judged at the size it will actually run at. Desktop and phone.

### Three findings about the data, and they matter more than the drawing

**1. The docs snapshot is one cluster, not several.**
`PNVaultGroups.groups()` on the 13-note snapshot returns **one** community of 10 notes plus 3 orphans —
everything links to `ROADMAP`. State 1's premise, "the jar reads as several distinct glowing masses
rather than soup", is simply false on this data. It is not a bug in the clustering; it is what the docs
folder is. The engine is honest about it and the readout prints `1 group`.

**2. At 13 fireflies this is a nice picture. At 90 it is the page §2 describes.**
The rehearsal (`vault/concepts/jar/?n=90`) resolves into **7 groups**, the hues separate, and the jar
fills with distinct masses of light. The difference is not subtle and it is not a matter of polish. This
design has a floor below which its whole idea — *clusters, as light* — has nothing to show. That makes
§9's question 2 the one that decides whether this page is worth finishing, and it argues for the real
vault rather than against it.

**3. Recency carries no signal at all in the published snapshot, and that blocks step 6.**
All 13 notes' `created` and `updated` timestamps fall within **8 milliseconds** of each other — they are
the clock of the publish run, not the notes' history. `tools/obsidian-sync.js` falls back to
`stats.mtime`, and git does not preserve mtime, so a fresh checkout of `docs/` stamps every file at
checkout time. Consequences:

- The **recency → flicker rate** encoding is inert. Rather than fake a gradient across 8ms, the component
  detects a spread under an hour and gives every firefly the same steady breathing, and the readout says
  `recency: no signal in this snapshot`.
- **Step 6, the Ship's log, cannot be built or judged on this data.** A timeline band over 8ms is a flat
  line. It is not blocked on design; it is blocked on pointing at a vault with real mtimes.
- This is *not* a bug to fix in the pipeline. Read off Pierce's disk, where Obsidian writes files as he
  edits them, mtime is real. It is another argument for §9 question 2.

**4. A folder label does not discriminate on a single-folder vault.** Rule 1 fires for every cluster in
`docs/` and names them all `docs/`. The engine implements the spec as written and additionally reports
`stats.labelsDistinct`, so step 5 can decline to draw three hulls that all say the same word rather than
silently inventing a better name.

### What the comp decided about the drawing

- **The plank had to leave the viewBox.** Drawn inside it, the jar read as an object in a box. Drawn from
  x −1400 to 1860 with `overflow:visible` on the svg, it becomes a shelf running off both edges of the
  page and the scene turns into a room. Single biggest composition win, and it cost one path.
- **The first jar was a bottle.** 266 × 522 with a 55% mouth read as the *other page's object*. A real
  regular-mouth quart jar is squatter and wider-mouthed: now 296 × 390 with a 68% mouth, and it reads
  correctly at a glance. §1's separation table is a design constraint, not just a note.
- **The glass needed a dark liner.** One bright stroke on a background of nearly the same value loses the
  silhouette. A 4.5px near-black stroke *under* the 1.9px bright one holds the edge. The Observatory's
  "two marks, not ten" still holds — the liner is part of the outline, not a third mark.
- **The lid is an SVG `<g role="button" tabindex="0">`, not an HTML overlay.** An overlaid button is wiped
  the instant `mount()` writes `innerHTML`, which is how the first version broke. Enter, Space and click
  all verified.
- **The etching is illegible on a phone** — it scales with the jar and lands around five pixels. The panel
  is hidden below 900px and the readout directly under the jar carries the same five numbers at a
  readable size.
- **The phone readout had to become its own grid child.** `order` on an element nested inside the copy
  column does nothing; copy / jar / readout are three siblings now, which is what lets the phone stack
  them in the order §2 asks for. Whole scene fits a 375 × 812 frame with the jar above the fold.

### Verified, not assumed

- **Frame budget is a non-issue at the cap.** The drift loop costs **0.091 ms/frame at 90 fireflies** —
  0.5% of the 60 fps budget. The Observatory's worry was unfounded at 13 and is still unfounded at 90.
  Compositing cost of 180 blended gradient circles is *not* measured here and stays unverified on real
  hardware.
- **Both inherited rules hold.** Position lives on `.ff`, animation on `.ff-a` (verified via computed
  style); no firefly enters the shoulder or the neck (y stays inside 262–616).
- **`prefers-reduced-motion` was exercised, not assumed** — forced through the real code path: drift
  stops, positions still place correctly rather than snapping to the origin, flicker becomes a static
  opacity, motes stop, the label still draws.
- **All eight test files pass**, including the new 17.
- **`.gitignore` swallowed a test file again.** `tools/tracker/vault-groups.test.js` matched the
  default-deny and needed its own allowlist line — the same trap as BACKSTAGE_PLAN §1, which is now the
  third time. Test files are enumerated one by one in `.gitignore`; anyone adding one must add the line.

### Still open after step 2

- Nothing has been looked at on real hardware — only this machine's browser, same caveat the Observatory
  carries.
- Contrast has not been measured against WCAG; the etched label over a moving swarm is the risky one.
- The jar's interior above the swarm is dead space at 13 notes and correctly full at 90. If §9 Q2 comes
  back "stay on `docs/`", the jar wants to be shorter.

## 8b. Step 3 — done 2026-09-10. What the morph decided.

The lid lifts, the swarm pours out through the mouth and spreads across the whole scene, the jar
demotes to a rim vignette and the shelf it stands on, and the names appear. Sealing runs it backwards.
Both directions verified at 13 and at a rehearsed 90, on desktop and on a 375 × 812 frame.

### The refactor step 3 turned out to be

**The swarm had to move into scene coordinates.** A jar drawn in its own 460 × 748 box cannot hold a
swarm whose job is to fill the viewport. The svg's viewBox is now *the scene in CSS pixels* — 1 unit =
1 px, so nothing distorts at any aspect — and the jar is a transformed group inside it. The swarm stays
in jar units, which is what lets one clip path hold the fireflies in while sealed and one transform
place the whole jar. That was most of the work in this step; the animation on top of it was small.

**The path out runs through the mouth.** The Observatory walked each node straight from A to B, and
copying that here sends every firefly through the side of the glass. Each node now travels a quadratic
Bézier whose control point sits just above the neck, so the swarm pours out of the opening and funnels
back down into it when sealing. Three numbers per node, and it is the detail that makes the metaphor
survive the transition.

### Three bugs worth writing down

- **Measuring the copy panel once was measuring it wrong.** The copy shrinks when the jar opens; the
  ResizeObserver sees the scene change and re-runs the layout; the re-run measures the panels *in their
  open geometry* and happily parks a firefly exactly where the panel is about to settle. The fix is to
  keep the **union** of every box the panels have taken at the current scene size, so it does not matter
  which state, or which frame mid-transition, the measurement lands in. This cost the most time in the
  step and it looked like three different bugs before it looked like one.
- **The nearest edge is often the wrong edge.** Pushing a firefly out of the copy panel's *left* side is
  the shorter move, and it puts the firefly off-screen — after which the bounds clamp slides it straight
  back under the panel, so it never escapes. Only edges the node can actually reach are considered now.
- **A named firefly is as wide as its name, not as wide as its dot.** Clamping the dot inside the scene
  still runs the label off the edge, and it is the orphans — pushed to the margins precisely because
  nothing links them — that carry some of the longest titles in the vault.

### Two things the scene decided

- **How many names fit is a property of the room, not a constant.** Twenty-four labels read cleanly at
  1440 × 900 and turn into overlapping mush at 375 wide. The count is set from the scene's area (floor of
  six), and the readout says `10 of 90 named — the rest need more room` rather than quietly showing a
  quarter of them. Same rule as the node cap: never a silent truncation.
- **The ghost jar earns its keep at .12 opacity.** Higher and it reads as a jar hanging in the room;
  gone entirely and you have left the metaphor. What survives OPEN is the faint shell, the two glass
  marks, the vignette and the shelf — which is §2's "rim vignette plus the base it's standing on".

### Verified, not assumed

- **Round trip is clean.** After open → seal, every firefly is back inside the glass and the clip is
  restored; after seal → open, zero labels sit behind a panel or off-screen, at 13 and at 90, on desktop
  and phone.
- **Frame budget is still a non-issue.** 0.196 ms per OPEN drift frame at 90 fireflies with the
  panel-avoidance work included — 1.2% of the 60 fps budget. Compositing remains unmeasured.
- **Reduced motion was exercised through the morph, not just at rest**: opening places the swarm
  instantly, nothing drifts afterwards, positions are correct rather than snapped to the origin, and the
  vignette and clip release still happen.
- **The phone holds the whole scene with no page scroll** at 375 × 812, in both states.

### A note for whoever verifies this next

With the browser pane hidden, `requestAnimationFrame` **and CSS transitions are frozen**. A DOM
measurement taken after a `setTimeout` therefore reports the *pre-animation* state, and a computed
`opacity` can sit mid-transition indefinitely. Screenshots pump frames. Three separate "bugs" in this
step were that artifact; the way to tell them apart is to disable the transition and re-read, or to
screenshot before measuring.

### Still open after step 3

- Real hardware, still. Everything here is one machine's browser.
- Contrast has not been measured against WCAG. The label stroke (`paint-order: stroke`, 3px of near-black
  under the text) was added for legibility over a moving swarm but has not been checked with a meter.
- The lid, once lifted, parks at the top of the scene and is the only thing in OPEN that is not either a
  note or the room. It reads fine; it has not been designed.

## 8c. Definition of done — every push, no exceptions

Decided by Pierce, 2026-09-10, after the first push of this work went to a branch and he had no way to
see any of it.

**A step of this rebuild is not done when the code works, and not done when it is pushed. It is done
when Pierce can see it on the live site in his pinned Chrome tab.** Four things, all of them, every
time:

1. Merged to **`master`** — the only branch GitHub Pages builds (`source: {branch: master, path: /}`).
   A branch push deploys nothing.
2. The `pages build and deployment` run finished green.
3. The change **confirmed on `https://piersonnorris.github.io` in the pinned Chrome tab** — looked at,
   not assumed. Deploys lag the push by a minute or so, so a check run too early lies.
4. The console clean on whichever page changed.

**This check runs on every single push, not once at the end of a phase.** The two things it catches are
both already in this project's history: a branch that never reaches `master` (which is what happened on
the first push of steps 1–3), and a green Pages build serving a 404 because `.gitignore` silently ate
the file — `BACKSTAGE_PLAN.md` §1, six pages pointing at a live 404 for a week. This rebuild is
especially exposed to the second one, because `.gitignore` here denies by default and every new file
needs an allowlist line; `vault-groups.test.js` already needed one.

Worth stating plainly so nobody expects otherwise: **pinning the tab is Pierce's action, not something
the tooling can do.** Browser tab-strip state is outside what page automation can reach. What gets
verified automatically is that the URL is live, correct and clean; the pinned tab is where he sees it.

Also standing rule 8 in `docs/ROADMAP.md` §4, which is where it applies to the whole site rather than
just this rebuild.

## 9. Open — need Pierce's call

1. ~~**Reading surface.**~~ **Answered 2026-09-10: reading lives off-page at `/vault/`.** The jar
   highlights, names and links out; it does not render note bodies. §2 state 3 and §8 step 4 revised.
2. ~~**Which vault, and when.**~~ **Answered 2026-09-10: run `--report` first, and decide with the report
   in hand.** Which is also what BACKSTAGE_PLAN §4 already required before a first publish. Steps 3–5
   continue against the `docs/` snapshot meanwhile; step 6 waits on real mtimes (finding 3).

   ```
   node tools/obsidian-sync.js --vault "<path to the Obsidian vault>" --report
   ```

   Read it top to bottom. The three things to look for, given step 2's findings: **how many notes**
   (finding 2 — under ~40 and the clusters idea has nothing to show), **how many folders** (finding 1 and
   4 — a single-folder vault clusters into one blob and labels everything the same), and **whether the
   dates look real** (finding 3 — if they are all within seconds of each other, mtime was lost and the
   Ship's log stays blocked wherever we point this).
3. ~~**The old page.**~~ **Answered 2026-09-10: the night sky stays, and this rebuild is parked.** Pierce asked for the fireflies to fly from the jars to the stars — an enhancement to the live R20 page — and was shown the fork explicitly: build it there, or push this rebuild forward instead. He chose the night sky. ROADMAP **R23** is that work.

   This is a park, not a deletion. Steps 1–3 are real, tested code (`vault-groups.js` with 17 tests, `atlas-jar.js`, `jar.css`) and the scene is still judgeable at `vault/concepts/jar/`. **Nothing here is wasted if it is picked back up** — and §8b's central finding is what made R23 work at all: a jar drawn in its own box cannot hold a swarm whose job is to cross the page. `atlas-flight.js` is that lesson applied to the page that shipped.

   Before restarting this, re-read §8a finding 2: at the `docs/` snapshot it is one cluster plus three orphans, and it wants the real vault (BACKSTAGE_PLAN P4) before it can be judged fairly.
4. ~~**Nav.**~~ **Moot while Q3 is parked** — the page is still the night sky, so the label is still "Atlas". Reopen with this rebuild.
