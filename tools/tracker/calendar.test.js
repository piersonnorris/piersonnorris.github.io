'use strict';

const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');

global.window = {};
if (!global.crypto) Object.defineProperty(global, 'crypto', { value: webcrypto });
require('../../assets/js/calendar.js');
require('../../assets/js/vault.js');

async function main() {
  const calendar = window.PNCalendar;
  const cells = calendar.monthCells('2026-09-01', new Date(2026, 8, 5, 12));
  assert.equal(cells.length, 42);
  assert.equal(cells[0].key, '2026-08-30');
  assert.equal(cells[41].key, '2026-10-10');
  assert.equal(cells.filter((cell) => cell.isToday).length, 1);

  const events = calendar.normalize([
    { id: 'review-1', date: '2026-09-15', title: 'Allocation review', kind: 'review', notes: 'Check targets.' },
    { id: 'bad', date: '', title: 'Invalid event' }
  ]);
  assert.equal(events.length, 1);
  assert.equal(calendar.upcoming(events, '2026-09-01', 30).length, 1);
  assert.equal(calendar.upcoming(events, '2026-09-16', 30).length, 0);

  const ics = calendar.toIcs(events, 'Private portfolio calendar');
  assert.match(ics, /DTSTART;VALUE=DATE:20260915/);
  assert.match(ics, /DTEND;VALUE=DATE:20260916/);
  assert.match(ics, /SUMMARY:Allocation review/);
  assert.match(calendar.googleUrl(events[0]), /^https:\/\/calendar\.google\.com\/calendar\/render\?/);

  const markdown = window.PNVault.toMarkdown({
    title: 'Portfolio calendar', noteType: 'portfolio-calendar',
    calendarEvents: events,
    dividendOverrides: { TEST: { payDate: '2026-09-20' } },
    tags: ['portfolio', 'calendar'], body: 'Private calendar note.',
    created: '2026-09-01T00:00:00Z', updated: '2026-09-01T00:00:00Z'
  });
  const roundTrip = window.PNVault.fromMarkdown(markdown, 'Fallback');
  assert.equal(roundTrip.noteType, 'portfolio-calendar');
  assert.equal(roundTrip.calendarEvents.length, 1);
  assert.equal(roundTrip.dividendOverrides.TEST.payDate, '2026-09-20');
  assert.equal(roundTrip.body.trim(), 'Private calendar note.');

  const storage = new Map();
  global.localStorage = {
    getItem: (key) => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key)
  };
  const vault = new window.PNVault.Vault('calendar-test');
  await vault.unlock('test-pin');
  await vault.create_note({
    title: 'Portfolio calendar', noteType: 'portfolio-calendar',
    calendarEvents: events, dividendOverrides: {}, body: 'Secret reminder.'
  });
  const envelope = storage.get('pn.vault.calendar-test');
  assert.ok(envelope);
  assert.equal(envelope.includes('Secret reminder'), false);
  assert.equal(envelope.includes('Allocation review'), false);
  vault.lock();
  await vault.unlock('test-pin');
  assert.equal(vault.list()[0].calendarEvents[0].title, 'Allocation review');

  console.log('Private portfolio calendar tests: OK');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
