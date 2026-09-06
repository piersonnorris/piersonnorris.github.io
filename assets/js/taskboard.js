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

  function seed() {
    var now = new Date().toISOString();
    return normalize([
      {
        id: 'goal-calendar', title: 'Private portfolio calendar', status: 'complete',
        outcome: 'See dividend dates and private planning beside the portfolio.',
        nextAction: 'Review dividend dates when a company announces its next distribution.',
        milestones: ['Six-week calendar view', 'Google Calendar handoff', 'Obsidian round trip'],
        dependencies: [], relatedLink: '#calendar', created: now, updated: now
      },
      {
        id: 'goal-taskboard', title: 'Portfolio project task board', status: 'complete',
        outcome: 'Keep investment-tool goals, milestones, blockers, and next actions in one private view.',
        nextAction: 'Review the seeded board and add the next personal goal.',
        milestones: ['Five-stage board', 'Goal editor', 'Encrypted Obsidian export'],
        dependencies: [], relatedLink: '#projects', created: now, updated: now
      },
      {
        id: 'goal-calendar-sync', title: 'Two-way Google Calendar sync', status: 'planned',
        outcome: 'Keep approved portfolio events synchronized without exposing calendar tokens.',
        nextAction: 'Choose a private OAuth backend and define one-way versus two-way scope.',
        milestones: ['OAuth design', 'Token storage review', 'Sync conflict policy'],
        dependencies: ['Private backend', 'Google OAuth credentials'], relatedLink: '#calendar', created: now, updated: now
      },
      {
        id: 'goal-brokerage', title: 'Read-only brokerage connection', status: 'backlog',
        outcome: 'Import positions and transactions without granting trading permission.',
        nextAction: 'Evaluate supported read-only connectors and document data coverage.',
        milestones: ['Connector comparison', 'Security review', 'Position normalization'],
        dependencies: ['Approved read-only provider'], relatedLink: '#positions', created: now, updated: now
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
