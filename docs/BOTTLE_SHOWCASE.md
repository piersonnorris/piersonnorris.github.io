# SHIP IN A BOTTLE — the Obsidian showcase

**Status: direction 01 picked 2026-09-08. Scope raised to a full home-page UI update. Nothing built yet —
phase A is a refine pass, on purpose.** ROADMAP **R18**.
Live previews (local only, not committed): `vault/concepts/index.html`.
Companion: `docs/ISLAND_TO_ISLAND.md` (R19) — direction 02's chart, pointed at the work history instead.

> **Pierce, 2026-09-08:** *"i like 1 … before this starts add in to refine the visual and build it out because
> this is a whole home page ui update."*
>
> Two things follow from that sentence and they change the shape of this doc. **The Bottle Observatory is not a
> sub-page** — it is the home page's new front. And **the first phase is refinement, not construction**: the
> preview in `vault/concepts/` is a one-fifth-scale sketch, and sketching is not designing. Building straight
> from it would bake in proportions nobody has looked at full-size.

---

## 0. What this is for, stated plainly

Pierce, 2026-09-08: *"the end goal is to have an amazing in-a-bottle Obsidian visual that looks impressive …
it also should open in one click and have no gate … the goal of this is to have a crazy looking UI to showcase
the use of Obsidian, no other purposes."*

So the brief is narrower than everything else on this site, and that is a feature:

- **The only job is to look extraordinary** while showing real notes and real `[[links]]`. Not to inform, not
  to convert, not to be a second `/notes/`.
- **One click from the bottle. No gate.** Pierce's reasoning: only he links to it, and it can be gated at any
  time later. That is a decision about *his own* published notes, and it is reversible in one commit — unlike
  what gets committed, which is not.
- **Nothing to do with stocks.** See §1.

The one thing that must stay true underneath: **the structure has to be real.** A drawn constellation that
isn't the actual link graph is a screensaver, and it would undercut the exact thing being showcased.

---

## 1. Separation from the stock page — done 2026-09-08

Obsidian and the portfolio touched in two places. Only one was a real coupling:

| Where | What it was | Now |
|---|---|---|
| `assets/js/bottle.js` porthole | Two buttons: *Open the vault* → `/notes/`, and ***Stock desk* → `/tools/tracker/#stocknotes`** | ✅ Stock link removed. Buttons are now `/vault/` (primary) and `/notes/`. The bottle is the Obsidian door and nothing else's. |
| Tracker's **Obsidian tab** | The *stock notes* vault — per-ticker notes — lives inside the tracker | Left alone, deliberately. Those notes are about holdings; they belong next to the holdings. It is a different vault, not this one. |

The rule going forward: **the showcase never links to the tracker, and the tracker never links to the
showcase.** They share the `PNVault` engine and `PNGraphify`; they share no surface and no navigation.

---

## 2. The five directions

All five share the same spine — the existing `PNBottle` entrance, the published `vault-public.js` snapshot,
and `PNGraphify` for real link structure. They differ in what the vault *is* once you are inside.

### 01 · The Bottle Observatory — *most on-theme*

The bottle is the page. Full-viewport ocean, one enormous bottle, and the vault living **inside the glass** as
a drifting constellation: every dot a note, every line a real `[[wikilink]]`, the ship tacking between them.

Pop the cork and the camera flies **through** the glass — the bottle doesn't disappear, it becomes the vignette
at the edge of the screen, so you are permanently inside it. Notes unfurl as message-in-a-bottle scrolls.
Graph view is the default state, not a tab; reading a note dims the constellation and keeps its neighbours lit.
Unresolved links drift past as corked empty bottles.

- **Sells it:** glass that behaves like glass (specular sweep, refraction offset near the curve, caustics on the
  sea floor); one continuous camera with no page transition ever; zoom *is* the navigation.
- **Hard:** the through-the-glass zoom must hold 60fps or the trick dies. Text legibility inside a curved,
  tinted, moving container.
- **Cost:** high. Reuses `PNBottle` and `PNGraphify` almost entirely.

### 02 · The Cartographer's Table — *most legible*

Top-down onto a desk. The vault is an ocean chart: every note an **island**, every folder an **archipelago**,
every `[[wikilink]]` an inked shipping lane. The bottle lies on the chart as the launcher; it rolls, uncorks,
and the chart unrolls out of it across the screen. Reading a note unfurls a scroll *over* the map.

