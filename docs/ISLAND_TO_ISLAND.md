# ISLAND TO ISLAND — the work, laid out as a chart

**Status: direction picked 2026-09-08, not built.** ROADMAP **R19**.
Live preview (local only): `vault/concepts/index.html`, direction 06.
Sibling: `docs/BOTTLE_SHOWCASE.md` (R18) — same ocean, different job.

---

## 0. What this is

Pierce, 2026-09-08, picking direction 01 for the bottle and then: *"lets add as the md 2 for the layout of my
work ive done island to island with a visual."*

So direction 02's cartography stops competing with 01 and gets pointed at something else entirely: **the work
history, as a voyage.** Every chapter is an island. The route between them is the thing that carried over.

It is not a second timeline. The Experience page already has one, and a timeline can only ever show **order**.
A chart shows **relation** — what fed what — and that is the actual story: door-to-door at Oasis became a crew,
a crew became a documented company, the documented company became the method that worked inside somebody
else's business.

---

## 1. The islands

Chapters and dates come from `docs/CONTENT.md` §3 verbatim. Nothing here is new copy; it is existing copy
**placed**. Each island's inscription is that chapter's own *Takeaway:* line where one exists.

| # | Island | When | Inscription (from CONTENT.md §3) |
|---|---|---|---|
| 1 | **Self-directed portfolio** | 2020 — ongoing | The longest-running thing on the chart, and the only one still underway from the start |
| 2 | **Oasis Exterior Cleaning** | May 2023 | *Sold a service door to door and ran a crew before most people pick a major* |
| 3 | **Elon University** | Aug 2023 — | Finance & Accounting dual major; Entrepreneurship and Mandarin minors |
| 4 | **True North Services LLC** | Apr 2026 — | *From hustle to institution — docs, training, and structure that run without you in the room* |
| 5 | **Screencastify** | Jun 9 – Aug 7, 2026 | *The method is the résumé line — find the problem in someone's actual Tuesday, get sign-off, build it with them, ship it* |
| 6 | **This site** | 2026 — | The tracker, the vault, the atlas — built in the open |
| 7 | **Elon AI & Emerging Tech Club** | 2026, incoming | **Drawn as an outline, not a landfall** — charted, not yet reached |

**Deliberately not on the chart:** Student Maintenance LLC. `CONTENT.md` §3 marks it `[OPEN: include on the
public site at all?]`, and an open question does not get an island. The water stays empty rather than filled
with a guess — which is the same rule the atlas follows.

**Oasis → True North** is drawn as **two islands with a lane between them**, not one landmass. §3 flags whether
that is a rebrand or two chapters as an open question; two islands is the reading that is true either way.

---

## 2. The lanes are the argument

This is the part that earns the whole layout. Each lane carries a label — what transferred, not merely what
came next:

| Leg | What carried over |
|---|---|
| Portfolio → Oasis | Money is a system, not a windfall |
| Oasis → Elon | Crew and door-to-door |
| Elon → True North | Hustle → institution |
| True North → Screencastify | The documented system |
| Screencastify → This site | The workflow method, turned on my own work |
| This site → *(ahead)* | — dashed; not sailed yet |

A résumé bullet list physically cannot say any of that. A chart can say it in one glance, and it is all
defensible from §3.

---

## 2a. R19 is the home page's data layer — decided 2026-09-08

Pierce, 2026-09-08: *"add to the note that R19 will be started as the data for the home page when its updates."*

This is a scope change and a good one. R18 phase A showed the Observatory owns the first screen but has no
answer for what sits below it — the six console tiles have nowhere to go in the new composition.

**R19's data file becomes that answer.** `assets/js/voyage-data.js` is not only the Experience chart's source;
it is **what the home page reads for everything below the fold**. The work section stops being six
hand-maintained tiles and becomes the voyage, rendered compactly.

- **One source, two surfaces.** Experience gets the full chart, the home page gets the strip, both read the
  same file. Add a chapter once — the same rule `atlas-data.js` already follows.
- **Sequencing: the data lands *inside* the home-page pass**, not after it. `voyage-data.js` must exist by
  R18 **phase E**, because phase E is what replaces the tiles. The chart *rendering* on Experience can follow
  later; the data cannot.
- **Which promotes a blocker.** The lane labels below need Pierce's own words, and they are now on R18's
  critical path rather than a nice-to-have afterwards.

## 3. Where it goes

**Primary: the Experience page**, replacing the top of it — the chart first, the existing year-by-year detail
below it, unchanged. Clicking an island scrolls to that chapter, so the chart is a map *of* the page rather
than a substitute for it.

**Secondary: a compact strip on the home page** — the route only, no labels, six islands wide, that links
through. That is the piece that makes it part of R18's home-page pass rather than a separate errand.

Open question for Pierce: does the chart **replace** the vertical timeline on Experience, or sit above it?
Recommendation is *above it* — recruiters scan, and the timeline is the scannable thing.

---

## 4. Build notes

- **Placement comes from dates, not taste.** Longitude is time; latitude is free for layout, but the x-order
  must be derived. If an island is placed by eye, this is a drawing, not a chart, and it will drift out of
  date the first time a chapter is added.
- **One data file**, `assets/js/voyage-data.js`, same shape and same rule as `atlas-data.js`: every field traces
  to `CONTENT.md`, and when that changes, this changes. Islands, dates, inscriptions and lane labels all live
  there — no copy in the markup.
- **Island shapes are generated, not drawn**, from a seeded blob so they're stable between loads but not
  hand-placed. Size maps to duration.
- **Accessibility is the real risk.** Serif on parchment has to clear 4.5:1 (U1 was fought over exactly this),
  every island needs a real focusable control, and the whole thing must degrade to the existing ordered list
  under ~760px. **The chart is an enhancement; the list is the content.**
- **Reuse:** the parchment treatment, compass rose and lane styling are shared with R18's ocean language, so
  Home → Experience reads as one world rather than two themes bolted together.

---

## 5. Open

1. **Above the timeline, or instead of it?** (recommendation: above)
2. **Is the home-page strip in scope for R18's pass**, or a follow-up?
3. **Lane labels** — the six above are drafted from §3. They are claims about your own career, so they need
   your words, not mine, before they ship.
