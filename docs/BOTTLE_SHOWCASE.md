# SHIP IN A BOTTLE — the Obsidian showcase

**Status: five directions drafted 2026-09-08, awaiting Pierce's pick.** ROADMAP **R18**.
Live previews (local only, not committed): `vault/concepts/index.html`.

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

## 3. Recommendation

**01, The Bottle Observatory.** It is the only one where the bottle stays the subject the whole way through,
which is what was actually asked for. The graph is already built and already impressive; putting it inside
glass is the shortest distance between what exists and *"how is that a website"*.

**05** is the hedge — it could be live tonight, and it is the only one whose failure mode is "fine" rather than
"broken". **04** is the pick if the goal is specifically that nobody has seen it before.

Whichever wins, three things carry over unchanged: real link structure from `PNGraphify`, the `PNBottle`
entrance, and `prefers-reduced-motion` honoured throughout — every one of these directions is built out of
motion, and all five have to survive it being switched off.

---

## 4. Open

- **Which direction.** Pierce's call; nothing gets built until he picks one.
- **Where it lives.** A new `/bottle/`, or does it replace `/vault/`'s Reader as its front door? `/vault/` is
  the useful reading surface and this is the showcase — they may want to be two pages, one linking to the other.
- **What it shows.** Right now `vault-public.js` is the site's own `docs/` folder. A showcase of "how I use
  Obsidian" is more convincing over the *personal* vault, which is R17's parked P4 — same four questions.
