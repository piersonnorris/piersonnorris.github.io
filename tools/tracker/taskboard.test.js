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
  assert.equal(seeded.length, 4);
  assert.equal(seeded.filter((goal) => goal.status === 'complete').length, 2);

  const moved = board.move(seeded, 'goal-brokerage', 1);
  assert.equal(moved.find((goal) => goal.id === 'goal-brokerage').status, 'planned');
  const stats = board.metrics(moved, '2026-09-05');
  assert.equal(stats.total, 4);
  assert.equal(stats.complete, 2);

  const markdown = window.PNVault.toMarkdown({
    title: 'Portfolio project board', noteType: 'portfolio-project-board',
    projectGoals: moved, tags: ['portfolio', 'projects'], body: 'Private project notes.',
    created: '2026-09-05T00:00:00Z', updated: '2026-09-05T00:00:00Z'
  });
  assert.match(markdown, /project_goals_json:/);
  assert.match(markdown, /## Portfolio project board/);
  const roundTrip = window.PNVault.fromMarkdown(markdown, 'Fallback');
  assert.equal(roundTrip.noteType, 'portfolio-project-board');
  assert.equal(roundTrip.projectGoals.length, 4);
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
  assert.equal(envelope.includes('Read-only brokerage connection'), false);
  vault.lock();
  await vault.unlock('test-pin');
  assert.equal(vault.list()[0].projectGoals.length, 4);

  console.log('Private portfolio taskboard tests: OK');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