- **Sells it:** texture — real paper grain, plate-mark edges, ink bleed, brass instruments. The metaphor is
  load-bearing: orphan islands have no lane to them, and unresolved links are the edge of the known world,
  *hic sunt dracones*, drawn in. Zoom out far enough and the chart simply *is* the graph.
- **Hard:** island shapes must be generated *from* the data or it's a picture, not a map. Serif-on-parchment has
  to stay WCAG-legible — U1 was fought over exactly this.
- **Cost:** high. The most new art, the least new engine work.

### 03 · The Descent — *most cinematic*

You throw the bottle in and follow it down. A single continuous descent: light fades, pressure marks tick past,
notes hang in the dark as bioluminescent life joined by glowing filaments. Scrolling is diving; there is no
second page. **Depth is time** — recently-edited notes float near the surface, the oldest sit on the sea floor,
so the Timeline stops being a list and becomes the act of descending.

- **Sells it:** godrays, marine snow and parallax — three cheap effects that together read as expensive. Scroll-as-dive
  is genuinely novel *and* honest. Kinship with the tracker's underwater skin without sharing a page with it.
- **Hard:** scroll-hijacking is the fastest way to make a page feel broken; needs a real escape hatch. Deep means
  dark, which is a contrast fight for body text.
- **Cost:** medium-high. Highest risk of "impressive once, annoying twice".

### 04 · The Orrery in Glass — *most unusual*

The bottle holds a working orrery. Each of the six domains is a **sun**; every note is a body orbiting the
domain it belongs to. `[[Wikilinks]]` are resonance lines drawn between bodies that shouldn't otherwise touch,
so a cross-domain link is visibly, structurally strange. The cork lifts and the armillary rings expand out of
the bottle's neck to fill the screen, still turning. Clicking a body slows the machine and swings it into an
astrolabe panel. **Orbital period maps to recency** — a stale note visibly crawls.

- **Sells it:** nobody has seen a vault look like this. Brass and starfield is a palette the site has never used,
  so it is instantly its own place. Motion carries meaning rather than decorating.
- **Hard:** real 3D-ish maths in CSS/SVG with no library — the hardest build of the five. Constant motion behind
  text is a reading and accessibility problem and needs a decisive pause.
- **Cost:** highest. Furthest from anything already built.

### 05 · Vault OS — *cheapest, ships fastest*

The anti-skeuomorphic one. The bottle shatters into a phosphor terminal that **boots the vault in front of
you** — mounting the snapshot, resolving links, reporting counts, all real numbers from `vault-public.js`. The
boot log is the loading screen and it takes about a second because it is genuinely doing that work. Then the
ASCII graph **morphs** into the real SVG `PNGraphify` graph, box-drawing characters sliding into nodes. That
single transition is the whole trick.

- **Sells it:** it's fast — text, glow, scanlines, no heavy art, and it looks intentional on any screen.
  Keyboard-first matches how a vault is actually used, and `⌘K` already exists. Reuses `/vault/` wholesale.
- **Hard:** the ASCII→SVG morph is the only genuinely novel piece; cut it and this becomes ordinary. Terminal
  aesthetics are common, so the ship has to keep it personal.
- **Cost:** low-medium. Could ship in one session.

---

## 2a-0. Phase A — done 2026-09-08. What the comp decided.

Comp: `vault/concepts/observatory/index.html` (local only). Full viewport, real bottle geometry, real type
sizes, and **13 real notes / 16 real links read straight out of `assets/data/vault-public.js`** — not
placeholder dots. Three states and two depths, switchable; desktop and phone.

Everything below was decided by looking at it at full size. Half of it contradicts what the plan assumed,
which is exactly what phase A was for.

### Two findings that change the build

**1. "Inside" is not a zoom of "sealed". It is a second composition.**
The plan said "the camera flies through the glass" and I built that first: push the viewBox in until you are
past the surface. At full size it fails badly — the nodes inflate to beach balls and four notes of thirteen
are left on screen. **The vault disappears at the exact moment you arrive in it.**

The fix is that inside has its own layout: the same notes re-laid across the whole viewport at readable
scale, labelled, with the glass demoted to a rim vignette and two curvature arcs. That reads correctly and it
is the better picture.

