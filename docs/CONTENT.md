# CONTENT — piersonnorris.com

Single source of truth for every claim on the site. Compiled by Claude from Pierson's Drive (resumes, LLC documents, the Screencastify final deck, the asset-tracking spec) and direct decisions with Pierson, 2026-08-23. Timeline section rewritten 2026-09-05 from the True North operations framework, priority roadmap, all-hands deck, and head-manager training deck, plus the Screencastify final presentation.

Rules: use this copy verbatim (light grammatical smoothing allowed, meaning-changes not). `[OPEN]` = missing or unconfirmed — ask Pierson; never invent. Where numbers appear, they came from Pierson's own documents.

---

## 1. Identity

- **Public name:** Pierson Norris (goes by Pierce in person — "Pierson Norris" is the searchable, professional identity and appears in H1s, titles, JSON-LD).
- **One-line identity (Home, under H1):** Founder, operator, and builder — business on the ground, AI in the workflow.
- **Elevator pitch (Home + JSON-LD description, verbatim):**
  > Pierson Norris is a Finance & Accounting student at Elon University (class of 2027) who builds businesses and the systems that run them. He founded True North Services LLC, a Chicago North Shore exterior-services company he started at 18 and grew into a documented, trained operation; spent a summer as an AI intern at Screencastify mapping seven workflows across six departments and shipping three live automation fixes; and is the incoming president of Elon's AI & ET Club. This site is his profile, his portfolio, and his toolbox.

  `[OPEN]` Pierson: confirm the club title line and the "started at 18" framing.
- **Contact email:** norrispierce506@gmail.com `[OPEN: may swap for a cleaner public alias]`
- **LinkedIn:** https://www.linkedin.com/in/pierson-norris-634954246 `[OPEN: claiming a cleaner custom URL is on his checklist — use whichever exists at build time]`
- **GitHub:** `[OPEN: username pending confirmation]`
- **Other socials:** `[OPEN: TBD by Pierson — an Instagram for the business (oaisis_exterior_cleaning) exists from the Oasis era]`
- **Photo:** `[OPEN]`

## 2. About (draft, first person, ~300 words)

> I grew up on Chicago's North Shore doing the jobs that teach you how work actually happens — a Taco Bell register, moving furniture for a design firm, a one-month internship shadowing a CEO. The summer before college I started a power-washing and window-washing business with a crew of high-school and college kids. First summer: 50+ clients and five figures in revenue, sold with flyers, Nextdoor posts, and knocking on doors.
>
> At Elon I study Finance & Accounting with minors in Entrepreneurship and Mandarin Chinese. The business kept growing alongside the degree, and in 2026 it became True North Services LLC — a real company now, with an operations framework, a crew-training program I wrote myself, and a team that runs weekly ops calls without me in the room.
>
> The other thread is AI. In summer 2026 I was the AI intern at Screencastify, where I learned my favorite working method: don't start with the tool, start with someone's actual Tuesday. One written prompt got seven workflows mapped across six departments in 48 hours, and every single one had the same failure — a person acting as the API between systems that don't talk. We shipped three fixes; one cut a 4–8 hour weekly finance task to under 15 minutes.
>
> Now I run True North, trade and track my own portfolio (since 2020), and serve as incoming president of Elon's AI & ET Club. I build my own tools — the locked one on this site tracks my holdings across five platforms, live from a spreadsheet.
>
> `[OPEN — closing line: the 2027 headline. What Pierson is aiming at after graduation.]`

## 3. Experience timeline (2023 → now)

Rendered newest-first at `/experience/`. The timeline **starts at 2026** (the top) and runs back to 2023. Per Pierson, 2026-09-05: **no 2027 entries** — that year hasn't happened, so it is not on the page.

**2026** *(nine entries, newest first)*

