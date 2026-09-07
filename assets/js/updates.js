/* ============================================================
   PNUpdates — the changelog + timeline data for the tracker's
   Updates tab. Data only; the tracker renders it.

   Maintained by hand by all three collaborators (Pierce, Claude,
   ChatGPT): append an entry whenever something ships or the plan
   moves. Newest first. Keep entries short — the roadmap
   (docs/ROADMAP.md) holds the depth.

   Entry shape:
     date   'YYYY-MM-DD' (planned items may use '' + when text)
     tag    'shipped' | 'data' | 'planned'
     title  one line
     detail one or two sentences
     link   optional '#panel' hash inside the tracker
   ============================================================ */
(function (global) {
  'use strict';

  var entries = [
    {
      date: '2026-09-07', tag: 'shipped',
      title: 'Obsidian connectivity: vault graph + a real-vault sync (R15)',
      detail: 'A Graph button in the notes toolbar draws the vault as a force-directed map — orphans and unresolved [[wikilinks]] are counted separately, and clicking an unresolved node writes that note. tools/obsidian-sync.js reads a real Obsidian folder into one importable bundle that updates notes by vault path instead of duplicating them; build.js can bake it into the encrypted payload.',
      link: '#stocknotes'
    },
    {
      date: '2026-09-07', tag: 'shipped',
      title: 'Stay unlocked on this device',
      detail: 'Opt-in checkbox on the PIN screen. The PIN is the decryption key, so it is remembered rather than removed: a non-extractable AES-GCM key generated in the browser lives in IndexedDB, and the PIN is stored encrypted under it — never in the clear, never off this device. A data rebuild reseals the payload under a new salt and retires the saved unlock; pressing Lock deletes it.'
    },
    {
      date: '2026-09-06', tag: 'shipped',
      title: 'Underwater skin now covers the whole tracker',
      detail: 'Positions, Dividends, Calendar, Projects, Updates and Obsidian all repaint with the Charts tab instead of leaving it stranded on one panel. Mostly a token swap on <body>, since the tracker already runs on the site\'s CSS variables. Gain/loss colours stay put in both skins, and the toggle moved to the header beside Lock.',
      link: '#positions'
    },
    {
      date: '2026-09-06', tag: 'shipped',
      title: 'Underwater theme for the Charts tab',
      detail: 'Opt-in skin (Theme: Deep / Underwater). Ocean ground with drifting caustics and bubbles, an open treasure chest presiding over the range figures, and a gold-backed "hoard" panel below carrying what the KPI row has no room for — including cost basis and P/L summed from that symbol\'s purchase journals. Repaints only; it never changes a number.',
      link: '#charts'
    },
    {
      date: '2026-09-06', tag: 'shipped',
      title: 'Chart V2 — candles, RSI/MACD, sort, remembered prefs (R14)',
      detail: 'Candlestick chart type (falls back to the line when a provider returns closes only), RSI 14 and MACD 12/26/9 sub-panels under the volume strip, an A-Z / Value sidebar sort, and display prefs that survive a re-lock. Closes out R12\'s "chart indicators v2."',
      link: '#charts'
    },
    {
      date: '2026-09-06', tag: 'shipped',
      title: 'Chart-tab stock sidebar with inline notes (R13)',
      detail: 'The stock picker became a left-hand vertical list; each row has a notes icon that inline-expands a private per-ticker outlook note — the same note the Positions tab and the Obsidian vault already reach, just one more door into it.',
      link: '#charts'
    },
    {
      date: '2026-09-06', tag: 'shipped',
      title: 'First tests for the chart maths and markup',
      detail: 'tools/tracker/charts.test.js covers EMA/RSI/MACD alignment and identities, plus a guard that walks the Charts panel\'s div depth in both themes. BLUEPRINT §10 asked for chart fixtures and there were none; it immediately caught a real bug where the remembered range silently fell back to 3M.',
      link: '#charts'
    },
    {
      date: '2026-09-06', tag: 'shipped',
      title: 'Crawl kit: sitemap.xml, OG tags, honest llms.txt',
      detail: 'robots.txt had promised a sitemap that never existed — added one for the three live pages. Experience and Island got the OG/Twitter tags Home already had, and llms.txt now separates live pages from the ones still pending R4/R7 instead of listing them as if they shipped.'
    },
    {
      date: '2026-09-06', tag: 'shipped',
      title: 'PN Tasks — a standing queue for Pierce\'s calls',
      detail: 'docs/ROADMAP.md §5 collects open questions Claude or ChatGPT can\'t resolve alone, plus ideas needing his decision, each with a Source line. Mirrored to TASKS.md and the board seed.',
      link: '#projects'
    },
    {
      date: '2026-09-06', tag: 'data',
      title: 'September 2026 tab is live in the tracker',
      detail: 'Rebuilt from Pierce\'s "Early September" dictation — 48 positions, several trims and adds confirmed (DEFT 949→100, RR up, new EIX/VPG, NVDA call closed). Month switcher and value-over-time chart now show two points.',
      link: '#positions'
    },
    {
      date: '', when: 'soon', tag: 'planned',
      title: 'Robinhood MCP price feed (R1)',
      detail: 'Pierce is standing up the MCP backend; builds will then bake broker-fed read-only quotes instead of Twelve Data.',
      link: '#charts'
    },
    {
      date: '', when: 'soon', tag: 'planned',
      title: 'Daily automated refresh (R2)',
      detail: 'GitHub Actions secrets flip on the scheduled rebuild — the tracker reseals itself every morning without anyone running a command.'
    },
    {
      date: '', when: 'blocked', tag: 'planned',
      title: 'Public pages: About · Projects · Contact (R7)',
      detail: 'ChatGPT builds from CONTENT.md once the seven open content decisions (R4) are answered.'
    },
    {
      date: '2026-09-05', tag: 'shipped',
      title: 'Live prices baked into the build (R5)',
      detail: 'build.js now prices all 26 held symbols via Twelve Data at build time and seals the quotes into the encrypted payload — value charts need zero browser API calls.',
      link: '#charts'
    },
    {
      date: '2026-09-05', tag: 'shipped',
      title: 'Shared roadmap, READMEs, and board seed',
      detail: 'docs/ROADMAP.md became the canonical task list for Pierce + Claude + ChatGPT; the Projects board mirrors it; module READMEs landed.',
      link: '#projects'
    },
    {
      date: '2026-09-05', tag: 'shipped',
      title: 'EMA overlays, payout projection, demo login, vault graph',
      detail: 'EMA 10/20/50/200 with toggles on the price chart, a 12-month dividend payout projection, the deliberate fake-login demo mode, and the force-directed vault graph on the Projects tab.',
      link: '#charts'
    },
    {
      date: '2026-09-05', tag: 'shipped',
      title: 'Portfolio calendar + project task board',
      detail: 'Month-grid calendar with dividend events, private planning, and .ics export; five-stage encrypted project board with Obsidian round-trip.',
      link: '#calendar'
    },
    {
      date: '2026-09-05', tag: 'shipped',
      title: 'Dividend tracker + Obsidian sync',
      detail: 'Researched ex/pay dates for the eight payers, editable per-symbol payouts, and one-click sync into the encrypted stock vault.',
      link: '#dividends'
    },
    {
      date: '2026-09-05', tag: 'data',
      title: 'August 2026 verified against the Sheet',
      detail: 'Every August row in the sealed payload matches the "August 2026" tab line for line.',
      link: '#positions'
    },
    {
      date: '2026-09-05', tag: 'shipped',
      title: 'PIN-gated encrypted tracker + experience timeline rebuild',
      detail: 'AES-256-GCM payload with in-browser decryption went live, and the public experience timeline was rebuilt with the True North and Screencastify detail.'
    },
    {
      date: '2026-08-23', tag: 'shipped',
      title: 'Site scaffold live',
      detail: 'Repo, GitHub Pages, blueprint, content doc, and the AI-crawlability kit — the starting line.'
    }
  ];

  function fmtDate(entry) {
    if (!entry.date) return entry.when || 'planned';
    var d = new Date(entry.date + 'T12:00:00');
    return isFinite(d.getTime())
      ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : entry.date;
  }

  global.PNUpdates = { entries: entries, fmtDate: fmtDate };
})(window);
