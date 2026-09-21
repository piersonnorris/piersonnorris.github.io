# Home page — images and events plan

Rule for this plan: **KISS.** Plain HTML `<img>` and `<figure>`, a little CSS, no JavaScript, no carousel, no lightbox, no image library. Each step ships on its own and can stop there.

Copy (captions, dates, event names) comes from [[CONTENT — piersonnorris.com]]. Nothing here invents it.

## Examples worth borrowing from

| Site | What to take |
|---|---|
| [brittanychiang.com](https://brittanychiang.com) | Experience as a dated list; small thumbnail next to each project. Images support the text, never replace it. |
| [leerob.com](https://leerob.com) | Almost all text, with **one** meaningful image. Proof that one good picture is enough. |
| [sive.rs/now](https://sive.rs/now) | A dated "what I'm doing now" page — the simplest possible events format. |
| [patrickcollison.com](https://patrickcollison.com) | Ruthless minimalism: plain lists, fast load, nothing decorative. |

## Step 1 — one headshot in the hero

- One photo of Pierce, placed in the hero next to (or at the top of) the "Currently" card.
- File: `assets/img/home/headshot.webp`, about 800px wide, under 150 KB.
- Markup: `<img src="…" alt="Pierson Norris" width="…" height="…">` — width/height stop the page jumping while it loads.

## Step 2 — events as a photo row

Turn the "What's moved lately" feed into 3–4 photo cards, newest first. Each card is a `<figure>`: photo, date, one-line caption.

Candidates (already in the feed, so the copy exists):
1. True North first all-hands (Jul 17)
2. Screencastify internship / Castify OS (Jun–Jul)
3. Elon AI & Emerging Tech Club (2026)

Layout: a CSS grid, 3 across on desktop, 1 across on phones. Images below the hero get `loading="lazy"`.

To add a new event later: copy one `<figure>` block, swap the photo and caption. That is the whole workflow.

## Step 3 (optional) — thumbnails on the two tiles

A small image on the True North and Screencastify tiles, like Brittany Chiang's project list. Only if Steps 1–2 feel right.

## Image rules

- WebP (or JPG), max 1600px wide, under 300 KB each. All files live in `assets/img/home/`.
- Every image has real `alt` text.
- Strip location data (EXIF/GPS) before committing.
- No client names, client homes, addresses, or license plates in frame. Anyone else in a photo has agreed to be on the site. (See [[Privacy and Publishing Boundaries]].)

## What Pierce provides

- [ ] One headshot
- [ ] 3–4 event photos
- [ ] A one-line caption + date for each (or confirm the feed wording above)