But it means **phase C is not a camera push — it is a morph between two layouts**, every node travelling its
own path from its place in the bottle to its place in the room. That is materially more work than the plan
assumed, and finding it now cost nothing.

**2. The desktop composition does not survive portrait.**
On a 390 × 844 frame the copy, the bottle and the Currently card all want the middle third and land on top of
each other. Phone is therefore a **third composition, not a reflow**: the scene stops filling the frame and
becomes a horizontal band, copy above it, card below, status pinned. It works, and it is still the weakest of
the three states. The stronger answer — standing the bottle upright on its base for portrait — is a different
drawing, and it belongs in phase B.

### Answered, and now settled

- **The name sits outside the glass.** The first comp let the copy column run to 42vw and the bottle went
  straight through a 72px `<h1>`. The copy column is now hard-capped at `min(40ch, 36vw)` and the glass starts
  after it. Non-negotiable in the build.
- **The bottle lies on its side, base left, cork right.** The first geometry drew a vertical neck on a
  horizontal body — a hybrid that read as a submarine. Cork on the right also points the "pull me" affordance
  *away* from the headline instead of into it.
- **The Currently card survives, bottom-right, over the glass.** Phase E's open question, answered: it is the
  one block a recruiter needs in five seconds, and at `backdrop-filter: blur(8px)` it reads as floating in
  front of the bottle rather than fighting it.
- **Depth, not light/dark.** `site.css` has *zero* `prefers-color-scheme` rules — the site is dark-only, so
  "both themes" was the wrong axis in the plan. The two variants that mean something are **Deep** and
  **Dusk**: same composition, different water. Corrected here.
- **Nodes never enter the shoulder or the neck**, where the clip slices them and the curvature is tightest.
  Layout is a seeded, deterministic scatter inside the body only — a comp that reshuffles on reload cannot be
  judged, and neither can a home page that does.
- **Two marks make it read as glass**, not ten: one specular sweep across the shoulder and one rim light on
  the base curve. Everything else was noise.

### Still open after phase A

