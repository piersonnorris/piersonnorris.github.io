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
