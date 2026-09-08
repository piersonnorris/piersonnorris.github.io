#!/usr/bin/env node
'use strict';

/* ============================================================
   markdown.test.js — PNMarkdown.

   The escaping tests are the point. Everything else is convenience;
   those decide whether a note can write markup into a public page.

     node tools/tracker/markdown.test.js
   ============================================================ */

const assert = require('node:assert');
const path = require('node:path');

if (!global.window) global.window = {};
require(path.join(__dirname, '..', '..', 'assets', 'js', 'markdown.js'));
const md = global.window.PNMarkdown;

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log(`  ok  ${name}`); }
  catch (error) { console.error(`  FAIL ${name}\n       ${error.message}`); process.exitCode = 1; }
}

console.log('escaping — the part that matters');

test('a script tag in a note is shown, never executed', () => {
  const html = md.render('before <script>alert(1)</script> after');
  assert.ok(!html.includes('<script'), 'a live script tag survived');
  assert.ok(html.includes('&lt;script&gt;'));
});

test('an img onerror payload is inert', () => {
  const html = md.render('<img src=x onerror="alert(1)">');
  assert.ok(!/<img/i.test(html));
  assert.ok(html.includes('&lt;img'));
});

test('markup inside a heading, a table cell and a code fence is all escaped', () => {
  for (const src of ['# <b>hi</b>', '| a |\n| - |\n| <b>x</b> |', '```\n<b>x</b>\n```']) {
    assert.ok(!md.render(src).includes('<b>'), `leaked in: ${src}`);
  }
});

test('a javascript: link renders as text, not an anchor', () => {
  const html = md.render('[click](javascript:alert(1))');
  assert.ok(!html.includes('href'), 'javascript: became an href');
  assert.ok(html.includes('click'));
});

test('a data: link renders as text too', () => {
  assert.ok(!md.render('[x](data:text/html,<script>1</script>)').includes('href'));
});

test('http, mailto and site-relative links are allowed through', () => {
  assert.match(md.render('[a](https://example.com)'), /href="https:\/\/example\.com" rel="noopener"/);
  assert.match(md.render('[b](mailto:a@b.c)'), /href="mailto:a@b\.c"/);
  assert.match(md.render('[c](/notes/)'), /href="\/notes\/"/);
});

test('quotes in text cannot break out of an attribute', () => {
  assert.ok(!md.render('say "hi" here').includes('"hi"'));
});

console.log('\nblocks');

test('headings carry slug ids, and can be asked not to', () => {
  assert.match(md.render('## The Plan, part 2'), /<h2 id="the-plan-part-2">/);
  assert.ok(!md.render('## X', { headingIds: false }).includes('id='));
});

test('paragraphs, rules and hard breaks', () => {
  assert.match(md.render('one\n\ntwo'), /<p>one<\/p>\n<p>two<\/p>/);
  assert.match(md.render('---'), /<hr>/);
  assert.match(md.render('a  \nb'), /<br>/);
});

test('bullet and ordered lists', () => {
  assert.match(md.render('- a\n- b'), /<ul><li>.*a.*<\/li><li>.*b.*<\/li><\/ul>/s);
  assert.match(md.render('1. a\n2. b'), /<ol>/);
});

