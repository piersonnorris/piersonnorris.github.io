'use strict';

const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');

global.window = {};
if (!global.crypto) Object.defineProperty(global, 'crypto', { value: webcrypto });
require('../../assets/js/taskboard.js');
require('../../assets/js/vault.js');

async function main() {
  const board = window.PNTaskboard;
  const seeded = board.seed();
  /* The seed mirrors docs/ROADMAP.md, so assert its shape rather than a
     magic count: goals exist, every one is fully formed, at least one is
     complete, and every status is a real column. */
  assert.ok(seeded.length >= 4);
  assert.ok(seeded.filter((goal) => goal.status === 'complete').length >= 1);
  const columnIds = board.columns.map((column) => column.id);
  for (const goal of seeded) {
    assert.ok(goal.id && goal.title && goal.nextAction, `goal ${goal.id} is incomplete`);
    assert.ok(columnIds.includes(goal.status), `goal ${goal.id} has unknown status ${goal.status}`);
  }

  /* Move an arbitrary real goal one column right and check it landed one
     step past wherever the seed currently has it — derived, not a magic
     status string, so this keeps passing as seed content changes (it
     mirrors docs/ROADMAP.md and shifts over time). */
  const beforeStatus = seeded.find((goal) => goal.id === 'goal-calendar-sync').status;
  const expectedIndex = Math.min(columnIds.length - 1, columnIds.indexOf(beforeStatus) + 1);
  const moved = board.move(seeded, 'goal-calendar-sync', 1);
  assert.equal(moved.find((goal) => goal.id === 'goal-calendar-sync').status, columnIds[expectedIndex]);
  const stats = board.metrics(moved, '2026-09-05');
  assert.equal(stats.total, seeded.length);
  assert.equal(stats.complete, seeded.filter((goal) => goal.status === 'complete').length);

  const markdown = window.PNVault.toMarkdown({
    title: 'Portfolio project board', noteType: 'portfolio-project-board',
    projectGoals: moved, tags: ['portfolio', 'projects'], body: 'Private project notes.',
    created: '2026-09-05T00:00:00Z', updated: '2026-09-05T00:00:00Z'
  });
  assert.match(markdown, /project_goals_json:/);
  assert.match(markdown, /## Portfolio project board/);
  const roundTrip = window.PNVault.fromMarkdown(markdown, 'Fallback');
  assert.equal(roundTrip.noteType, 'portfolio-project-board');
  assert.equal(roundTrip.projectGoals.length, seeded.length);
  assert.equal(roundTrip.body.trim(), 'Private project notes.');

  const storage = new Map();
  global.localStorage = {
    getItem: (key) => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key)
  };
  const vault = new window.PNVault.Vault('taskboard-test');
  await vault.unlock('test-pin');
  await vault.create_note({ title: 'Portfolio project board', noteType: 'portfolio-project-board', projectGoals: moved });
  const envelope = storage.get('pn.vault.taskboard-test');
  assert.ok(envelope);
  /* goal titles must be ciphertext in storage, never plaintext */
  assert.equal(envelope.includes(seeded[0].title), false);
  vault.lock();
  await vault.unlock('test-pin');
  assert.equal(vault.list()[0].projectGoals.length, seeded.length);

  console.log('Private portfolio taskboard tests: OK');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
