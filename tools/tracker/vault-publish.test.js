#!/usr/bin/env node
'use strict';

/* ============================================================
   vault-publish.test.js — the publish gate on obsidian-sync.js.

   These are the tests that matter most in the repo, because the thing
   they guard is irreversible: a note that reaches assets/data/ and gets
   pushed is public permanently, git history included. Every assertion
   here is "would this note have leaked?"

     node tools/tracker/vault-publish.test.js
   ============================================================ */

const assert = require('node:assert');
const {
  excludedBecause, scan, linkPaths, toPublicBundle, SCRUB_RULES
} = require('../obsidian-sync.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log(`  ok  ${name}`); }
  catch (error) { console.error(`  FAIL ${name}\n       ${error.message}`); process.exitCode = 1; }
}

function note(over) {
  return Object.assign({
    path: 'notes/a.md', title: 'A', body: 'text', tags: [],
    created: '2026-01-01T00:00:00.000Z', updated: '2026-01-01T00:00:00.000Z'
  }, over);
}
function bundleOf(notes) {
  return { source: 'Vault', generatedAt: '2026-09-08T00:00:00.000Z', notes };
}

console.log('the opt-outs');

test('a note with no opinion publishes — default is publish', () => {
  assert.strictEqual(excludedBecause(note()), null);
});

test('publish: false holds a note back', () => {
  assert.match(excludedBecause(note({ publish: false })), /publish: false/);
});

test('publish: true is not an opt-out', () => {
  assert.strictEqual(excludedBecause(note({ publish: true })), null);
});

test('#private and its synonyms hold a note back', () => {
  for (const tag of ['private', 'nopublish', 'no-publish', 'secret', 'PRIVATE']) {
    assert.ok(excludedBecause(note({ tags: ['work', tag] })), `${tag} should exclude`);
  }
});

test('a tag that merely contains "private" does not', () => {
  assert.strictEqual(excludedBecause(note({ tags: ['privateequity'] })), null);
});

test('a nopublish/ or private/ folder holds a whole tree back', () => {
  assert.ok(excludedBecause(note({ path: 'nopublish/x.md' })));
  assert.ok(excludedBecause(note({ path: 'a/private/deep/x.md' })));
});

test('a folder merely starting with those letters does not', () => {
  assert.strictEqual(excludedBecause(note({ path: 'privateer/x.md' })), null);
});

console.log('\nthe scrubber');

test('catches the CONTENT.md §7 shapes', () => {
  const cases = {
    money:   'the account is worth $12,400.50 today',
    shares:  'bought 140 shares last week',
    phone:   'call him on 555-867-5309',
    address: 'met at 1400 North Elm Street',
    /* Assembled at runtime rather than written out: a realistic-looking
       token literal in a tracked file trips GitHub's push protection,
       which cannot tell a test fixture from a live key. It shouldn't
       have to — so don't write one. */
    secret:  'key=' + 'k7Qz'.repeat(9)
  };
  for (const [rule, body] of Object.entries(cases)) {
    const hits = scan([note({ body })]);
    assert.ok(hits.some((h) => h.rule === rule), `${rule} not caught in: ${body}`);
  }
});

test('reports where, and never what — a hit carries no matched text', () => {
  const hits = scan([note({ body: 'line one\nworth $9,999 here' })]);
  assert.strictEqual(hits[0].line, 2, 'should point at line 2');
  assert.strictEqual(hits[0].path, 'notes/a.md');
  assert.ok(!JSON.stringify(hits).includes('9,999'), 'the hit must not echo the number');
});

test('ordinary prose is clean', () => {
  assert.deepStrictEqual(scan([note({ body: 'Ran the loop again and it passed. See [[Roadmap]].' })]), []);
});

test('a blocklisted name is caught case-insensitively', () => {
  const hits = scan([note({ body: 'invoice for Acme Roofing' })], { terms: ['acme roofing'] });
  assert.strictEqual(hits.length, 1);
  assert.strictEqual(hits[0].rule, 'blocklist');
});

test('one blocklist hit per line, not one per term', () => {
  const hits = scan([note({ body: 'Acme and Beta together' })], { terms: ['acme', 'beta'] });
  assert.strictEqual(hits.length, 1);
});

test('--waive skips exactly the named rule and nothing else', () => {
  const body = 'costs $40 and 12 shares';
  assert.ok(scan([note({ body })], { waive: ['money'] }).every((h) => h.rule !== 'money'));
  assert.ok(scan([note({ body })], { waive: ['money'] }).some((h) => h.rule === 'shares'));
});