test('task checkboxes render checked and unchecked', () => {
  const html = md.render('- [ ] open\n- [x] done');
  assert.match(html, /md-task"/);
  assert.match(html, /md-task done"/);
});

test('a fenced block keeps its language and its literal body', () => {
  const html = md.render('```js\nvar a = 1;\n```');
  assert.match(html, /data-lang="js"/);
  assert.match(html, /var a = 1;/);
});

test('a table renders a head, a body and its alignment', () => {
  const html = md.render('| a | b |\n| :- | --: |\n| 1 | 2 |');
  assert.match(html, /<thead>.*<th>a<\/th>/s);
  assert.match(html, /<td style="text-align:right">2<\/td>/);
  assert.ok(!html.includes(':-'), 'the alignment row leaked into the table body');
});

test('a blockquote, and an Obsidian callout with its own title', () => {
  assert.match(md.render('> quoted'), /<blockquote>/);
  const call = md.render('> [!warning] Careful\n> body');
  assert.match(call, /md-callout-warning/);
  assert.match(call, /Careful/);
});

console.log('\ninline');

test('bold, italic, strike and highlight', () => {
  assert.match(md.render('**b**'), /<strong>b<\/strong>/);
  assert.match(md.render('an *i* here'), /<em>i<\/em>/);
  assert.match(md.render('~~s~~'), /<del>s<\/del>/);
  assert.match(md.render('==h=='), /<mark>h<\/mark>/);
});

test('emphasis inside a code span stays literal', () => {
  const html = md.render('use `a *b* c` here');
  assert.ok(!html.includes('<em>'), 'a code span was marked up');
  assert.match(html, /<code>a \*b\* c<\/code>/);
});

test('a bare number in prose is never mistaken for a code span', () => {
  /* the placeholder bug this renderer was rewritten to avoid */
  const html = md.render('there were 3 of them and `x` besides');
  assert.match(html, /there were 3 of them/);
  assert.match(html, /<code>x<\/code>/);
});

test('an underscore inside a word is not emphasis', () => {
  assert.ok(!md.render('vault_public_js name').includes('<em>'));
});

console.log('\nwikilinks');

test('a resolved wikilink becomes an anchor; an alias sets the label', () => {
  const opts = { resolve: (t) => ({ href: '#' + t.toLowerCase() }) };
  assert.match(md.render('see [[Roadmap]]', opts), /<a class="md-wl" href="#roadmap">Roadmap<\/a>/);
  assert.match(md.render('see [[Roadmap|the plan]]', opts), />the plan</);
});

test('an unresolved wikilink is marked broken, not linked', () => {
  const html = md.render('see [[Ghost]]', { resolve: () => ({ missing: true }) });
  assert.match(html, /md-broken/);
  assert.ok(!html.includes('<a '), 'a missing note got a live link');
});

test('with no resolver at all, a wikilink is plain text', () => {
  const html = md.render('see [[X]]');
  assert.ok(!html.includes('<a '));
  assert.match(html, /X/);
});

test('an image is described, never fetched', () => {
  const html = md.render('![a photo](https://evil.example/x.png)');
  assert.ok(!/<img/i.test(html), 'the page would fetch a note-supplied URL');
  assert.match(html, /md-img/);
});

console.log('\noutline');

test('outline lists headings with levels and ids, and renders nothing', () => {
  assert.deepStrictEqual(md.outline('# A\ntext\n### B'), [
    { level: 1, text: 'A', id: 'a' },
    { level: 3, text: 'B', id: 'b' }
  ]);
});

console.log('\nreal documents');

test('every published note renders without throwing, and none emits a script tag', () => {
  let bundle;
  try {
    require(path.join(__dirname, '..', '..', 'assets', 'data', 'vault-public.js'));
    bundle = global.window.PNVaultPublic;
  } catch { console.log('       (no vault-public.js yet — skipped)'); return; }
  assert.ok(bundle.notes.length, 'bundle has no notes');
  /* Checked as constructs, not as substrings: a doc that *writes about*
     javascript: hrefs (docs/ROADMAP.md does) is not itself unsafe, and a
     test that cannot tell the difference gets switched off the first
     time someone documents the defence. */
  for (const note of bundle.notes) {
    const html = md.render(note.body, { resolve: () => ({ href: '#x' }) });
    assert.ok(!/<(script|iframe|img|object|embed|style)\b/i.test(html), `live tag emitted from ${note.path}`);
    assert.ok(!/\son\w+\s*=/i.test(html), `event-handler attribute emitted from ${note.path}`);
    assert.ok(!/href="\s*(javascript|data|vbscript):/i.test(html), `dangerous href emitted from ${note.path}`);
  }
});

console.log(`\n${passed} passed${process.exitCode ? ', with failures above' : ''}`);
