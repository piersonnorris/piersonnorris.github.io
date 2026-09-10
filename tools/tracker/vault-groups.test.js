'use strict';

/* PNVaultGroups.groups() — the vault's communities, and the names they
   are allowed to carry.

   Two things are worth pinning here. The first is that clustering is
   deterministic: label propagation shuffles its visiting order, and if
   that shuffle is not seeded the same vault resolves into different
   groups on every load and the feature becomes a random-colour
   generator that happens to look meaningful.

   The second is the labelling rule. A cluster's name has to be derived
   from the vault — folder, tag, or hub note — or it stays 'unnamed'.
   The failure mode this guards is a page inventing a claim about how
   someone thinks that no data supports, which on a page whose whole
   premise is 'the structure is real' is the worst thing it could do. */

const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');

global.window = global;
require(path.join(ROOT, 'assets/js/notes-graph.js'));
require(path.join(ROOT, 'assets/js/vault-groups.js'));

const { groups, shortTitle } = global.PNVaultGroups;

let uid = 0;
function note(title, body, extra) {
  uid += 1;
  return Object.assign({ id: 'n' + uid, title, body: body || '', tags: [] }, extra || {});
}

/* [[A]] [[B]] — the body is the only place a link can come from, which
   is the same rule PNGraphify enforces. */
function links(...titles) {
  return titles.map((t) => `[[${t}]]`).join(' ');
}

function labelsOf(res) {
  return res.clusters.map((c) => c.label);
}

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
  } catch (err) {
    console.error(`\n  FAIL  ${name}\n        ${err.message}\n`);
    process.exitCode = 1;
  }
}

// ------------------------------------------------------- shape of the answer

test('a known two-cluster fixture resolves into exactly two groups', () => {
  const notes = [
    note('A', links('B', 'C')),
    note('B', links('A', 'C')),
    note('C', links('A', 'B')),
    note('X', links('Y', 'Z')),
    note('Y', links('X', 'Z')),
    note('Z', links('X', 'Y'))
  ];
  const res = groups(notes);
  assert.equal(res.clusters.length, 2, 'two triangles, two clusters');
  assert.deepEqual(res.clusters.map((c) => c.size).sort(), [3, 3]);

  /* and the two triangles must not be mixed together */
  const first = res.of[0];
  assert.equal(res.of[1], first);
  assert.equal(res.of[2], first);
  assert.notEqual(res.of[3], first);
  assert.equal(res.of[4], res.of[3]);
  assert.equal(res.of[5], res.of[3]);
});

test('a fully-connected fixture returns one group', () => {
  const titles = ['A', 'B', 'C', 'D', 'E'];
  const notes = titles.map((t) => note(t, links(...titles.filter((o) => o !== t))));
  const res = groups(notes);
  assert.equal(res.clusters.length, 1);
  assert.equal(res.clusters[0].size, 5);
  assert.equal(res.stats.singletons, 0);
});

test('an all-orphans fixture returns no groups at all', () => {
  const notes = [note('A'), note('B'), note('C')];
  const res = groups(notes);
  assert.equal(res.clusters.length, 0, 'a circle around one dot is noise, not a cluster');
  assert.equal(res.stats.orphans, 3);
  assert.equal(res.stats.clustered, 0);
  assert.deepEqual(res.of, [-1, -1, -1]);
});

test('orphans sit outside every cluster but stay counted', () => {
  const notes = [
    note('A', links('B')),
    note('B', links('A')),
    note('Alone')
  ];
  const res = groups(notes);
  assert.equal(res.clusters.length, 1);
  assert.equal(res.of[2], -1, 'the orphan belongs to no cluster');
  assert.equal(res.stats.orphans, 1, 'and is still counted');
  assert.equal(res.stats.notes, 3);
});

test('members index back into the array the caller passed in', () => {
  /* noteType blobs are dropped by PNGraphify.build, which shifts its own
     indices. If groups() forgets to map back, every member index after
     the blob points at the wrong note. */
  const notes = [
    { id: 'blob', title: 'calendar', body: '', noteType: 'calendar' },
    note('A', links('B')),
    note('B', links('A'))
  ];
  const res = groups(notes);
  assert.deepEqual(res.clusters[0].members.sort(), [1, 2]);
  assert.equal(res.of[0], -1, 'storage is not writing; it is not in a cluster');
  assert.equal(res.of[1], 0);
  assert.equal(res.of[2], 0);
});

// ------------------------------------------------------------- determinism

test('the same input gives the same output twice', () => {
  const make = () => {
    uid = 0;
    return [
      note('A', links('B', 'C')), note('B', links('A', 'C')), note('C', links('A')),
      note('D', links('E')), note('E', links('D', 'F')), note('F', links('E')),
      note('G', links('H')), note('H', links('G')), note('Lonely')
    ];
  };
  const a = JSON.stringify(groups(make()));
  const b = JSON.stringify(groups(make()));
  assert.equal(a, b, 'seeded shuffle, or the vault clusters differently every load');
});

test('a different seed is allowed to disagree, but stays stable itself', () => {
  const make = () => {
    uid = 0;
    return [
      note('A', links('B')), note('B', links('A', 'C')), note('C', links('B', 'D')),
      note('D', links('C', 'E')), note('E', links('D'))
    ];
  };
  const one = JSON.stringify(groups(make(), { seed: 1 }));
  assert.equal(one, JSON.stringify(groups(make(), { seed: 1 })));
});

