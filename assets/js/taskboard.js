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
        id: 'goal-handoff', title: 'R3 · Next investment handoff file', status: 'in-progress',
        outcome: 'Fresh month tab in the Sheet, refreshed private snapshot, rebuilt tracker.',
        nextAction: 'Pierce passes the file; Claude refreshes STOCK_HANDOFF.md and rebuilds.',
        milestones: ['September tab created', 'Snapshot refreshed', 'Month switcher shows two months'],
        dependencies: ['File from Pierce'], relatedLink: '#positions', created: now, updated: now
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
        id: 'goal-calendar-sync', title: 'R9 · Two-way Google Calendar sync', status: 'backlog',
        outcome: 'Keep approved portfolio events synchronized without exposing calendar tokens.',
        nextAction: 'Choose a private OAuth backend and define one-way versus two-way scope.',
        milestones: ['OAuth design', 'Token storage review', 'Sync conflict policy'],
        dependencies: ['Private backend', 'Google OAuth credentials'], relatedLink: '#calendar', created: now, updated: now
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
      }
    ]);
  }

  global.PNTaskboard = {
    columns: COLUMNS,
    normalize: normalize,
    metrics: metrics,
    move: move,
    seed: seed
  };
})(window);