- **Incoming President, Elon AI & Emerging Tech Club** — 2026, ongoing. `[OPEN: exact title, term start/end, one line of agenda]`
- **AI Intern, Screencastify** — Jun 9 – Aug 7, 2026 (nine weeks). One three-round workflow-mapping prompt dropped in a shared folder; department leaders mapped their own work (trigger, middle, hand-offs, friction, root cause) and returned **7 workflows across 6 departments in 48 hours**, with **one meeting added**. All seven shared one failure: *a person acting as the API between systems that don't talk.* Three fixes shipped — Finance weekly AR collections (**4–8 hrs/week → under 15 minutes**), Product-marketing Monday update email (**~30 min/week plus the rework loop, gone**), Engineering sprint-review recording (a hard-cutoff policy and one saved filter — **no tool build at all**). Combined build time: one afternoon. Separately, a **76-post** distribution audit reframed marketing as **under-concentrated, not under-worked**, and proposed the *Content Waterfall* — one ungated anchor asset repurposed into eight placements, with a single named distribution owner. *Takeaway: the method is the résumé line — find the problem in someone's actual Tuesday, get sign-off, build it with them, ship it.*
- **Built Castify OS — three internal AI modules, live** — Jun 15 – Jul 31, 2026. Idea (Jun 15) → first agent skill (Jun 18) → build spec (Jun 29) → shipped (Jul 7) → first live client (Jul 9) → third module in beta (Jul 31). **Proposal Generator** (sales, live): deal context in, client-ready branded PDF + editable .docx out, **30 min → 5 min per proposal**. **Outbound Email Agent** (marketing, live): reads pending contacts from a sheet, researches, drafts into Gmail — *approval-gated by design, it never auto-sends*. **Traffic & AI Referral Analytics** (marketing, beta): two brands and two sites in one view, with AI-assistant referrals broken out as their own channel class. *Takeaway: AI doesn't replace the workflow. It removes the part of the workflow nobody wanted to do.*
- **Ran True North's first company all-hands** — Jul 17, 2026, co-presented with the operations lead. Nine parts: the quote process end to end (respond as True North and capture name + address → price face to face with your reasoning → log it in the quote form → send a formal quote → book it and brief the crew), a live site walkthrough, a LinkedIn team-spotlight program, a written marketing do's-and-don'ts (before *and* after on every post, same angle, natural light, teammates credited, never a client's address), and a referral incentive of a **$10 minimum** per client — paid only once the client is landed *and* the job is completed.
- **Built True North's digital infrastructure** — May – Aug 2026. Hand-built company site (standalone HTML, Netlify, custom domain) at truenorthservicesllc.netlify.app; lead-capture form mapped to service categories; a post-quote form feeding a responses sheet so close rate is a visible number; 90+ photo marketing library; SMS-automation scoping.
- **Wrote the crew training program** — May 2026. Head-manager service training: power washing, paver-sand reapplication, and window washing, each a six-step field procedure with its own do's and don'ts. *Takeaway: the training is the quality control — you can't inspect your way to a standard you never wrote down.*
- **Put the company on a documented operating system** — Apr – Jun 2026. One path per lead: lead → **Form 1** quote scheduling & assignment → appointment → **Form 2** quote result & pricing (scope, before photos, price, labor/materials estimate, payment terms, close probability) → approval → job → **Form 3** end-of-job report (actual hours, materials, after photos, property condition, damage, upsells, equipment) → invoice → paid. All three feed one master sheet: leads, quotes, closed jobs, scheduling, payments, applicants, referral partners, manager performance, equipment, weekly scorecard. *Takeaway: no form, no distribution. The paperwork is the control.*
- **Incorporated True North Services LLC** — Apr – May 2026. LLC filing, operations & risk framework, written priority roadmap, and a manager-contractor model (managers are independent contractors who own crews, scheduling, and execution risk). Team of **four-plus**, operations lead running weekly ops calls. Economics: of gross, **20%** company / **5%** backend / **5%** lead fee / **70%** manager. Floors: **$100** minimum job, **30%+** manager margin target, pricing-floor check before quoting. Liability: jobs over **$500** require a signed client agreement; managers sign a scope-and-indemnification agreement; before/after photos on property-sensitive jobs; card fees passed through flat. Service-boundary matrix: direct — power washing, window washing, weeding, mulching, bush trimming, staining, pavers, gravel paths, seasonal cleanups; referral-only — roofing, plumbing, electrical, large tree work, licensed trades; anything else is approval-only. Cash: bank transfer first, cash second, card third; revenue lands in the LLC account, distributions biweekly once documentation, disputes, and refunds settle. *Takeaway: from hustle to institution — docs, training, and structure that run without you in the room.*
- **Asset tracking system** — 2026, ongoing. Five-platform portfolio tracker in Google Sheets, monthly-tab automation, gated live dashboard on this site.

**2025**
- **Manager & equity partner, Student Maintenance LLC** — spring 2025. Brought on as manager with an ownership stake: on-site quoting, closing leads, marketing content, sales-team leadership. `[OPEN: include on the public site at all? If yes, confirm dates + how to describe the stake.]`
- `[OPEN: junior-year highlights]`

**2024**
- **Business + portfolio, year two** — ran the cleaning business back-to-back summers while carrying the dual major; self-managed portfolio active since 2020.
- `[OPEN: what defined 2024 — clubs, coursework, the summer story?]`

