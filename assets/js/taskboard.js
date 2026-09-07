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
        id: 'goal-robinhood-mcp', title: 'R1 · Robinhood MCP price feed', status: 'in-progress',
        outcome: 'Scheduled builds bake real read-only quotes into the encrypted payload — no browser API calls.',
        nextAction: 'Pierce: finish the MCP backend setup. Then Claude wires it into the quotes seam in build.js.',
        milestones: ['MCP connected', 'Quotes baked at build time', 'Charts value themselves offline'],
        dependencies: ['Pierce backend setup'], relatedLink: '#charts', created: now, updated: now
      },
      {
        id: 'goal-handoff', title: 'R3 · Next investment handoff file', status: 'complete',
        outcome: 'September 2026 (48 holdings) confirmed by Pierce and sealed into the tracker alongside August. Month switcher and value-over-time chart both show two points.',
        nextAction: 'Reopens automatically next time a new month lands — no action needed until then.',
        milestones: ['September tab created', 'Snapshot refreshed', 'Month switcher shows two months'],
        dependencies: [], relatedLink: '#positions', created: now, updated: now
      },
      {
        id: 'goal-actions-secrets', title: 'R2 · GitHub Actions tracker secrets', status: 'planned',
        outcome: 'The scheduled refresh workflow runs green and commits a rebuilt encrypted tracker daily.',
        nextAction: 'Pierce adds TRACKER_PASSWORD, GOOGLE_SERVICE_ACCOUNT_JSON, and SHEET_ID as repo secrets.',
        milestones: ['Secrets set', 'Manual dispatch green', 'Daily cron green'],
        dependencies: ['Pierce (repo admin)'], relatedLink: '#positions', created: now, updated: now
      },
      {
        id: 'goal-price-key', title: 'R5 · Live price key (bridge)', status: 'planned',
        outcome: 'Allocation, mix, and history charts run on live quotes until the MCP feed lands.',
        nextAction: 'Pierce: free Twelve Data key → unlocked tracker → Price source → paste. Five minutes.',
        milestones: ['Key pasted', 'All symbols priced', 'EMA chart on real history'],
        dependencies: [], relatedLink: '#charts', created: now, updated: now
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
        id: 'goal-calendar-sync', title: 'R9 · Google Calendar — one-way pull done, two-way parked', status: 'complete',
        outcome: 'A session-side Google Calendar connector pulled 130 real confirmed events (next ~3 months) into private/tracker/google-calendar.json; build.js bakes them into the encrypted payload (googleEvents) alongside dividend dates. The Calendar tab merges them in with their own filter, and the Projects tab now has a compact "main calendar" (renderBoardCalendar()) directly under the board, combining board target dates + dividends + private plans + Google events. The board itself now sorts by stage then target date (PNTaskboard.sortGoals()) instead of raw insertion order, on both this board and /island/. Island got its own public-safe "tide chart" of board target dates only — no personal or portfolio data on the public page.',
        nextAction: 'Refresh the Google snapshot periodically: a Claude session re-pulls via the connector and reruns --local-snapshot. True two-way sync (write-back, self-refreshing) still needs a private OAuth backend — tracked separately as R9b, parked on purpose.',
        milestones: ['Session-side pull → private snapshot', 'build.js googleEvents seam', 'Calendar tab merge + filter', 'Board calendar under the kanban board', 'Stage-then-date sort (board + Island)', "Island's public tide chart"],
        dependencies: [], relatedLink: '#projects', created: now, updated: now
      },
      {
        id: 'goal-dividend-refresh', title: 'R6 · Quarterly dividend re-verify', status: 'backlog',
        outcome: 'Ex/pay dates in the private dividend calendar stay current with issuer announcements.',
        nextAction: 'Claude re-checks the eight payers against issuer IR pages next quarter.',
        milestones: ['Q4 2026 pass', 'Rebuild + recheck calendar'],
        dependencies: [], relatedLink: '#dividends', created: now, updated: now
      },
      {
        id: 'goal-launch-hardening', title: 'R11 · Launch hardening', status: 'backlog',
        outcome: 'Demo login revisited, BLUEPRINT §10 checklist run, custom domain attached.',
        nextAction: 'Schedule once the public pages exist; the fake login stays only while the page is a demo.',
        milestones: ['Demo login decision', 'QA checklist', 'piersonnorris.com CNAME'],
        dependencies: ['R7 shipped'], relatedLink: '#projects', created: now, updated: now
      },
      {
        id: 'goal-calendar', title: 'Private portfolio calendar', status: 'complete',
        outcome: 'Dividend dates and private planning beside the portfolio, with .ics export.',
        nextAction: 'Review dividend dates when a company announces its next distribution.',
        milestones: ['Six-week calendar view', 'Google Calendar handoff', 'Obsidian round trip'],
        dependencies: [], relatedLink: '#calendar', created: now, updated: now
      },
      {
        id: 'goal-charts-v1', title: 'Charts v1 — EMA, dividends, graph', status: 'complete',
        outcome: 'EMA 10/20/50/200 toggles, 12-month payout projection, demo mode, and the vault graph.',
        nextAction: 'Collect feedback; candlesticks/RSI only if v1 gets real use (R12).',
        milestones: ['EMA overlays + toggles', 'Payout projection', 'Fake demo login', 'Vault graph'],
        dependencies: [], relatedLink: '#charts', created: now, updated: now
      },
      {
        id: 'goal-charts-v2', title: 'Charts v2 — dividend markers + comparison', status: 'complete',
        outcome: 'Confirmed/estimated dividend markers on the price chart, plus a Compare toggle: up to 5 owned stocks, each normalized to 100 at the range start, with its own legend and hover tooltip.',
        nextAction: 'Portfolio-aggregate line, total-return toggle, and a benchmark stay parked until a dated transaction ledger exists — faking one off today\'s shares would misrepresent performance (see STOCK_CHART_PLAN.md).',
        milestones: ['Dividend markers (confirmed + backward-estimated)', 'PNCharts.compare()', 'Multi-select picker, 5-stock cap'],
        dependencies: [], relatedLink: '#charts', created: now, updated: now
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
        outcome: 'Needs re-scoping, found while working U8: updates.js is the wrong source for a PUBLIC last-updated stamp (it is the site\'s internal engineering changelog, not public-content history) — the tracker\'s own Updates tab already serves that purpose for the private/dev side.',
        nextAction: 'Decide what "last updated" should actually mean for a public page (last CONTENT.md revision? last Experience-page edit?) before building anything — don\'t just point this at updates.js.',
        milestones: ['Define what freshness means publicly', 'Pick a real source', 'Then build the stamp'],
        dependencies: [], relatedLink: '', created: now, updated: now
      },
      {
        id: 'goal-ui-stickycol', title: 'U10 · Sticky first column on wide tables', status: 'complete',
        outcome: 'The Holding name stays visible while scrolling a position row sideways on mobile.',
        nextAction: 'Platform tables now run 8 columns (Holding/Amount/Unit/Price/Value/Notes/Include/Details); make the first column position:sticky inside .tscroll.',
        milestones: ['Sticky CSS on td:first-child', 'Verify with real horizontal scroll', 'Check it in both light content states'],
        dependencies: [], relatedLink: '#positions', created: now, updated: now
      },
      {
        id: 'goal-ui-keyeye', title: 'U11 · Show/hide toggle on the API key field', status: 'complete',
        outcome: 'Pasting a market-data key lets you actually verify it before saving.',
        nextAction: 'The Price-source key input is a plain type=password with no reveal option; add an eye-icon toggle.',
        milestones: ['Eye-icon button', 'Toggle type password/text', 'Keep it keyboard-operable'],
        dependencies: [], relatedLink: '#charts', created: now, updated: now
      },
      {
        id: 'goal-ui-calendar-mobile', title: 'U12 · Compact agenda view for the calendar on mobile', status: 'backlog',
        outcome: 'Checking dividend dates on a phone no longer means scrolling a full month grid sideways.',
        nextAction: 'cal-board forces a 680px-min horizontal scroll on every screen; add a list/agenda layout under ~600px instead.',
        milestones: ['Design the agenda list', 'Swap in under a breakpoint', 'Keep the desktop grid untouched'],
        dependencies: [], relatedLink: '#calendar', created: now, updated: now
      },
      {
        id: 'goal-ui-skeletons', title: 'U13 · Loading skeletons instead of "Loading…" text', status: 'backlog',
        outcome: 'Charts and tables feel like they are actively working, not stalled, while data resolves.',
        nextAction: 'Replace plain loading copy in the Charts and Positions panels with a shimmering placeholder block.',
        milestones: ['One reusable skeleton component', 'Charts tab', 'Positions tab'],
        dependencies: [], relatedLink: '#charts', created: now, updated: now
      },
      {
        id: 'goal-ui-chartcontrols', title: 'U14 · Group the Charts tab’s control rows', status: 'complete',
        outcome: 'Ticker chips, range buttons, and EMA toggles read as three clear groups, not one dense stack.',
        nextAction: 'Add small section labels/spacing so the eye can separate "which stock" from "which range" from "which EMAs."',
        milestones: ['Label each row', 'Tighten spacing rules', 'Re-check on mobile'],
        dependencies: [], relatedLink: '#charts', created: now, updated: now
      },
      {
        id: 'goal-ui-emptystates', title: 'U15 · Friendlier empty states', status: 'complete',
        outcome: 'Checked all three before touching anything: the brand-new-vault state (Obsidian tab) really was plain text, so it got a small SVG icon. Calendar\'s per-day state and the Projects board\'s per-column state were already dashed-box/friendly-copy, not the bare text originally assumed — left those two alone rather than "fix" something that already worked.',
        nextAction: 'Done for the genuinely-plain case. Re-open only if the calendar/board empty states get real complaints.',
        milestones: ['Obsidian tab icon', 'Verify calendar/board were already fine'],
        dependencies: [], relatedLink: '#stocknotes', created: now, updated: now
      },
      {
        id: 'goal-ui-rowhover', title: 'U16 · Row-hover highlight on tracker tables', status: 'complete',
        outcome: 'Easier to track a row across many columns on a wide screen.',
        nextAction: 'Add a subtle background change on tr:hover across all tracker tables (positions, dividends).',
        milestones: ['One shared rule in site.css', 'Verify contrast still passes'],
        dependencies: [], relatedLink: '#positions', created: now, updated: now
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
        id: 'goal-pn-easter-egg', title: 'PN Tasks · Ship-in-a-bottle Obsidian Easter egg', status: 'backlog',
        outcome: 'A bottle-and-ship graphic (home and/or /notes/) pops its cork and frees the ship on click; clicking the ship opens a genuinely polished embedded Obsidian-vault viewer -- plus a similarly small-footprint, high-impact touch on the home page. Source: Pierce, Cowork chat with Claude, 2026-09-06.',
        nextAction: "Pierce picks a design direction (this overlaps R10 -- the viewer's look answers both) before Claude or ChatGPT builds anything.",
        milestones: ['Design direction chosen (ties to R10)', 'Bottle/cork/ship click interaction', 'Embedded Obsidian viewer UI', 'Matching home-page touch'],
        dependencies: ['R10 · Obsidian visual style', 'Pierce design direction'], relatedLink: '#projects', created: now, updated: now
      },
      {
        id: 'goal-pn-chart-v2-picks', title: 'PN Tasks · Chart V2 -- the two options left on the table', status: 'backlog',
        outcome: 'Four of the six drafted V2 customizations shipped (R14). Still Pierce\'s call: manual drag-to-reorder the sidebar (A-Z and Value may already cover it) and per-stock accent colors (comparison mode already auto-assigns distinguishable ones). Source: Pierce, Cowork chat with Claude, 2026-09-06.',
        nextAction: 'Neither gets built unless Pierce says the current behaviour actually annoys him. Also: click-test the shipped V2 -- nobody has looked at it in a browser yet.',
        milestones: ['Pierce click-tests candles/RSI/MACD/sort', 'Decide on drag-reorder', 'Decide on per-stock colors'],
        dependencies: ['Pierce picks'], relatedLink: '#charts', created: now, updated: now
      },
      {
        id: 'goal-chart-v2-customization', title: 'R14 · Chart V2 -- candles, RSI/MACD, sort, remembered prefs', status: 'complete',
        outcome: 'Candlestick chart type (falling back to the line when a provider returns closes only), RSI 14 and MACD 12/26/9 sub-panels stacked under the volume strip, an A-Z / Value sidebar sort, remembered display prefs per browser, note markers on tickers that already have an outlook written, and an opt-in underwater theme: an open treasure chest presiding over the KPI row with a gold-backed hoard panel of extra data below it.',
        nextAction: 'Pierce click-tests it: candles at each range, both oscillators on at once, and the sidebar under 760px. Verified so far by tests and code review only.',
        milestones: ['PNPrices.rsi/macd + charts.test.js', 'Candle rendering with OHLC fallback', 'RSI/MACD sub-panels + tooltip readout', 'Sort, prefs persistence, note markers', 'Underwater theme: chest over the KPIs, gold-backed hoard panel'],
        dependencies: [], relatedLink: '#charts', created: now, updated: now
      },
      {
        id: 'goal-chart-sidebar-notes', title: 'R13 · Chart-tab stock sidebar + inline outlook notes', status: 'complete',
        outcome: 'The Charts tab\'s stock picker is now a left-hand vertical list instead of a horizontal chip row. Each row has a notes icon that inline-expands a private per-ticker outlook note -- the same ticker-level note openTicker() and the Positions-tab .notebtn already use, so it is one note reachable from either place, and it still exports to Obsidian.',
        nextAction: 'Pierce click-tests it for real: the note field, symbol switching, and how the list stacks under 760px on mobile.',
        milestones: ['renderChartSidebar() + inline note markup', 'PNNotes.getTickerNote()/saveTickerNote()', 'Rebuilt + both test files pass', 'Grepped output for plaintext holdings -- zero hits'],
        dependencies: [], relatedLink: '#charts', created: now, updated: now
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
