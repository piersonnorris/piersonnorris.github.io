/* ============================================================
   PNTaskboard — private portfolio project-board helpers.

   Storage stays with the encrypted stock-note vault. This module
   only normalizes goals, computes board metrics, and moves cards.
   ============================================================ */
(function (global) {
  'use strict';

  var COLUMNS = [
    { id: 'backlog', label: 'Backlog' },
    { id: 'planned', label: 'Planned' },
    { id: 'in-progress', label: 'In progress' },
    { id: 'blocked', label: 'Blocked' },
    { id: 'complete', label: 'Complete' }
  ];

  function columnIndex(status) {
    for (var i = 0; i < COLUMNS.length; i++) if (COLUMNS[i].id === status) return i;
    return 0;
  }

  function dateKey(value) {
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    return match ? match[0] : '';
  }

  function cleanLines(value) {
    var lines = Array.isArray(value) ? value : String(value || '').split(/\r?\n/);
    return lines.map(function (line) { return String(line || '').trim(); }).filter(Boolean);
  }

  function normalizeGoal(goal, index) {
    if (!goal || !String(goal.title || '').trim()) return null;
    var status = String(goal.status || 'backlog');
    if (columnIndex(status) === 0 && status !== 'backlog') status = 'backlog';
    return {
      id: String(goal.id || ('goal-' + Date.now().toString(36) + '-' + index)),
      title: String(goal.title || '').trim(),
      status: status,
      outcome: String(goal.outcome || '').trim(),
      nextAction: String(goal.nextAction || '').trim(),
      targetDate: dateKey(goal.targetDate),
      milestones: cleanLines(goal.milestones),
      dependencies: cleanLines(goal.dependencies),
      relatedLink: /^(?:https?:\/\/|#)/.test(String(goal.relatedLink || '')) ? String(goal.relatedLink) : '',
      created: String(goal.created || new Date().toISOString()),
      updated: String(goal.updated || new Date().toISOString())
    };
  }

  function normalize(goals) {
    return (goals || []).map(normalizeGoal).filter(Boolean);
  }

  function metrics(goals, today) {
    var clean = normalize(goals);
    var now = dateKey(today) || dateKey(new Date().toISOString().slice(0, 10));
    var end = new Date(now + 'T12:00:00');
    end.setDate(end.getDate() + 30);
    var endKey = end.getFullYear() + '-' + String(end.getMonth() + 1).padStart(2, '0') + '-' + String(end.getDate()).padStart(2, '0');
    return {
      total: clean.length,
      active: clean.filter(function (goal) { return goal.status !== 'backlog' && goal.status !== 'complete'; }).length,
      dueSoon: clean.filter(function (goal) { return goal.status !== 'complete' && goal.targetDate && goal.targetDate >= now && goal.targetDate <= endKey; }).length,
      blocked: clean.filter(function (goal) { return goal.status === 'blocked'; }).length,
      complete: clean.filter(function (goal) { return goal.status === 'complete'; }).length
    };
  }

  /* Sort by workflow stage (Backlog -> Planned -> In progress -> Blocked
     -> Complete), then by target date (soonest first, undated last),
     then title — a stable default order for any flat list of goals
     (the Island page's "All hands" view; ties within a tracker column). */
  function sortGoals(goals) {
    return normalize(goals).slice().sort(function (a, b) {
      return columnIndex(a.status) - columnIndex(b.status) ||
        (a.targetDate || '9999-99-99').localeCompare(b.targetDate || '9999-99-99') ||
        a.title.localeCompare(b.title);
    });
  }

  function move(goals, id, direction) {
    return normalize(goals).map(function (goal) {
      if (goal.id !== id) return goal;
      var next = Math.max(0, Math.min(COLUMNS.length - 1, columnIndex(goal.status) + direction));
      goal.status = COLUMNS[next].id;
      goal.updated = new Date().toISOString();
      return goal;
    });
  }

  /* Mirrors docs/ROADMAP.md (R-numbers) — the shared task list for
     Pierce, Claude, and ChatGPT. When the roadmap changes, update this
     seed too, per the sync rule at the top of that file. */
  function seed() {
    var now = new Date().toISOString();
    return normalize([
      {
        id: 'goal-tracker-split', title: 'Portfolio tracker moves to its own private repo', status: 'complete',
        outcome: 'The tracker left /tools/tracker/ for the private stock-trackers repo, where access is GitHub\'s job and the page runs with no PIN. Its page, build script, chart and price modules, tests, specs and refresh workflow went with it, and every link, tile and card that pointed at it came off this site.',
        nextAction: 'None here. The tracker\'s own open work (R1, R2, R5, R6 and the rest) continues in stock-trackers.',
        milestones: ['stock-trackers created (private)', 'Tracker removed from the site', 'Links, copy and vault snapshot updated'],
        dependencies: [], relatedLink: '', created: now, updated: now
      },
      {
        id: 'goal-public-pages', title: 'R7 · Public pages M2/M3 (ChatGPT)', status: 'planned',
        outcome: 'About, Projects, Contact, Tools hub, 404, sitemap live — copy verbatim from CONTENT.md.',
        nextAction: 'Unblock with the R4 content decisions, then ChatGPT builds page by page.',
        milestones: ['About', 'Projects', 'Contact + 404', 'sitemap.xml + OG tags'],
        dependencies: ['R4 answers from Pierce'], relatedLink: 'https://piersonnorris.github.io/', created: now, updated: now
      },
      {
        id: 'goal-content-decisions', title: 'R4 · Content decisions', status: 'blocked',
        outcome: 'The seven [OPEN] questions in CONTENT.md answered so public copy can ship.',
        nextAction: 'Pierce answers: club title, LLC legal name, Ryan naming, Oasis story, 2024–25 gaps.',
        milestones: ['Club title', 'LLC name confirmed', 'Timeline gaps filled'],
        dependencies: ['Pierce'], relatedLink: '#projects', created: now, updated: now
      },
      {
        id: 'goal-observatory', title: 'R18 · Bottle Observatory — home page UI rebuild', status: 'in-progress',
        outcome: 'The ship-in-a-bottle Obsidian showcase, picked from five drafted directions (docs/BOTTLE_SHOWCASE.md) and scoped up to the home page itself rather than a sub-page. The bottle IS the page: the vault lives inside the glass as a drifting constellation of real notes joined by real [[wikilinks]], the ship tacks between them, and popping the cork flies the camera through the glass so the bottle becomes the vignette you are permanently inside. One click, no gate, and the only job is to look extraordinary while the structure underneath stays real. Also done: the porthole no longer links to the stock desk — the Obsidian and portfolio surfaces now share no navigation at all.',
        nextAction: 'A, B and C are done (2026-09-08). PNObservatory is real code — assets/js/observatory.js + assets/css/observatory.css — with two full compositions (bottle on its side for landscape, standing on its base for portrait) and the open-the-bottle morph, which turned out to be ~40 lines once both layouts existed rather than the risky phase the plan feared. Next is D: the node cap and largest-connected-component view, which is what keeps the morph cheap and stops R17 P4 from silting the glass up. E is blocked on R19\'s lane labels. Nothing has been looked at on real hardware yet.',
        milestones: ['A · full-size comp — done, 01 holds up', 'B · the glass + upright portrait — done', 'C · the layout morph — done', 'D · node cap + largest connected component', 'E · the page around it — needs R19 data', 'F · cut / over to /'],
        dependencies: ['Pierce'], relatedLink: '#projects', created: now, updated: now
      },
      {
        id: 'goal-voyage', title: 'R19 · Island to island — the work as a chart', status: 'planned',
        outcome: 'The work history laid out as a sea chart instead of a list: every chapter an island — portfolio, Oasis, Elon, True North, Screencastify, this site — placed by date, sized by duration, with the ship at today and the AI Club presidency drawn as an outline it has not reached yet. The lanes between islands are the argument: each is labelled with what actually carried over (crew and door-to-door, hustle to institution, the documented system, the workflow method), which a bullet list physically cannot show. Copy is CONTENT.md §3 verbatim — nothing new is written, it gets placed.',
        nextAction: 'Promoted 2026-09-08: voyage-data.js is now the data layer the home page reads below the fold, not just the Experience chart\'s source — R18 phase A left the six console tiles with nowhere to go, and this is what replaces them. So the data file has to exist by R18 phase E, which puts the six lane labels on the critical path. They are claims about Pierce\'s own career and need his words before anything ships.',
        milestones: ['Lane labels in Pierce\'s words — blocks R18 phase E', 'voyage-data.js traced to CONTENT.md §3', 'Home-page work section reads it', 'Chart above the Experience timeline', 'Degrades to the ordered list under 760px'],
        dependencies: ['Pierce'], relatedLink: '#projects', created: now, updated: now
      },
      {
        id: 'goal-backstage', title: 'R17 · Backstage — the vault in public, no gate (/vault/)', status: 'in-progress',
        outcome: 'A public, read-only vault reader at /vault/ with no login: folder tree, rendered Markdown, backlinks inspector, ⌘K palette, and the real link graph. Fed by a new --public mode on tools/obsidian-sync.js that gates on publish:false / #private / nopublish/, refuses (never silently redacts) on anything shaped like a dollar figure, address, phone number or key, and resolves inline path references into wikilinks. New PNMarkdown renderer (assets/js/markdown.js), escape-first. Also fixed the .gitignore hole that had kept /atlas/ from ever deploying, and a real bug in PNGraphify: [[links]] inside code spans were being counted as links.',
        nextAction: 'Phases P0–P3 are done and the first snapshot published is the site\'s own docs/ folder (already public in the repo). P4 — publishing the personal vault — waits on Pierce reading `node tools/obsidian-sync.js --report` against it and answering the four questions in docs/BACKSTAGE_PLAN.md §7.',
        milestones: ['P0 unignore /atlas/', 'P1 --report', 'P2 --public + scrubber + tests', 'P3 /vault/ reader + markdown renderer', 'P4 publish the personal vault — needs Pierce'],
        dependencies: ['Pierce'], relatedLink: 'https://piersonnorris.github.io/vault/', created: now, updated: now
      },
      {
        id: 'goal-atlas', title: 'R16 · Knowledge atlas (/atlas/)', status: 'complete',
        outcome: 'A public, third Obsidian-shaped surface that is not a vault: a three-pane workspace over 25 curated notes on what Pierce has learned and where. Explorer, reader with backlinks, and three views (Reader / Graph / Timeline). The graph is PNGraphify itself, so every edge is a real [[wikilink]] in the copy above it — 25 notes, 30 links, 2.4 per note, zero orphans, zero unresolved. Data lives in assets/js/atlas-data.js, every claim traced to CONTENT.md and respecting its §7 "never on the site" list.',
        nextAction: 'Hand-maintained on purpose: when CONTENT.md changes, update atlas-data.js to match (same rule as this seed).',
        milestones: ['atlas-data.js curated from CONTENT.md', 'Three-pane workspace + reader', 'Graph view via PNGraphify', 'Timeline view', 'Nav, sitemap, llms.txt'],
        dependencies: [], relatedLink: 'https://piersonnorris.github.io/atlas/', created: now, updated: now
      },
      {
        id: 'goal-obsidian-graph', title: 'R15 · Obsidian connectivity — graph view + vault sync', status: 'complete',
        outcome: 'PNGraphify (assets/js/notes-graph.js) draws the vault as a force-directed graph behind a Graph button on /notes/ and this Obsidian tab — orphans and unresolved [[wikilinks]] counted as two separate numbers, clicking an unresolved node writes that note, and sharing a #tag deliberately does not count as a link. tools/obsidian-sync.js reads a real Obsidian vault folder into a gitignored pn-vault-bundle JSON plus a connectivity report, reusing PNVault.fromMarkdown rather than reimplementing the parser. Import now takes that bundle and upserts by vault path (source_path survives an export round trip) instead of skipping duplicates, and build.js loadObsidianVault() bakes it into the encrypted payload for a one-click merge here.',
        nextAction: 'Point it at the real vault: node tools/obsidian-sync.js --vault "<folder>", then Import the bundle on /notes/. Still a snapshot, not live sync — refreshing means re-running the script. Nobody has clicked the merge banner on this tab yet; it needs a real build to appear.',
        milestones: ['PNGraphify build() + unit tests', 'Graph view in the notes UI', 'obsidian-sync.js vault reader', 'importBundle() upsert by path', 'build.js obsidianVault seam'],
        dependencies: [], relatedLink: '#stocknotes', created: now, updated: now
      },
      {
        id: 'goal-launch-hardening', title: 'R11 · Launch hardening', status: 'backlog',
        outcome: 'BLUEPRINT §10 checklist run, custom domain attached.',
        nextAction: 'Schedule once the public pages exist. The demo-login question moved with the tracker to stock-trackers.',
        milestones: ['QA checklist', 'piersonnorris.com CNAME'],
        dependencies: ['R7 shipped'], relatedLink: '#projects', created: now, updated: now
      },

      /* ---- U1-U22: UI audit, 2026-09-06. Catalogued only — nothing
         here is built yet. Mirrors docs/ROADMAP.md "UI polish backlog".
         All start in backlog; move a card to plan one, don't build
         from this list without moving it first. */
      {
        id: 'goal-ui-contrast', title: 'U1 · Fix low-contrast meta text', status: 'complete',
        outcome: 'Timestamps, footnotes, and dimmed labels meet WCAG AA (4.5:1) instead of failing at 3.25:1.',
        nextAction: 'Lighten --dim in site.css (measured 3.25:1 on --bg) and re-check every page that leans on it for meta/timestamp text.',
        milestones: ['Re-measure all token pairs', 'Pick a compliant --dim', 'Sweep pages for regressions'],
        dependencies: [], relatedLink: '', created: now, updated: now
      },
      {
        id: 'goal-ui-focus', title: 'U2 · Restore visible focus rings', status: 'complete',
        outcome: 'Rechecked the original claim before fixing it: input/textarea/select were actually already fine — a later :focus-visible rule with equal specificity already wins the outline back. The real bug was .pnchart-graph .vg-node:focus, whose two-class selector (0,0,3,0) outranks the generic [tabindex]:focus-visible rule (0,0,2,0) regardless of source order, so vault-graph nodes truly had no focus ring. Added .vg-node:focus-visible with its own ring.',
        nextAction: 'Done. Tab through the Projects tab\'s vault graph to confirm.',
        milestones: ['Verify inputs via specificity math', 'Fix .vg-node:focus-visible', 'Tab through the vault graph'],
        dependencies: [], relatedLink: '#projects', created: now, updated: now
      },
      {
        id: 'goal-ui-skiplink', title: 'U3 · Add a skip-to-content link', status: 'complete',
        outcome: 'Screen-reader and keyboard users can jump past the nav on every page.',
        nextAction: 'None of the five pages has one today. Add a visually-hidden-until-focused "Skip to content" link right after <body> on each.',
        milestones: ['Shared markup/CSS', 'Home/Experience/Notes', 'Tracker + Island'],
        dependencies: [], relatedLink: '', created: now, updated: now
      },
      {
        id: 'goal-ui-favicon', title: 'U4 · Ship the favicon', status: 'complete',
        outcome: 'A dark-ground "PN" mark in the browser tab, as BLUEPRINT.md always called for.',
        nextAction: 'Confirmed: zero pages currently declare a favicon. Design the mark, export sizes, link it from every <head>.',
        milestones: ['Design the mark', 'Export favicon set', 'Link from all five pages'],
        dependencies: [], relatedLink: '', created: now, updated: now
      },
      {
        id: 'goal-ui-og', title: 'U5 · Complete Open Graph + og:image', status: 'backlog',
        outcome: 'Sharing the site anywhere shows a real preview card instead of a blank one.',
        nextAction: 'Home has og:title/description but no og:image anywhere on the site; produce one share image and wire it into Home + Experience.',
        milestones: ['Design a 1200×630 share image', 'Add og:image + twitter:image', 'Validate with a link-preview tool'],
        dependencies: [], relatedLink: '', created: now, updated: now
      },
      {
        id: 'goal-ui-mobilenav', title: 'U6 · Mobile nav menu', status: 'complete',
        outcome: 'A hamburger toggle (assets/js/nav.js, shared across all six pages) collapses .navlinks under 760px into a push-down panel — no overlay, so it never fights the tracker\'s other fixed UI. Found and fixed a real trap along the way: Experience defines its own unconditional .navlinks{display:flex}, which — same specificity, later in the cascade than site.css — would have silently defeated a shared-only fix, so its own override lives in that page too.',
        nextAction: 'Done. Verified at true desktop width (1400px, toggle hidden) and mobile (375px, toggle visible, opens/closes, auto-closes on link click) on Home, Experience, Notes, Island, the real encrypted tracker, and 404 — zero console errors on any.',
        milestones: ['Shared markup + assets/js/nav.js', 'Experience-specific cascade fix', 'Verified all six pages at both widths'],
        dependencies: [], relatedLink: '', created: now, updated: now
      },
      {
        id: 'goal-ui-icons', title: 'U7 · One real icon set', status: 'backlog',
        outcome: 'Lock, chart, note, and island cues look like one visual language instead of ad hoc emoji.',
        nextAction: 'Today it is a mix: 🏝 in nav, 🐚⭐🦀 on the island, plain "·pin" text elsewhere. Design a small inline-SVG icon set and swap them in.',
        milestones: ['Pick 6-8 icons needed', 'Draw as inline SVG', 'Replace emoji site-wide'],
        dependencies: [], relatedLink: '', created: now, updated: now
      },
      {
        id: 'goal-ui-homefeed', title: 'U8 · Wire the home feed to updates.js', status: 'complete',
        outcome: 'Re-scoped before building it: updates.js tracks website-ENGINEERING changes (EMA overlays, dividend charts) — wrong subject matter for a career-facing homepage. Wiring the two together would put dev-changelog trivia in front of recruiters. Instead, pinned an explicit code comment tying the (still hand-curated, still accurate) feed to its real source of truth: the Experience page / CONTENT.md §3.',
        nextAction: 'Done for now. A true fix (shared career-highlights data file feeding both Home and Experience) is a bigger content-architecture project, not a quick UI task — revisit only if the feed actually drifts.',
        milestones: ['Correct the data-source assumption', 'Verify feed still matches Experience page', 'Add the sync-note comment'],
        dependencies: [], relatedLink: '#experience', created: now, updated: now
      },
      {
        id: 'goal-ui-freshness-badge', title: 'U9 · Site-wide "last updated" stamp', status: 'backlog',
        outcome: 'Needs re-scoping, found while working U8: updates.js is the wrong source for a PUBLIC last-updated stamp (it is the site\'s internal engineering changelog, not public-content history) — and the tracker Updates tab that served the private/dev side left with the tracker for stock-trackers (2026-09-15).',
        nextAction: 'Decide what "last updated" should actually mean for a public page (last CONTENT.md revision? last Experience-page edit?) before building anything — don\'t just point this at updates.js.',
        milestones: ['Define what freshness means publicly', 'Pick a real source', 'Then build the stamp'],
        dependencies: [], relatedLink: '', created: now, updated: now
      },
      {
        id: 'goal-ui-componentdrift', title: 'U17 · Consolidate duplicated component CSS', status: 'backlog',
        outcome: 'Cards, tiles, and buttons stop drifting apart as more pages get added.',
        nextAction: '.tile/card/button patterns are redefined slightly differently per page; pull the shared shape into site.css once and reference it everywhere.',
        milestones: ['Audit every page’s card/button CSS', 'Merge into site.css', 'Delete the per-page duplicates'],
        dependencies: [], relatedLink: '', created: now, updated: now
      },
      {
        id: 'goal-ui-entrance', title: 'U18 · Subtle entrance animation on first load', status: 'complete',
        outcome: 'Home’s console tiles and the Experience timeline feel a touch more premium on arrival.',
        nextAction: 'Add a short fade/stagger-in on first paint, fully respecting prefers-reduced-motion (already the site’s pattern elsewhere).',
        milestones: ['Home console tiles', 'Experience timeline cards'],
        dependencies: [], relatedLink: '', created: now, updated: now
      },
      {
        id: 'goal-ui-404', title: 'U19 · Build the 404 page', status: 'complete',
        outcome: 'A broken or old link lands somewhere on-brand instead of GitHub Pages’ default 404.',
        nextAction: 'BLUEPRINT.md calls for a dark, terse 404 with a link home; it does not exist yet.',
        milestones: ['Design + copy', 'Drop in 404.html at repo root'],
        dependencies: [], relatedLink: '', created: now, updated: now
      },
      {
        id: 'goal-ui-themecolor', title: 'U20 · theme-color meta tag', status: 'complete',
        outcome: 'Mobile browser chrome (the address-bar area) matches the site’s dark background instead of default white.',
        nextAction: 'Add <meta name="theme-color" content="#0e1116"> to every page’s head.',
        milestones: ['Add to all five pages', 'Spot-check on an actual phone'],
        dependencies: [], relatedLink: '', created: now, updated: now
      },
      {
        id: 'goal-ui-radiustoken', title: 'U21 · One radius/shadow scale', status: 'backlog',
        outcome: 'Actually counted it: 13 distinct border-radius values (2-16px, plus 999px pills) across the repo, not a small drift. Forcing every one onto the existing two tokens (--r:10px, --r-lg:14px) would visibly break small elements — a 3px nail dot or a 4px badge does not want a 10px radius. The real fix is a proper scale, not a blind find-replace.',
        nextAction: 'Design --r-xs/--r-sm/--r/--r-lg/--r-pill, map each of the 13 found values to its nearest step by hand (one at a time, screenshot before/after), not with a sweeping sed.',
        milestones: ['Design the 4-5 step scale', 'Map values file by file', 'Screenshot-diff each page after'],
        dependencies: [], relatedLink: '', created: now, updated: now
      },
      {
        id: 'goal-ui-islandpolish', title: 'U22 · Tie the Island page’s look back to the brand', status: 'complete',
        outcome: 'The island still feels like piersonnorris.com wearing a costume, not a separate site.',
        nextAction: 'Add a bit of depth (sand texture/shadow under the board) and make sure its type pairing (Kalam + mono) still reads as a deliberate extension of the site’s Archivo/Plex system, not a break from it.',
        milestones: ['Texture/shadow pass', 'Typography consistency check'],
        dependencies: [], relatedLink: '', created: now, updated: now
      },

      /* ---- PN Tasks: Pierce's own queue -- open questions + ideas that
         need his decision before anyone builds them. Mirrors
         docs/ROADMAP.md §5. ---- */
      {
        id: 'goal-pn-easter-egg', title: 'PN Tasks · Ship-in-a-bottle Obsidian Easter egg', status: 'in-progress',
        outcome: 'Entrance built 2026-09-07: PNBottle (assets/js/bottle.js + bottle.css) mounted twice -- under the Currently card on Home and washed up in the sand on /island/ -- one component wearing each page\'s palette. Cork pops, ship sails out, and a porthole dialog opens on the vault\'s front door: a generated constellation sketch, a lamp reading whether a vault exists on this device (key presence only, never content), and links into /vault/ and /notes/. The viewer half is deliberately NOT built: a public page cannot show encrypted notes, so faking one would misrepresent the site.',
        nextAction: 'Done 2026-09-10. Pierce picked Research studio; /notes/ now wears it (skin-only, assets/css/notes-studio.css). The tracker Obsidian tab half moved with the tracker to the stock-trackers repo (2026-09-15).',
        milestones: ['Bottle/cork/ship click interaction', 'Home-page entrance', 'Island entrance', 'R10 direction picked', 'Polished /notes/ viewer', 'Fireflies fly jar to star (R23)'],
        dependencies: ['R10 · Obsidian visual style'], relatedLink: '#projects', created: now, updated: now
      }
    ]);
  }

  global.PNTaskboard = {
    columns: COLUMNS,
    normalize: normalize,
    sortGoals: sortGoals,
    metrics: metrics,
    move: move,
    seed: seed
  };
})(window);
