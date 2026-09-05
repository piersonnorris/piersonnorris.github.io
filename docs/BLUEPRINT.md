# BLUEPRINT — piersonnorris.com

Master build spec. Prepared by Claude (Cowork), 2026-08-23, from decisions made directly with Pierson. ChatGPT: read this fully before writing code. `docs/CONTENT.md` holds all copy; `docs/ASSET_TRACKER_SPEC.md` holds the dashboard feature.

Anything tagged `[OPEN]` is an unmade decision — ask Pierson, don't guess.

---

## 1. Mission

A personal site that answers "who is Pierson Norris?" for two audiences at once:

1. **Humans** — recruiters, companies, collaborators. Clean, dark, fast, credible.
2. **Machines** — AI crawlers and agents (GPTBot, ClaudeBot, PerplexityBot, Google) that increasingly answer "who is X?" on people's behalf. The site is deliberately structured so machines parse it accurately: semantic HTML, JSON-LD, llms.txt, explicit crawler permissions.

Secondary mission: a **Tools hub** for things Pierson builds for himself, starting with a gated live portfolio dashboard. The site should read as proof-of-work, not just a resume.

## 2. Locked decisions

| Decision | Value |
|---|---|
| Stack | Plain HTML/CSS/JS. No framework, no build step, no npm for the site itself. |
| Hosting | GitHub Pages, repo `YOURUSERNAME.github.io`, branch `main`, root. `.nojekyll` present. |
| Domain | `YOURUSERNAME.github.io` now; `piersonnorris.com` attached later (build all URLs relative; put absolute URLs only in the crawl kit files, and update them at domain switch — see §7). |
| Brand | Dark + sleek. Dark ground; the eye goes to what's bright. Full system in §4. |
| Blog | Not in v1. No placeholder page. Structure must make adding one later trivial. |
| Asset tracker | Password-gated only. Real numbers never in the repo or the public build. See `ASSET_TRACKER_SPEC.md`. |
| Analytics | Privacy-friendly, no cookie banner (GoatCounter or Plausible). `[OPEN]` which one — build without it; it's one script tag added later. |

## 3. Audiences drive structure

