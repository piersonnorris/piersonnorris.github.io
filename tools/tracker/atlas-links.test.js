'use strict';

/* The atlas sky (/atlas/) draws one line per [[wikilink]] between its
   notes, and the page says out loud that those lines are resolved "the
   same way PNGraphify resolves them for the vault". That is a claim about
   two separate implementations agreeing, so it is worth a test.

   atlas-ui.js cannot simply call PNGraphify.build(): the sky needs
   positions, degrees and undirected pairs, not the engine's node/edge
   model, and the page deliberately does not load the graph engine at all.
   So it carries its own copy of the code-span-aware wikilink scan. This
   test pins the two together: same pairs, same unresolved count. If
   someone edits atlas-data.js and breaks a link — or fixes the engine and
   forgets the atlas — this fails instead of the page quietly lying.

   It also holds the four numbers the page prints in the sand, so a data
   edit that strands a note shows up here rather than on the site. */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');

global.window = global;
require(path.join(ROOT, 'assets/js/notes-graph.js'));
require(path.join(ROOT, 'assets/js/atlas-data.js'));

const notes = global.PNAtlasData.notes;
const { wikiTargets: engineTargets } = global.PNGraphify;

const key = (s) => String(s == null ? '' : s).trim().toLowerCase();

const byTitle = {};
notes.forEach((n) => { byTitle[key(n.title)] = n; });

/* Pull atlas-ui.js's own wikiTargets out of the file and run it here. The
   file is an IIFE that touches the DOM on load, so it cannot be required —
   but the one function under test is self-contained apart from byTitle and
   key, which are passed in. */
function atlasTargets() {
  const src = fs.readFileSync(path.join(ROOT, 'assets/js/atlas-ui.js'), 'utf8');
  const m = src.match(/function wikiTargets\(body\) \{[\s\S]*?\n  \}/);
  assert.ok(m, 'atlas-ui.js should still define wikiTargets(body)');
  return new Function('byTitle', 'key', m[0] + '; return wikiTargets;')(byTitle, key);
}

/* Unique undirected pairs, the way the sky counts a line: two notes that
   link to each other are one line, not two. */
function pairsFrom(targetsOf) {
  const pairs = new Set();
  let unresolved = 0;
  notes.forEach((n) => {
    const seen = new Set();
    targetsOf(n).forEach((title) => {
      const k = key(title);
      if (seen.has(k)) return;
      seen.add(k);
      const target = byTitle[k];
      if (!target) { unresolved += 1; return; }
      if (target.id === n.id) return;
      pairs.add(n.id < target.id ? n.id + '|' + target.id : target.id + '|' + n.id);
    });
  });
  return { pairs, unresolved };
}

function main() {
  const uiTargets = atlasTargets();

  const engine = pairsFrom((n) => engineTargets(n.body));
  const ui = pairsFrom((n) => uiTargets(n.body).map((l) => l.title));

  const onlyUI = [...ui.pairs].filter((p) => !engine.pairs.has(p));
  const onlyEngine = [...engine.pairs].filter((p) => !ui.pairs.has(p));

  assert.deepEqual(onlyUI, [], 'atlas-ui.js drew lines PNGraphify does not see');
  assert.deepEqual(onlyEngine, [], 'PNGraphify sees links the atlas sky does not draw');
  console.log('  ok  the sky and PNGraphify agree on every line');

  assert.equal(ui.unresolved, engine.unresolved, 'unresolved counts disagree');
  console.log('  ok  the two agree on unresolved links');

  /* A [[wikilink]] to a title no note has would draw a line to nowhere. */
  assert.equal(ui.unresolved, 0, 'every [[wikilink]] in atlas-data.js must name a real note');
  console.log('  ok  every [[wikilink]] resolves to a note');

  /* Ids have to be unique, or two stars share one hash seed and one #anchor. */
  const ids = notes.map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate note id in atlas-data.js');
  const titles = notes.map((n) => key(n.title));
  assert.equal(new Set(titles).size, titles.length, 'duplicate note title in atlas-data.js');
  console.log('  ok  note ids and titles are unique');

  /* Every note belongs to a declared domain, or its star has no jar and no
     colour, and the layout falls back to the middle of the sky. */
  const domains = new Set(global.PNAtlasData.domains.map((d) => d.id));
  const homeless = notes.filter((n) => !domains.has(n.domain));
  assert.deepEqual(homeless.map((n) => n.title), [], 'note in a domain with no jar');
  console.log('  ok  every star has a jar to belong to');

  const degree = {};
  notes.forEach((n) => { degree[n.id] = 0; });
  ui.pairs.forEach((p) => {
    const [a, b] = p.split('|');
    degree[a] += 1;
    degree[b] += 1;
  });
  const adrift = notes.filter((n) => !degree[n.id]);
  assert.deepEqual(adrift.map((n) => n.title), [], 'a note with no link in or out');
  console.log('  ok  no note is adrift');

  const perStar = (2 * ui.pairs.size / notes.length).toFixed(1);
  console.log('\n  ' + notes.length + ' stars, ' + ui.pairs.size + ' lines, ' + perStar +
    ' lines per star, ' + adrift.length + ' adrift, ' + ui.unresolved + ' unresolved');
  console.log('\natlas link graph: all assertions passed');
}

main();