- **The console tiles** (Asset tracker, Obsidian notes, What's moved lately, True North, Screencastify) have
  nowhere to go in this composition yet. That is now R19's job — see §2a-1.
- **The `Obsidian — stock desk` tile on today's home page** violates the separation rule the moment the home
  page *becomes* the showcase. It has to move to the tracker or go. Flagged, not yet decided.
- **Node count.** Thirteen is comfortable; a few hundred silts the glass up completely. Phase D needs a cap
  plus a largest-connected-component view before the personal vault (R17 P4) is ever pointed at this.

**Verdict: 01 holds up at full size.** The fallback to Vault OS is not needed. Proceed to phase B — with C
re-scoped from "camera" to "layout morph".

## 2a-1. R19 is the data layer for the rest of the page

Pierce, 2026-09-08: *"add to the note that R19 will be started as the data for the home page when its updates."*

Recorded, and it resolves the biggest thing phase A left open. The Observatory owns the first screen; it does
not own the whole page, and the console tiles below it currently have no home in the new composition.

**R19 becomes that content.** `voyage-data.js` — the islands, dates, inscriptions and lane labels traced to
`CONTENT.md` §3 — is not just the Experience chart's data file; it is **the data layer the home page reads for
everything below the fold**. The work section stops being six hand-written tiles and becomes the voyage,
rendered compactly.

What that buys:

- **One source, two surfaces.** Experience gets the full chart, the home page gets the strip, and both read
  the same file — the same rule `atlas-data.js` already follows, so a chapter is added once.
- **Phase F stops being cosmetic.** It was "fold in the strip"; it is now "the home page's content layer lands".
- **Sequencing:** R19's data file is built **when the home page is updated**, i.e. inside this pass, not after
  it. The chart *rendering* can still follow on Experience, but the data has to exist by phase E, because
  phase E is what replaces the tiles.

Consequence for the phase table: **E now depends on R19's `voyage-data.js`**, and R19's lane labels — which
need Pierce's own words — become a blocker for phase E rather than a nice-to-have afterwards.

## 2a. The build, now that 01 is picked

Scope is **the home page**, not a new URL: the Observatory becomes what you land on at `/`. That raises the
stakes — this is the first thing a recruiter sees, so "looks impossible" and "loads fast, reads clearly, works
on a phone" have to both be true. The phases are cut so the expensive, irreversible-feeling decisions happen
while everything is still cheap to throw away.

| Phase | What | Status / why it's cut here |
|---|---|---|
| **A — Refine the visual** | Direction 01 taken from a one-fifth-scale sketch to a **full-size, full-viewport comp**: real geometry, real node count from `vault-public.js`, real type, three states, two depths, desktop and phone. | ✅ **done 2026-09-08** — findings in §2a-0. Verdict: 01 holds up; proceed. |
| **B — The glass** | The bottle as a real component at the geometry A settled: base-left/cork-right silhouette, one specular sweep, one rim light, body-only node region. Static, no motion. **Plus the upright-bottle portrait treatment** A deferred. | Next. The glass is the whole illusion — if it doesn't convince standing still, motion won't rescue it. |
| **C — The layout morph** *(was "the camera")* | **Re-scoped by A.** Not a viewBox push: a morph between the sealed layout and the inside layout, every node travelling its own path, glass resolving into a rim vignette. 60fps or it doesn't ship; `prefers-reduced-motion` gets a straight cut. | Highest-risk piece, and now a bigger one than the plan assumed. Isolated so it can be cut without losing A and B. |
| **D — The constellation** | `PNGraphify` re-skinned as the star-field: real notes, real `[[wikilinks]]`, neighbourhood highlight on read, unresolved links as corked empty bottles. Node cap + largest-connected-component view. | The structure must be real. This is the phase that keeps it honest — and the cap is what stops R17's P4 from silting the glass up. |
| **E — The home page around it** | The nav, the footer, the contact route, and **the console tiles replaced by R19's voyage data** (§2a-1). | Most likely to be underestimated. A gorgeous page that buries the contact details is a worse home page. **Blocked on R19's lane labels.** |
| **F — Ship it** | Swap `/` over, keep the old hero on a fallback route until it has been looked at on real hardware. | Was "fold in R19"; R19 moved into E, so F is the cutover. |

**Ends of the line, stated now:** if phase C can't hold frame rate on a mid-range laptop, the fallback is a
cross-fade between the two layouts rather than a per-node morph, and the page is still good. Phase A already
cleared its own bar — 01 held up full-size, so the re-pick branch is closed and **05 Vault OS is no longer on
the table**.

**What is not in scope:** changing what `/vault/` does (it stays the useful reading surface, and the Observatory
links to it), touching the tracker, or publishing the personal vault (still R17's parked P4).

## 3. The pick — 01, and what the others are still for

**01, The Bottle Observatory — chosen 2026-09-08.** It was the recommendation and it is the pick: the only one
where the bottle stays the subject the whole way through, and the graph it needs is already built.

The other four are not discarded, they are shelved with a purpose:

- **02** is now **R19**, doing a different job entirely — see `docs/ISLAND_TO_ISLAND.md`.
- **05, Vault OS** is the **fallback**. If phase A says 01 doesn't hold up full-size, this is what ships instead;
  it is the only direction whose failure mode is "fine" rather than "broken".
- **03** and **04** stay on the shelf. 04 in particular is worth revisiting if the site ever wants a second
  showpiece, because nothing about it overlaps with 01.

Three things hold regardless: real link structure from `PNGraphify`, the `PNBottle` entrance, and
`prefers-reduced-motion` honoured throughout — this is built out of motion, and it has to survive that being
switched off.

---

## 4. Open

- ~~Which direction.~~ **Answered 2026-09-08: 01.**
- ~~Where it lives.~~ **Answered: the home page itself**, not a new URL. `/vault/` stays the reading surface and
  the Observatory links to it.
- **What it shows.** Right now `vault-public.js` is the site's own `docs/` folder. A showcase of "how I use
  Obsidian" is more convincing over the *personal* vault, which is R17's parked P4 — same four questions. Worth
  deciding before phase D, since the node count changes the composition.
- **How much of today's home page survives** (phase E). Needs Pierce's call on what must stay plainly readable
  outside the metaphor — at minimum the contact route, probably the Currently card.
- **Does the R19 strip land in this pass** (phase F) or immediately after?