Every page carries its content in semantic HTML (`<main>`, `<article>`, `<section>`, `<h1>`–`<h3>` in strict order, `<time datetime>`, `<address>`, `<nav aria-label>`). No div-soup, no text baked into images, no content that only exists after JS runs (JS may *enhance*, never *carry*, the core content — the tracker page is the one exception and it's gated anyway).

## 4. Design system

Committed single-theme dark design (this is the brand, not a dark mode).

### Color tokens

```css
:root{
  --bg:#0e1116;        /* page ground — graphite, cool near-black */
  --panel:#151b23;     /* raised cards */
  --panel2:#1a222d;    /* hover / second raise */
  --line:#232d39;      /* hairline borders */
  --line2:#2e3947;     /* stronger borders */
  --ink:#e9edf3;       /* primary text */
  --mut:#8b95a5;       /* secondary text */
  --dim:#5c6675;       /* metadata */
  --acc:#ffb224;       /* THE bright accent — Terminal Amber [OPEN: Pierson may switch to #4CC9F0 ice cyan or #B6F09C volt; only this token changes] */
  --acc-soft:rgba(255,178,36,.12);
  --good:#45c26b;      /* success/positive only, never decorative */
}
```

Rules: one accent, spent sparingly (links, active nav, key numbers, hover states, timeline nodes). Never large filled amber areas. Body background always `var(--bg)` explicitly. Selection color: accent bg, dark text.

### Typography

Google Fonts: `Archivo` (700/800) for display, `IBM Plex Sans` (400/450/500/600) for body, `IBM Plex Mono` (400/500) for dates, labels, chips, and data.

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=IBM+Plex+Sans:wght@400;450;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
```

Scale: mono meta 11–12px w/ letter-spacing +0.1em uppercase · body 15.5px/1.62 · h3 17–18px · h2 24px · h1 clamp(34px, 6vw, 54px), Archivo 800, letter-spacing −0.02em. Running text max ~65ch. Tabular numerals (`font-variant-numeric: tabular-nums`) anywhere digits align.

### Layout

Max-width 880px centered column, 24px side padding, generous vertical rhythm (sections ~64px apart). Cards: `--panel` bg, 1px `--line` border, 6px radius. Mobile-first; single breakpoint at 640px is usually enough. No horizontal page scroll ever — wide content gets its own `overflow-x:auto` container.

### Voice

Confident, terse, concrete. Numbers over adjectives ("50+ clients, five-figure first summer" beats "successful business"). No corporate filler, no exclamation marks.

## 5. Site architecture

```
/                       index.html          Home
/about/                 index.html          About
/experience/            index.html          Experience (the 2023–2027 timeline)
/projects/              index.html          Projects
/tools/                 index.html          Tools hub
/tools/tracker/         index.html          Asset tracker (encrypted artifact — see spec)
/contact/               index.html          Contact
/assets/                css/site.css, js/site.js, img/…, resume/pierson-norris-resume.pdf
robots.txt  llms.txt  sitemap.xml  404.html  .nojekyll
```

Folder-per-page (`/about/` not `about.html`) so URLs stay clean and extension-free on Pages. One shared stylesheet; per-page CSS only if genuinely needed. Nav identical on every page, current page marked with `aria-current="page"` + accent underline. Footer on every page: name, email, LinkedIn `[OPEN: more socials TBD]`, "Built by hand — plain HTML, no framework" (that line is on-brand).

`404.html` at root (GitHub Pages picks it up automatically): dark, terse, links home.

## 6. Page specs (copy lives in CONTENT.md)

**Home** — The elevator pitch page. H1 name, one-line identity, the 2–3 sentence pitch (this is what AI snippets will lift — it must stand alone), then three compact proof cards (True North · Screencastify · Tools) each linking deeper, then a quiet contact line. No giant hero animation; confidence through restraint.

**About** — The fuller story in first person, ~250–350 words, from CONTENT.md §2. Optional photo `[OPEN]`. Ends with what he's looking toward (the 2027 line, once Pierson supplies it).

**Experience** — The timeline, 2023 → 2027, rendered as a vertical rail with year markers (mirror the Build HQ page's structure: year label column, entries as cards, amber nodes). Include the "before Elon" prologue as a muted intro block `[OPEN: Pierson may cut it]`. Each entry: role/title, mono date range, 1–3 sentence body with bolded numbers, optional takeaway line with accent left-border. Resume PDF download button at top right of the page `[OPEN: PDF to be produced — build the button pointing at /assets/resume/pierson-norris-resume.pdf and it will drop in]`. Skills grid at the bottom (structured `<ul>`, one `<li>` per skill group — prime crawler content).

**Projects** — Card grid (1-col mobile / 2-col desktop): True North digital infrastructure, the Asset Tracking system, Screencastify internship tooling (the story is the project), this website itself. Each card: title, mono period, 2-sentence description, outcome numbers where they exist, link (live site, or the Tools page, or Experience anchor).

**Tools** — The hub. Intro sentence ("Things I build for myself; some are public, some are locked"), then a card per tool. v1 has one: **Portfolio Tracker** — description of what it does + a screenshot with SAMPLE data + a "locked" chip + link to /tools/tracker/. Layout must make a second tool card a copy-paste job.

**Contact** — Email (mailto), LinkedIn, GitHub profile `[OPEN: other socials TBD]`. No contact form in v1 (forms need a backend or third party; a mailto link is honest and zero-maintenance). Mono-styled links, one per line, `<address>` element.

## 7. AI-crawlability kit

Starters for `robots.txt` and `llms.txt` are already in the repo root — extend, don't replace. At custom-domain switch, update absolute URLs in: JSON-LD (`url`), `sitemap.xml`, `llms.txt`, OG tags, and add the `CNAME` file.

**JSON-LD** — On Home and About, in `<head>`:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Pierson Norris",
  "alternateName": "Pierce Norris",
  "url": "https://YOURUSERNAME.github.io/",
  "email": "mailto:norrispierce506@gmail.com",
  "jobTitle": "Founder & Owner, True North Services LLC",
  "affiliation": [
    {"@type": "Organization", "name": "True North Services LLC"},
    {"@type": "CollegeOrUniversity", "name": "Elon University"}
  ],
  "description": "<the Home elevator pitch, verbatim>",
  "knowsLanguage": ["English", "Chinese (Mandarin, near-fluent)"],
  "knowsAbout": ["Small business operations", "Sales and local marketing", "Finance and markets", "AI workflow automation", "Web tools"],
  "sameAs": ["<LinkedIn URL>", "<GitHub URL>"]
}
</script>
```

Validate with Google's Rich Results Test before calling M3 done.

**Per-page `<head>`** — unique `<title>` ("Page — Pierson Norris") and meta description; OG + Twitter card tags (og:title, og:description, og:type=profile on Home, og:image once a share image exists `[OPEN]`); `<link rel="canonical">`; `<html lang="en">`.

**sitemap.xml** — all six public pages, referenced from robots.txt. The gated tracker page is NOT in the sitemap and carries `<meta name="robots" content="noindex">` in its (unencrypted wrapper) head.

**llms.txt** — keep in sync with site content at every milestone; it is the machine-readable executive summary.

## 8. Asset tracker (summary — full spec in ASSET_TRACKER_SPEC.md)

Pipeline: scheduled GitHub Action → fetches the Google Sheet via service account (key in Actions Secrets) → normalizes to JSON → renders the dashboard template → encrypts page+data with StatiCrypt using `TRACKER_PASSWORD` (also a Secret) → commits ONLY the encrypted `/tools/tracker/index.html`. The public repo and public site never contain readable holdings. The Tools hub shows a sample-data screenshot instead. Build this LAST (M4) — the site must not wait on it.

## 9. Milestones

**M0 — Live scaffold** *(already done if the coming-soon page is up)* Repo pushed, Pages enabled, placeholder serving.

**M1 — Shell + Home.** `site.css` with the full design system; shared nav/footer; finished Home. ✔ Accept: Home matches §4/§6, valid HTML (W3C validator), keyboard-navigable, no horizontal scroll at 360px width, Lighthouse ≥95 accessibility.

**M2 — Content pages.** About, Experience (timeline + skills), Projects, Contact, 404. ✔ Accept: all copy verbatim from CONTENT.md (`[OPEN]` items visibly absent, not faked); timeline readable on mobile; every internal link works.

**M3 — Crawl kit.** JSON-LD both pages, full head/OG treatment, sitemap.xml, llms.txt + robots.txt finalized. ✔ Accept: Rich Results Test passes; sitemap fetches; every page has unique title + description.

**M4 — Tracker.** Per ASSET_TRACKER_SPEC.md: Action runs green on schedule + manual dispatch; page decrypts with the password; sample-data screenshot on Tools hub. ✔ Accept: zero secrets in repo history; a wrong password shows the StatiCrypt prompt again, not content; `noindex` present.

**M5 — Polish + launch.** Favicon (dark-ground "PN" mark), 404 styled, GoatCounter/Plausible when chosen, run the full QA list below, then Pierson shares the URL.

## 10. Definition of done (run at M5, spot-check every milestone)

- Every page: valid HTML, unique title/description, h1 exactly once, no console errors.
- Mobile 360px → desktop 1440px: no layout breaks, no sideways scroll.
- All links resolve (internal relative, external `rel="noopener"`, mailto correct).
- Lighthouse: Performance ≥90, Accessibility ≥95, SEO ≥95 on Home + Experience.
- JSON-LD validates; robots.txt + sitemap.xml + llms.txt mutually consistent.
- Grep the repo for `secrets`, `BEGIN PRIVATE KEY`, the password — zero hits.
- The site reads correctly with JS disabled (tracker excepted).

## 11. Standing rules for ChatGPT

1. Copy comes from CONTENT.md verbatim; `[OPEN]` means ask Pierson.
2. Complete files with exact paths; explain each step in plain English first.
3. One milestone at a time; commit/push walkthrough after each.
4. No secrets in chat, repo, or client code — ever.
5. No new dependencies, frameworks, or build steps without Pierson's explicit yes.