**2023**
- **Started at Elon University** — Aug 2023. Finance & Accounting dual major; minors in Entrepreneurship and Mandarin Chinese (near-fluent). `[OPEN: confirm still accurate]`
- **Founded Oasis Exterior Cleaning** — May 2023. Power washing + window washing, Chicago North Shore. 50+ clients, five-figure revenue (~$12k profit) in the first summer, +68% customer growth from hand-built local marketing (flyers, Nextdoor, Instagram, Facebook), managing a crew of high-school and college students. *Takeaway: sold a service door to door and ran a crew before most people pick a major.* `[OPEN: is Oasis→True North one continuous story (rebrand) or two chapters?]`

**Prologue — before Elon (muted block)** `[OPEN: keep or cut]`
First W-2 at Taco Bell (2021) · mover/assistant at Inspired Interiors (2021–23) · one-month internship under Gemini Builds It CEO Courtney Wright (spring 2023) · trading his own portfolio since Aug 2020 · New Trier High School, class of 2023.

### 3a. True North — open naming question

Pierson's own documents use three names for the same entity. Resolve before the About and Projects pages ship:

- **True North Services LLC** — the all-hands deck (Jul 17, 2026), the live site, the Drive folder, the structure doc's filename. **This is what the site currently uses.**
- **True North Maintenance LLC** — the Operations & Risk Framework and the Priority To-Do List (both Apr 2026).
- **North Shore Services LLC** — the heading inside `True_North_Services_Structure 2.docx`.

`[OPEN: Pierson — which is the name on the filing?]`

### 3b. Screencastify — publication boundary

Kept **off** the public site deliberately: the first live client's name, Screencastify's internal channel performance figures (total and average view counts), and the names of their internal vendor tools. The page describes what Pierson built and the time saved, not his former employer's private numbers. `[OPEN: Pierson — confirm, or say which of these he has clearance to name.]`

## 4. Skills (Experience page grid — structured list, crawler-friendly)

- **Operations & leadership** — crew hiring and training programs, documented ops frameworks, weekly ops cadence, manager-contractor structuring, client management (50+ clients).
- **Sales & local marketing** — door-to-door and referral sales, in-person quoting, Nextdoor/Meta local campaigns, lead-capture funnels, content standards.
- **Finance & markets** — Finance & Accounting dual major; unit economics, pricing floors and margin structures; active self-directed investor since 2020 (equities, options, crypto — five platforms).
- **AI & automation** — workflow mapping and diagnosis, prompt-built internal tools, agent modules with human approval gates, Google Sheets/Apps Script automation, Sheets API, N8N exploration.
- **Web** — hand-built HTML/CSS sites (True North on Netlify; this site), form-to-sheet plumbing, static deploys.
- **Languages** — English; Mandarin Chinese (near-fluent).

## 5. Projects (Projects page cards)

1. **True North Services — digital infrastructure** (2026, live) — company site, lead capture, photo library, ops docs. Link: True North site URL `[OPEN: confirm final URL]`.
2. **Portfolio Asset Tracker** (2026, live + locked) — Google Sheet → GitHub Action → encrypted dashboard; five platforms, monthly history. Links to /tools/.
3. **Screencastify AI internship tooling** (2026) — the 7-workflows/48-hours diagnosis method + three shipped fixes. Links to Experience entry.
4. **piersonnorris.com** (2026) — this site: plain HTML, dark system, AI-crawlable by design, spec'd with Claude, built with ChatGPT. Repo link once public.

## 6. Tools page

Intro: "Things I build for myself. Some are public, some are locked."
Card — **Portfolio Tracker**: "Live view of my holdings across five platforms — SoFi, Webull, Robinhood, Gemini, GoMining — pulled from the spreadsheet I actually maintain. Locked; sample view below." + sample-data screenshot + locked chip → /tools/tracker/.

## 7. Numbers that may appear on the site (all from Pierson's own docs)

50+ clients · five-figure first-summer revenue (~$12k profit) · +68% customer growth · 7 workflows / 6 departments / 48 hours / 1 meeting added · 3 shipped fixes · 4–8 hrs/week → under 15 minutes · ~30 min/week saved on the Monday email · 76 posts audited · 3 Castify OS modules live · 30 min → 5 min per proposal · 9 weeks idea-to-platform · 5 platforms tracked · team of 4+ · 20/5/5/70 revenue split · $100 minimum job · 30%+ manager margin target · $500 signed-agreement threshold · $10 minimum referral incentive.

**Never on the site:** portfolio dollar values, share counts, individual holdings, the spreadsheet ID, any credential. (Tracker data exists only behind the password.) Also off the site: Screencastify client names, their internal channel performance figures, and their internal vendor tool names (see §3b); True North client names, addresses, and revenue figures.
