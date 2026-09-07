#!/usr/bin/env node
'use strict';

/* ============================================================
   obsidian-sync.js — read a real Obsidian vault, emit a bundle.

   The site is static and has no server, so a vault folder on disk can
   never be "connected" to it live. What this does instead is the same
   move the Google Calendar pull makes (docs/PORTFOLIO_CALENDAR_PLAN.md,
   "Known boundary"): read the real source once, outside the site, and
   write a snapshot the site can consume.

     node tools/obsidian-sync.js --vault "C:\\path\\to\\Vault"

   Output is a single JSON bundle at private/notes/obsidian-vault.json
   (gitignored — note text never enters this repo). Load it with the
   Import button on /notes/: one file instead of hand-picking hundreds
   of .md files, and re-importing updates notes in place by vault path
   rather than piling up duplicates.

   Optionally, dropping the same bundle at
   private/tracker/obsidian-vault.json makes tools/tracker/build.js bake
   it into the encrypted tracker payload (see loadObsidianVault there),
   so the tracker can offer the same notes without a file at all.

   Parsing is deliberately not reimplemented here: it calls the site's
   own PNVault.fromMarkdown, so a note read by this script and a note
   imported through the browser end up identical. The only thing added
   on top is block-style YAML tag lists (tags:\n  - a), which Obsidian
   writes and the browser importer never had to handle.

   This script prints counts, never note text. --list opts into titles.
   ============================================================ */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

/* The site's own modules are browser globals; give them a window. */
if (!global.window) global.window = {};
require(path.join(ROOT, 'assets', 'js', 'vault.js'));
require(path.join(ROOT, 'assets', 'js', 'notes-graph.js'));
const { fromMarkdown } = global.window.PNVault;
const { build } = global.window.PNGraphify;

const MD = /\.(md|markdown)$/i;
const SKIP_DIRS = new Set(['node_modules']);

// ------------------------------------------------------------- parsing

/* Obsidian writes tag lists two ways. fromMarkdown understands the
   inline form (tags: [a, b]); this adds the block form:
       tags:
         - a
         - b
   plus `alias`/`aliases`, which are worth keeping as tags so a note
   stays findable under the name it is linked by. */
function blockLists(frontmatter) {
  const out = {};
  const lines = frontmatter.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const head = /^([A-Za-z_][\w-]*)\s*:\s*$/.exec(lines[i]);
    if (!head) continue;
    const items = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      const item = /^\s*-\s+(.*)$/.exec(lines[j]);
      if (!item) break;
      const value = item[1].trim().replace(/^["']|["']$/g, '');
      if (value) items.push(value);
    }
    if (items.length) out[head[1].toLowerCase()] = items;
  }
  return out;
}

/* text → the note shape vault.js stores. `fallbackTitle` is the
   filename, used when a note carries neither frontmatter title nor H1. */
function parseNote(text, fallbackTitle) {
  const note = fromMarkdown(text, fallbackTitle);
  const fm = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text || '');
  if (fm) {
    const lists = blockLists(fm[1]);
    const extra = [].concat(lists.tags || [], lists.alias || [], lists.aliases || []);
    for (const tag of extra) {
      const clean = String(tag).replace(/^#/, '').trim();
      if (clean && note.tags.indexOf(clean) === -1) note.tags.push(clean);
    }
  }
  return note;
}

// ------------------------------------------------------------- walking

function walk(dir, base, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return out; }
  for (const entry of entries) {
    /* Dot-directories are Obsidian's own: .obsidian (app config),
       .trash (deleted notes), .git. None of them are writing. */
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, base, out);
    } else if (entry.isFile() && MD.test(entry.name)) {
      out.push({ full, rel: path.relative(base, full).split(path.sep).join('/') });
    }
  }
  return out;
}

/* opts: {body: bool (default true), scope: 'general'|'stocks'}
   body:false emits an index — titles, tags and paths, no note text.
   Useful when all you want out of the vault is the shape of it. */
