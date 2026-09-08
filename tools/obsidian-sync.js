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
    /* `publish: false` is the one-line opt-out from the public snapshot
       (docs/BACKSTAGE_PLAN.md §4). Only an explicit false counts — a note
       with no opinion publishes, because default-publish was the decision. */
    const pub = /^\s*publish\s*:\s*(.+?)\s*$/im.exec(fm[1]);
    if (pub && /^(false|no|off|0|private)$/i.test(pub[1].replace(/^["']|["']$/g, ''))) {
      note.publish = false;
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
      updated: parsed.updated || stats.mtime.toISOString(),
      /* only carried when the note explicitly opted out; undefined
         otherwise, so the bundle shape the tracker reads is unchanged */
      publish: parsed.publish === false ? false : undefined
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

// ------------------------------------------------------------- publishing
/* Everything from here down exists for one purpose: producing the file
   /vault/ reads. Publishing is a one-way door — a note committed to a
   public repo is public permanently, git history included — so this half
   is built to make Pierce look before it happens, not to be clever.
   Design and reasoning: docs/BACKSTAGE_PLAN.md §4. */

/* --- the opt-outs. Default is publish; these three are the ways out. --- */
const PRIVATE_TAG = /^(private|nopublish|no-publish|secret)$/i;
const PRIVATE_DIR = /(^|\/)(nopublish|private)\//i;

function excludedBecause(note) {
  if (note.publish === false) return 'publish: false';
  const tag = (note.tags || []).filter((t) => PRIVATE_TAG.test(String(t)))[0];
  if (tag) return `#${tag} tag`;
  if (PRIVATE_DIR.test(note.path)) return 'in a nopublish/ folder';
  return null;
}

/* --- the scrubber. It refuses; it never silently redacts. ---
   A filter that quietly deletes a number teaches you nothing and rots the
   moment someone writes the number a new way. A refusal that prints
   path:line sends the fix back to the vault, where it belongs. */
const SCRUB_RULES = [
  { id: 'money',   label: 'dollar amount',      re: /\$\s?\d[\d,]*(?:\.\d+)?/ },
  { id: 'shares',  label: 'share count',        re: /\b\d[\d,]*\s+shares?\b/i },
  { id: 'phone',   label: 'phone number',       re: /\b\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/ },
  { id: 'address', label: 'street address',     re: /\b\d{1,5}\s+[A-Z][\w.]*(?:\s+[A-Z][\w.]*)*\s+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Blvd|Ct|Court|Cir|Circle|Way|Pl|Place|Ter|Terrace)\b/ },
  { id: 'secret',  label: 'key-shaped token',   re: /\b[A-Za-z0-9_-]{32,}\b/ }
];

/* Named terms — client names, employers, anything on CONTENT.md §7's
   "never on the site" list — come from private/.publish-blocklist, one
   per line, gitignored. They deliberately do NOT live in a tracked file:
   a committed list of names you must never publish is itself a published
   list of those names. */
function loadBlocklist() {
  const file = path.join(ROOT, 'private', '.publish-blocklist');
  if (!fs.existsSync(file)) return { terms: [], configured: false };
  const terms = fs.readFileSync(file, 'utf8').split(/\r?\n/)
    .map((line) => line.replace(/#.*$/, '').trim())
    .filter(Boolean);
  return { terms, configured: true };
}

/* → [{path, line, rule, label}] — the location of a hit, never the text
   of it. Printing the matched string would put the very thing the rule
   caught into a terminal, a log and probably a chat transcript. */
function scan(notes, opts) {
  opts = opts || {};
  const waived = new Set(opts.waive || []);
  const terms = (opts.terms || []).map((t) => t.toLowerCase());
  const hits = [];
  for (const note of notes) {
    const lines = String(note.body || '').split(/\r?\n/);
    lines.forEach((line, i) => {
      for (const rule of SCRUB_RULES) {
        if (waived.has(rule.id)) continue;
        if (rule.re.test(line)) hits.push({ path: note.path, line: i + 1, rule: rule.id, label: rule.label });
      }
      if (!waived.has('blocklist')) {
        const low = line.toLowerCase();
        for (const term of terms) {
          if (term && low.indexOf(term) !== -1) {
            hits.push({ path: note.path, line: i + 1, rule: 'blocklist', label: 'blocklisted term' });
            break;
          }
        }
      }
    });
  }
  return hits;
}

/* --- publish-time link resolution ---
   A vault links with [[wikilinks]]; the site's own docs link by writing a
   path in backticks (`docs/CONTENT.md`). Both are the author saying "this
   note connects to that one", and the graph should draw both. Only the
   exact inline-code form is rewritten — a path inside a fenced block or a
   sentence is left alone, because guessing there would invent edges the
   author never wrote. Recorded in the bundle as `linkedPaths` so the page
   can say it happened. */
function linkPaths(notes) {
  const byPath = new Map();
  for (const note of notes) {
    byPath.set(note.path.toLowerCase(), note.title);
    byPath.set(note.path.replace(/\.(md|markdown)$/i, '').toLowerCase(), note.title);
    byPath.set(path.basename(note.path).toLowerCase(), note.title);
  }
  let rewrites = 0;
  for (const note of notes) {
    note.body = String(note.body || '').replace(/`([^`\n]+)`/g, (whole, inner) => {
      const title = byPath.get(inner.trim().toLowerCase());
      if (!title || title === note.title) return whole;
      rewrites += 1;
      return `[[${title}]]`;
    });
  }
  return rewrites;
}

/* The public bundle. A different `format` from pn-vault-bundle on purpose:
   this one is committed and world-readable, and nothing should be able to
   confuse it with the private one the tracker bakes in. */
function toPublicBundle(bundle, opts) {
  opts = opts || {};
  /* --prefix nests every published path under a folder. Publishing a
     subfolder of a vault otherwise flattens it: every note lands in the
     root and the tree has nothing to draw. */
  const prefix = opts.prefix ? String(opts.prefix).replace(/^\/+|\/+$/g, '') + '/' : '';
  const kept = [];
  const dropped = [];
  for (const note of bundle.notes) {
    const why = excludedBecause(note);
    if (why) dropped.push({ path: note.path, why });
    else {
      const at = prefix + note.path;
      kept.push({
        path: at,
        folder: at.indexOf('/') === -1 ? '' : at.slice(0, at.lastIndexOf('/')),
        title: note.title,
        body: note.body,
        tags: note.tags || [],
        created: note.created,
        updated: note.updated
      });
    }
  }
  const linkedPaths = opts.linkPaths === false ? 0 : linkPaths(kept);
  return {
    bundle: {
      format: 'pn-vault-public',
      version: 1,
      label: opts.label || bundle.source,
      generatedAt: bundle.generatedAt,
      linkedPaths,
      waived: (opts.waive || []).slice(),
      count: kept.length,
      notes: kept
    },
    dropped
  };
}

/* What Pierce reads before the first publish (plan §4, phase P1). Paths,
   titles and sizes — never a line of note text. */
function publishReport(bundle, result, hits, blocklist, willWrite) {
  const words = (s) => String(s || '').split(/\s+/).filter(Boolean).length;
  const out = result.bundle;
  const lines = [
    '',
    `PUBLISH REPORT — "${out.label}"`,
    `${out.count} note${out.count === 1 ? '' : 's'} would become public; ${result.dropped.length} held back.`,
    '',
    '  WOULD PUBLISH'
  ];
  for (const note of out.notes) {
    lines.push(`    ${note.path}` + ' '.repeat(Math.max(1, 44 - note.path.length)) +
      `${words(note.body)} words   ${note.title}`);
  }
  if (result.dropped.length) {
    lines.push('', '  HELD BACK');
    for (const d of result.dropped) lines.push(`    ${d.path}  —  ${d.why}`);
  }
  lines.push('', '  SCRUBBER');
  if (!blocklist.configured) {
    lines.push('    ! no private/.publish-blocklist — no names are being checked for.');
  }
  if (out.waived.length) lines.push(`    ! waived for this run: ${out.waived.join(', ')}`);
  if (!hits.length) {
    lines.push('    clean — no dollar amounts, share counts, addresses, phone numbers,');
    lines.push('    key-shaped tokens or blocklisted terms in the text above.');
  } else {
    lines.push(`    ${hits.length} hit${hits.length === 1 ? '' : 's'} — --public will refuse until these are fixed in the vault:`);
    for (const hit of hits) lines.push(`      ${hit.path}:${hit.line}  ${hit.label}`);
  }
  lines.push('', `  ${out.linkedPaths} inline path reference${out.linkedPaths === 1 ? '' : 's'} resolved into wikilinks.`);
  lines.push('', willWrite
    ? '  Writing the file below. Committing it is still a separate, deliberate act.'
    : '  Nothing has been written. --public writes the file; committing it is still a separate act.');
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
      '  --dry-run       report connectivity, write nothing',
      '',
      'Public snapshot (docs/BACKSTAGE_PLAN.md) — what /vault/ reads:',
      '',
      '  --report        list every note that WOULD publish + scrubber hits, write nothing',
      '  --public        write the public bundle  [assets/data/vault-public.js]',
      '  --label <name>  what the page calls this snapshot  [the folder name]',
      '  --prefix <dir>  nest every published path under this folder',
      '  --waive <ids>   comma-separated scrub rules to skip, printed loudly',
      '                  (money, shares, phone, address, secret, blocklist)',
      '  --no-link-paths do not resolve `inline/path.md` references into wikilinks',
      '',
      'A note opts out of publishing with `publish: false` in its frontmatter,',
      'a #private tag, or by living in a nopublish/ folder. Named terms come',
      'from private/.publish-blocklist (gitignored, one per line).'
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

  /* --- the public path. Deliberately its own branch: nothing about the
     private bundle should be able to fall through into a committed file. */
  if (flag('report') || flag('public')) {
    if (!bundle.withBody) throw new Error('--no-body cannot be published: the public bundle is the note text.');
    const waive = String(arg('waive', '')).split(',').map((s) => s.trim()).filter(Boolean);
    const blocklist = loadBlocklist();
    const result = toPublicBundle(bundle, {
      label: arg('label', bundle.source),
      prefix: arg('prefix', ''),
      waive,
      linkPaths: !flag('no-link-paths')
    });
    const hits = scan(result.bundle.notes, { waive, terms: blocklist.terms });

    console.log(publishReport(bundle, result, hits, blocklist, flag('public') && !hits.length));
    if (flag('report')) return;

    if (hits.length) {
      throw new Error(`${hits.length} scrubber hit${hits.length === 1 ? '' : 's'} — refusing to write. ` +
        'Fix them in the vault (or waive the rule deliberately with --waive) and run again.');
    }

    const out = path.resolve(ROOT, arg('out', path.join('assets', 'data', 'vault-public.js')));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    /* A .js file, not .json, for the same reason atlas-data.js is one:
       it loads with a <script> tag, so the page works over file:// with
       no fetch, no CORS and no server. .json is still honoured if asked. */
    const json = JSON.stringify(result.bundle, null, /\.js$/i.test(out) ? 0 : 2);
    fs.writeFileSync(out, /\.js$/i.test(out)
      ? '/* Generated by tools/obsidian-sync.js --public. Do not edit by hand. */\n' +
        'window.PNVaultPublic = ' + json + ';\n'
      : json + '\n');
    console.log(`\nWrote ${result.bundle.count} public notes → ${path.relative(ROOT, out)}` +
      '\nThis file is committed and world-readable once you push it.');
    return;
  }

  console.log(report(bundle, flag('list')));

  if (flag('dry-run')) { console.log('\nDry run — nothing written.'); return; }
  if (flag('stdout')) { process.stdout.write(JSON.stringify(bundle, null, 2) + '\n'); return; }

  const out = path.resolve(ROOT, arg('out', path.join('private', 'notes', 'obsidian-vault.json')));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(bundle));
  console.log(`\nWrote ${bundle.count} notes → ${path.relative(ROOT, out)}` +
    `\nImport it with the Import button on /notes/ (it takes .json bundles as well as .md files).`);
}

module.exports = {
  parseNote, readVault, report, blockLists,
  excludedBecause, scan, linkPaths, toPublicBundle, publishReport, loadBlocklist, SCRUB_RULES
};

if (require.main === module) {
  try { main(); }
  catch (error) { console.error('obsidian-sync failed:', error.message); process.exitCode = 1; }
}