test('every rule has an id and a human label', () => {
  for (const rule of SCRUB_RULES) {
    assert.ok(rule.id && rule.label && rule.re instanceof RegExp, `bad rule: ${rule.id}`);
  }
});

console.log('\npublish-time link resolution');

test('an inline-code path becomes a wikilink to that note', () => {
  const notes = [note({ path: 'docs/a.md', title: 'A', body: 'see `docs/b.md` for more' }),
                 note({ path: 'docs/b.md', title: 'B', body: 'x' })];
  assert.strictEqual(linkPaths(notes), 1);
  assert.match(notes[0].body, /\[\[B\]\]/);
});

test('the basename and the extensionless form both resolve', () => {
  const notes = [note({ path: 'a.md', title: 'A', body: 'see `b.md` and `docs/b`' }),
                 note({ path: 'docs/b.md', title: 'B', body: 'x' })];
  assert.strictEqual(linkPaths(notes), 2);
});

test('a path that is not a published note is left exactly as it was', () => {
  const notes = [note({ body: 'run `tools/build.js` first' })];
  assert.strictEqual(linkPaths(notes), 0);
  assert.match(notes[0].body, /`tools\/build\.js`/);
});

test('a note does not link to itself', () => {
  const notes = [note({ path: 'a.md', title: 'A', body: 'this is `a.md`' })];
  assert.strictEqual(linkPaths(notes), 0);
});

test('code that spans lines is untouched — only single-line inline code is rewritten', () => {
  const notes = [note({ path: 'a.md', title: 'A', body: '```\ndocs/b.md\n```' }),
                 note({ path: 'docs/b.md', title: 'B', body: 'x' })];
  assert.strictEqual(linkPaths(notes), 0);
});

console.log('\nthe bundle');

test('excluded notes are absent from the output, with a reason recorded', () => {
  const out = toPublicBundle(bundleOf([
    note({ path: 'keep.md', title: 'Keep' }),
    note({ path: 'drop.md', title: 'Drop', publish: false })
  ]));
  assert.strictEqual(out.bundle.count, 1);
  assert.strictEqual(out.bundle.notes[0].title, 'Keep');
  assert.strictEqual(out.dropped.length, 1);
  assert.match(out.dropped[0].why, /publish: false/);
  assert.ok(!JSON.stringify(out.bundle).includes('Drop'), 'a held-back note must not appear anywhere in the bundle');
});

test('the public format is not the private one', () => {
  const out = toPublicBundle(bundleOf([note()]));
  assert.strictEqual(out.bundle.format, 'pn-vault-public');
});

test('only the whitelisted fields survive — no stray vault metadata rides along', () => {
  const out = toPublicBundle(bundleOf([note({ ticker: 'XYZ', outlook: 'secret thesis', sourcePath: 'C:/Users/x' })]));
  assert.deepStrictEqual(
    Object.keys(out.bundle.notes[0]).sort(),
    ['body', 'created', 'folder', 'path', 'tags', 'title', 'updated']
  );
  assert.ok(!JSON.stringify(out.bundle).includes('secret thesis'));
});

test('folder is derived from the path, and root notes get an empty one', () => {
  const out = toPublicBundle(bundleOf([note({ path: 'a/b/c.md' }), note({ path: 'top.md' })]));
  assert.strictEqual(out.bundle.notes[0].folder, 'a/b');
  assert.strictEqual(out.bundle.notes[1].folder, '');
});

test('waived rules are recorded in the bundle, so the page can admit it', () => {
  const out = toPublicBundle(bundleOf([note()]), { waive: ['money'] });
  assert.deepStrictEqual(out.bundle.waived, ['money']);
});

test('--no-link-paths leaves bodies alone and reports zero', () => {
  const out = toPublicBundle(bundleOf([
    note({ path: 'a.md', title: 'A', body: 'see `b.md`' }), note({ path: 'b.md', title: 'B' })
  ]), { linkPaths: false });
  assert.strictEqual(out.bundle.linkedPaths, 0);
  assert.match(out.bundle.notes[0].body, /`b\.md`/);
});

test('a held-back note is not a link target — its path stays inline code', () => {
  const out = toPublicBundle(bundleOf([
    note({ path: 'a.md', title: 'A', body: 'see `secret.md`' }),
    note({ path: 'secret.md', title: 'Secret', publish: false })
  ]));
  assert.strictEqual(out.bundle.linkedPaths, 0);
  assert.ok(!JSON.stringify(out.bundle).includes('Secret'));
});

console.log(`\n${passed} passed${process.exitCode ? ', with failures above' : ''}`);