function readVault(dir, opts) {
  opts = opts || {};
  const withBody = opts.body !== false;
  const stat = fs.statSync(dir);
  if (!stat.isDirectory()) throw new Error(`${dir} is not a folder.`);

  const notes = walk(dir, dir, []).map((file) => {
    const text = fs.readFileSync(file.full, 'utf8');
    const parsed = parseNote(text, path.basename(file.rel).replace(MD, ''));
    const stats = fs.statSync(file.full);
    return {
      path: file.rel,
      title: parsed.title,
      body: withBody ? parsed.body : '',
      tags: parsed.tags,
      ticker: parsed.ticker,
      outlook: parsed.outlook,
      created: parsed.created || stats.birthtime.toISOString(),
      updated: parsed.updated || stats.mtime.toISOString()
    };
  }).sort((a, b) => a.path.localeCompare(b.path));

  return {
    format: 'pn-vault-bundle',
    version: 1,
    scope: opts.scope === 'stocks' ? 'stocks' : 'general',
    generatedAt: new Date().toISOString(),
    /* The folder name only. The full path is a local detail and this
       file is read by the browser. */
    source: path.basename(path.resolve(dir)),
    withBody,
    count: notes.length,
    notes
  };
}

// ------------------------------------------------------------- report

function report(bundle, listTitles) {
  const model = build(bundle.notes, { tags: false, missing: true });
  const s = model.stats;
  const lines = [
    `Vault "${bundle.source}" — ${s.notes} notes`,
    `  links        ${s.links} (${s.density} per note)`,
    `  tags         ${s.tags}`,
    `  orphans      ${s.orphans}`,
    `  unresolved   ${s.missing}`
  ];
  if (s.hubs.length) lines.push(`  busiest      ${s.hubs.length} hub${s.hubs.length === 1 ? '' : 's'}`);
  if (listTitles) {
    if (s.orphanTitles.length) lines.push('', '  orphans:', ...s.orphanTitles.map((t) => `    · ${t}`));
    if (s.missingTitles.length) lines.push('', '  unresolved links:', ...s.missingTitles.map((t) => `    · ${t}`));
  } else if (s.orphans || s.missing) {
    lines.push('', '  (run with --list to see which notes — titles are not printed by default)');
  }
  return lines.join('\n');
}

// ------------------------------------------------------------- cli

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) return process.argv[i + 1];
  return fallback;
}
function flag(name) { return process.argv.includes(`--${name}`); }

/* --vault, then OBSIDIAN_VAULT, then the path saved in
   private/.obsidian-vault-path (gitignored, one line). */
function vaultPath() {
  const fromArg = arg('vault', '');
  if (fromArg) return fromArg;
  if (process.env.OBSIDIAN_VAULT) return process.env.OBSIDIAN_VAULT;
  const saved = path.join(ROOT, 'private', '.obsidian-vault-path');
  if (fs.existsSync(saved)) {
    const line = fs.readFileSync(saved, 'utf8').trim();
    if (line) return line;
  }
  return '';
}

function main() {
  if (flag('help')) {
    console.log([
      'obsidian-sync — snapshot an Obsidian vault for the site.',
      '',
      '  --vault <dir>   vault folder (or OBSIDIAN_VAULT, or private/.obsidian-vault-path)',
      '  --out <file>    output bundle  [private/notes/obsidian-vault.json]',
      '  --scope <s>     general | stocks  [general]',
      '  --no-body       index only: titles, tags and paths, no note text',
      '  --list          print orphan and unresolved titles (off by default)',
      '  --stdout        print the bundle instead of writing it',
      '  --dry-run       report connectivity, write nothing'
    ].join('\n'));
    return;
  }

  const dir = vaultPath();
  if (!dir) {
    throw new Error('No vault given. Pass --vault "C:\\path\\to\\Vault", set OBSIDIAN_VAULT, ' +
      'or write the path into private/.obsidian-vault-path.');
  }
  if (!fs.existsSync(dir)) throw new Error(`Vault folder not found: ${dir}`);

  const bundle = readVault(dir, { body: !flag('no-body'), scope: arg('scope', 'general') });
  if (!bundle.count) throw new Error(`No .md files under ${dir}.`);

  console.log(report(bundle, flag('list')));

  if (flag('dry-run')) { console.log('\nDry run — nothing written.'); return; }
  if (flag('stdout')) { process.stdout.write(JSON.stringify(bundle, null, 2) + '\n'); return; }

  const out = path.resolve(ROOT, arg('out', path.join('private', 'notes', 'obsidian-vault.json')));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(bundle));
  console.log(`\nWrote ${bundle.count} notes → ${path.relative(ROOT, out)}` +
    `\nImport it with the Import button on /notes/ (it takes .json bundles as well as .md files).`);
}

module.exports = { parseNote, readVault, report, blockLists };

if (require.main === module) {
  try { main(); }
  catch (error) { console.error('obsidian-sync failed:', error.message); process.exitCode = 1; }
}