test('cluster 0 is the biggest cluster, so hue never shuffles', () => {
  const notes = [
    note('A', links('B')), note('B', links('A')),
    note('P', links('Q', 'R', 'S')), note('Q', links('P', 'R', 'S')),
    note('R', links('P', 'Q', 'S')), note('S', links('P', 'Q', 'R'))
  ];
  const res = groups(notes);
  assert.equal(res.clusters[0].size, 4);
  assert.equal(res.clusters[1].size, 2);
});

// ----------------------------------------------------------------- labelling

test('rule 1 — a shared folder names the cluster', () => {
  const notes = [
    note('A', links('B'), { folder: 'docs' }),
    note('B', links('A'), { folder: 'docs' }),
    note('C', links('A'), { folder: 'daily' })
  ];
  const res = groups(notes);
  assert.equal(res.clusters[0].label, 'docs/');
  assert.equal(res.clusters[0].labelKind, 'folder');
});

test('rule 1 — the folder can come from the path when there is no folder field', () => {
  const notes = [
    note('A', links('B'), { path: 'docs/A.md' }),
    note('B', links('A'), { path: 'docs/B.md' })
  ];
  assert.equal(groups(notes).clusters[0].label, 'docs/');
});

test('rule 1 does not fire below the majority threshold', () => {
  const notes = [
    note('A', links('B', 'C'), { folder: 'one' }),
    note('B', links('A', 'C'), { folder: 'two' }),
    note('C', links('A', 'B'), { folder: 'three' })
  ];
  const res = groups(notes);
  assert.notEqual(res.clusters[0].labelKind, 'folder');
});

test('rule 2 — a shared tag names the cluster when the folder does not', () => {
  const notes = [
    note('A', links('B', 'C'), { folder: 'one', tags: ['systems'] }),
    note('B', links('A', 'C'), { folder: 'two', tags: ['systems'] }),
    note('C', links('A', 'B'), { folder: 'three', tags: ['systems'] })
  ];
  const res = groups(notes);
  assert.equal(res.clusters[0].label, '#systems');
  assert.equal(res.clusters[0].labelKind, 'tag');
});

test('rule 2 — a note tagged six ways does not outvote five notes tagged one way', () => {
  const notes = [
    note('A', links('B', 'C'), { folder: 'a', tags: ['loud', 'x', 'y', 'z', 'w', 'v'] }),
    note('B', links('A', 'C'), { folder: 'b', tags: ['quiet'] }),
    note('C', links('A', 'B'), { folder: 'c', tags: ['quiet'] })
  ];
  const res = groups(notes);
  assert.equal(res.clusters[0].label, '#quiet', 'two notes beat one note shouting');
});

test('rule 3 — the hub names the cluster when nothing is shared', () => {
  const notes = [
    note('ROADMAP — piersonnorris.com', links('B', 'C', 'D'), { folder: 'a' }),
    note('B', links('ROADMAP — piersonnorris.com'), { folder: 'b' }),
    note('C', links('ROADMAP — piersonnorris.com'), { folder: 'c' }),
    note('D', links('ROADMAP — piersonnorris.com'), { folder: 'd' })
  ];
  const res = groups(notes);
  assert.equal(res.clusters[0].label, 'around ROADMAP');
  assert.equal(res.clusters[0].labelKind, 'hub');
  assert.equal(res.clusters[0].hub, 0, 'the hub is the most-linked note');
});

test('shortTitle keeps the name and drops the trailing explainer', () => {
  assert.equal(shortTitle('ROADMAP — piersonnorris.com'), 'ROADMAP');
  assert.equal(shortTitle('BACKSTAGE — the vault, in public'), 'BACKSTAGE');
  assert.equal(shortTitle('Obsidian connectivity'), 'Obsidian connectivity');
  assert.equal(shortTitle(''), 'Untitled');
});

test('a folder that names every cluster is reported as not discriminating', () => {
  /* The docs/ snapshot is exactly this case: every note lives in one
     folder, so rule 1 fires for every cluster and they all get the same
     name. The engine still answers honestly; it also says so, rather
     than drawing three hulls that all read 'docs/'. */
  const notes = [
    note('A', links('B'), { folder: 'docs' }), note('B', links('A'), { folder: 'docs' }),
    note('P', links('Q'), { folder: 'docs' }), note('Q', links('P'), { folder: 'docs' })
  ];
  const res = groups(notes);
  assert.equal(res.clusters.length, 2);
  assert.deepEqual(labelsOf(res), ['docs/', 'docs/']);
  assert.equal(res.stats.labelsDistinct, 1, 'two clusters, one name between them');
});

// -------------------------------------------------- against the real snapshot

test('the published snapshot clusters, and every note lands somewhere honest', () => {
  require(path.join(ROOT, 'assets/data/vault-public.js'));
  const vault = global.PNVaultPublic;
  const res = groups(vault.notes);

  assert.ok(res.clusters.length >= 1, 'the docs snapshot is not a pile of orphans');
  assert.equal(res.stats.notes, vault.notes.length);
  assert.equal(
    res.stats.clustered + res.stats.singletons,
    vault.notes.length,
    'every note is either in a cluster or explicitly not'
  );
  /* Whatever the clustering does, it must agree with the graph about how
     many notes nothing links to. */
  const model = global.PNGraphify.build(vault.notes, { tags: false, missing: false });
  assert.equal(res.stats.orphans, model.stats.orphans);

  res.clusters.forEach((c) => {
    assert.ok(c.size > 1, 'no singleton is dressed up as a cluster');
    assert.ok(c.label && c.label.length, 'every cluster carries a name');
  });
});

console.log(`vault-groups: ${passed} passed${process.exitCode ? ' (with failures above)' : ''}`);
