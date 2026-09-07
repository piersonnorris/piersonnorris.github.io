'use strict';

/* The model behind the vault graph (PNGraphify.build) and the Obsidian
   vault reader that feeds it (tools/obsidian-sync.js).

   build() is the half worth testing: what counts as a link, what counts
   as an orphan, and what counts as unresolved are judgement calls the
   picture then draws — get them wrong and the graph lies confidently.
   The layout and SVG half is left to the browser. */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

global.window = {};
require('../../assets/js/notes-graph.js');

const { build, wikiTargets } = window.PNGraphify;
const sync = require('../obsidian-sync.js');

let id = 0;
function note(title, body, extra) {
  id += 1;
  return Object.assign({ id: 'n' + id, title, body: body || '', tags: [] }, extra || {});
}

function linkKinds(model, kind) {
  return model.links.filter((l) => l.kind === kind);
}

function main() {
  // ------------------------------------------------------- wikiTargets
  {
    assert.deepEqual(wikiTargets('see [[Alpha]] and [[Beta]]'), ['Alpha', 'Beta']);
    assert.deepEqual(wikiTargets('[[Alpha|the first one]]'), ['Alpha'], 'an alias is not part of the target');
    assert.deepEqual(wikiTargets('[[Alpha#Section]]'), ['Alpha'], 'a heading anchor is not part of the target');
    assert.deepEqual(wikiTargets('[[  Alpha  ]]'), ['Alpha'], 'targets are trimmed');
    assert.deepEqual(wikiTargets('[[]] [[ ]]'), [], 'empty brackets link nowhere');
    assert.deepEqual(wikiTargets(null), [], 'a bodyless note links nowhere');
  }

  // -------------------------------------------------------- basic links
  {
    const notes = [
      note('Alpha', 'points at [[Beta]]'),
      note('Beta', 'points back at [[Alpha]]'),
      note('Gamma', 'points at nothing')
    ];
    const m = build(notes, { tags: false, missing: false });

    assert.equal(m.stats.notes, 3);
    assert.equal(m.stats.links, 1, 'A→B and B→A are one connection, not two');
    assert.equal(m.stats.orphans, 1, 'Gamma is the only orphan');
    assert.deepEqual(m.stats.orphanTitles, ['Gamma']);
    assert.equal(m.stats.density, +(2 / 3).toFixed(2), 'links per note counts both ends');
  }

  // ------------------------------------------------------ case + self
  {
    const notes = [
      note('Macro Notes', 'see [[macro notes]] and [[MACRO NOTES]]'),
      note('Rates', 'see [[Macro Notes]]')
    ];
    const m = build(notes, { tags: false, missing: false });
    assert.equal(m.stats.links, 1, 'a note linking to itself is not a link, whatever the casing');
    assert.equal(m.stats.missing, 0, 'a case-different link still resolves');
    assert.equal(m.stats.orphans, 0);
  }

  // ------------------------------------------------------- unresolved
  {
    const notes = [note('Alpha', 'the plan is in [[Someday]] and [[someday]]')];
    const off = build(notes, { tags: false, missing: false });
    assert.equal(off.stats.missing, 1, 'the same missing target twice is one unresolved link');
    assert.equal(off.nodes.length, 1, 'with missing off, only the real note is drawn');

    const on = build(notes, { tags: false, missing: true });
    assert.equal(on.nodes.length, 2, 'with missing on, the ghost node appears');
    assert.equal(on.nodes[1].kind, 'missing');
    assert.equal(on.nodes[1].label, 'Someday', 'the ghost keeps the first spelling it was written with');

    /* An unresolved link is not a link: a note whose only outgoing
       bracket points nowhere is still an orphan, which is the whole
       reason the graph flags both numbers separately. */
    assert.equal(on.stats.orphans, 1);
    assert.equal(on.stats.links, 0);
  }

  // -------------------------------------------------------------- tags
  {
    const notes = [
      note('Alpha', '', { tags: ['macro', 'research'] }),
      note('Beta', '', { tags: ['Macro'] })
    ];
    const off = build(notes, { tags: false, missing: false });
    assert.equal(off.stats.tags, 2, 'tag counts are reported even when tag nodes are hidden');
    assert.equal(off.nodes.length, 2);

    const on = build(notes, { tags: true, missing: false });
    assert.equal(on.nodes.filter((n) => n.kind === 'tag').length, 2, 'macro and Macro are one tag');
    assert.equal(linkKinds(on, 'tag').length, 3);
    assert.equal(on.stats.links, 0, 'sharing a tag is not a wikilink');
    assert.equal(on.stats.orphans, 2, 'and it does not rescue a note from being an orphan');
  }

  // -------------------------------------------------------------- hubs
  {
    const spokes = ['B', 'C', 'D', 'E'].map((t) => note(t, 'up to [[Hub]]'));
    const m = build([note('Hub', '')].concat(spokes), { tags: false, missing: false });
    const hub = m.nodes.find((n) => n.label === 'Hub');
    assert.equal(hub.links, 4);
    assert.equal(hub.hub, true, 'four links is the hub threshold');
    assert.equal(m.stats.hubs[0].label, 'Hub');
    assert.equal(m.nodes.find((n) => n.label === 'B').hub, false);
  }

  // ------------------------------------------- data blobs stay out
  {
    const notes = [
      note('Alpha', 'links [[Beta]]'),
      note('Beta', ''),
      note('Portfolio calendar', '', { noteType: 'portfolio-calendar' }),
      note('Portfolio project board', '', { noteType: 'portfolio-project-board' })
    ];
    const m = build(notes, { tags: false, missing: false });
    assert.equal(m.stats.notes, 2, 'the tracker’s calendar/board storage notes are not writing');
  }

  // ------------------------------------------------------ empty vault
  {
    const m = build([], {});
    assert.deepEqual(m.nodes, []);
    assert.deepEqual(m.links, []);
    assert.equal(m.stats.density, 0, 'no notes must not divide by zero');
    assert.equal(build(null, {}).stats.notes, 0, 'a null vault is an empty one');
  }

  // ================================================ obsidian-sync.js

  // ---------------------------------------------------- frontmatter
  {
    const parsed = sync.parseNote([
      '---',
      'title: "Macro: rates"',
      'tags: [macro, rates]',
      'ticker: nvda',
      'created: 2026-01-02T03:04:05.000Z',
      '---',
      '',
      'Body text with [[Alpha]] and an inline #idea tag.'
    ].join('\n'), 'fallback');

    assert.equal(parsed.title, 'Macro: rates', 'a quoted title keeps its colon');
    assert.deepEqual(parsed.tags, ['macro', 'rates', 'idea'], 'inline #tags join frontmatter tags');
    assert.equal(parsed.ticker, 'NVDA', 'tickers are upper-cased for the vault');
    assert.equal(parsed.created, '2026-01-02T03:04:05.000Z');
    assert.equal(parsed.body.includes('[[Alpha]]'), true, 'the body keeps its links');
    assert.equal(parsed.body.startsWith('---'), false, 'frontmatter is stripped from the body');
  }

  {
    const parsed = sync.parseNote('# Heading title\n\nno frontmatter here', 'file-name');
    assert.equal(parsed.title, 'Heading title', 'a leading H1 titles an untitled note');
    assert.equal(sync.parseNote('just text', 'file-name').title, 'file-name',
      'with neither, the filename is the title');
    assert.deepEqual(sync.parseNote('tags: - list\ntags:\n  - a\n  - b\n', 'x').tags, [],
      'a YAML block outside --- fences is body text, not frontmatter');
  }

  {
    const dashed = sync.parseNote('---\ntags:\n  - macro\n  - rates\n---\nbody', 'x');
    assert.deepEqual(dashed.tags, ['macro', 'rates'], 'block-style YAML tag lists parse too');
  }

  // ------------------------------------------------- walking a vault
  {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pn-vault-'));
    fs.mkdirSync(path.join(dir, 'daily'));
    fs.mkdirSync(path.join(dir, '.obsidian'));
    fs.mkdirSync(path.join(dir, '.trash'));
    fs.writeFileSync(path.join(dir, 'Alpha.md'), '---\ntags: [macro]\n---\nlinks [[Beta]] and [[Ghost]]');
    fs.writeFileSync(path.join(dir, 'daily', 'Beta.md'), 'plain body');
    fs.writeFileSync(path.join(dir, 'Gamma.md'), 'nothing here');
    fs.writeFileSync(path.join(dir, 'ignore.png'), 'not markdown');
    fs.writeFileSync(path.join(dir, '.obsidian', 'workspace.md'), 'app config, not a note');
    fs.writeFileSync(path.join(dir, '.trash', 'Deleted.md'), 'deleted note');

    const bundle = sync.readVault(dir);
    const titles = bundle.notes.map((n) => n.title).sort();
    assert.deepEqual(titles, ['Alpha', 'Beta', 'Gamma'],
      '.obsidian, .trash and non-markdown files stay out');
    assert.equal(bundle.format, 'pn-vault-bundle');
    assert.equal(bundle.notes.every((n) => typeof n.path === 'string' && n.path.length), true,
      'every note carries its vault-relative path so re-imports update rather than duplicate');
    assert.equal(bundle.notes.find((n) => n.title === 'Beta').path, 'daily/Beta.md',
      'paths are posix-style and vault-relative on every platform');

    /* The reason both halves live in one file: the sync script reports
       the same connectivity numbers the browser graph will draw. */
    const model = build(bundle.notes, { tags: false, missing: true });
    assert.equal(model.stats.notes, 3);
    assert.equal(model.stats.links, 1, 'Alpha→Beta');
    assert.equal(model.stats.missing, 1, 'Ghost does not exist');
    assert.equal(model.stats.orphans, 1, 'Gamma');

    const indexOnly = sync.readVault(dir, { body: false });
    assert.equal(indexOnly.notes.every((n) => n.body === ''), true, '--no-body drops note text');
    assert.equal(build(indexOnly.notes, { tags: false, missing: true }).stats.links, 0,
      'and with it the links — an index-only bundle is titles and tags, nothing more');

    fs.rmSync(dir, { recursive: true, force: true });
  }

  // ============================================ build.js payload seam

  /* loadObsidianVault decides what a bundle has to look like before it
     rides inside the encrypted payload. It must never throw the build
     over bad input — the tracker's own numbers do not depend on it. */
  {
    const { loadObsidianVault } = require('./build.js');
    const withEnv = (value, fn) => {
      const had = Object.prototype.hasOwnProperty.call(process.env, 'OBSIDIAN_VAULT_JSON');
      const prev = process.env.OBSIDIAN_VAULT_JSON;
      if (value == null) delete process.env.OBSIDIAN_VAULT_JSON;
      else process.env.OBSIDIAN_VAULT_JSON = value;
      try { return fn(); }
      finally {
        if (had) process.env.OBSIDIAN_VAULT_JSON = prev;
        else delete process.env.OBSIDIAN_VAULT_JSON;
      }
    };

    const good = JSON.stringify({
      format: 'pn-vault-bundle', version: 1, generatedAt: '2026-09-07T00:00:00.000Z',
      source: 'DemoVault', count: 2,
      notes: [
        { path: 'a.md', title: 'Alpha', body: 'links [[Beta]]', tags: ['macro'], ticker: 'nvda', created: 'c', updated: 'u' },
        { path: 'b.md', title: '   ', body: 'no title', tags: [] }
      ]
    });
    const baked = withEnv(good, loadObsidianVault);
    assert.equal(baked.count, 1, 'a note with no title is not a note');
    assert.equal(baked.notes[0].ticker, 'NVDA', 'tickers are normalized on the way in');
    assert.equal(baked.source, 'DemoVault');

    assert.equal(withEnv('{ not json', loadObsidianVault), null, 'malformed JSON degrades to null');
    assert.equal(withEnv('{"format":"something-else","notes":[]}', loadObsidianVault), null,
      'only a pn-vault-bundle is accepted');
    assert.equal(withEnv(JSON.stringify({ format: 'pn-vault-bundle', notes: [] }), loadObsidianVault), null,
      'an empty bundle bakes nothing rather than an empty shell');
  }

  console.log('notes-graph + obsidian-sync + build seam: all assertions passed');
}

main();
