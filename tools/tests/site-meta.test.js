'use strict';

/* The site's machine-facing surface — sitemap.xml, llms.txt, each page's
   share tags, and the nav — has to agree with the pages that actually
   exist. Nothing checked that, and by 2026-09-29 it had drifted four ways:
   llms.txt advertised a /notes/ page that was gone, /atlas/ was live but
   missing from the sitemap, a new page shipped without the nav the others
   carry, and no page had a share image at all.

   "Publishable" below means a file that exists and that .gitignore does not
   eat. That is the failure mode that matters for GitHub Pages: a build can
   go green while a page 404s on a file the deny-by-default ignore quietly
   dropped (ROADMAP §4 rule 8). So every link is checked against what git
   would actually publish, not merely against the disk. */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const SITE = 'https://piersonnorris.github.io';
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/* Everything git would publish: tracked, plus untracked-but-not-ignored. */
const publishable = new Set(
  execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
    cwd: ROOT, encoding: 'utf8'
  }).split('\n').filter(Boolean).map((p) => p.replace(/\\/g, '/'))
);

/* "/jar/" -> "jar/index.html", "/" -> "index.html" */
function fileFor(urlPath) {
  let p = urlPath.replace(/^\//, '');
  if (p === '' || p.endsWith('/')) p += 'index.html';
  return p;
}

function attr(html, pattern) {
  const m = pattern.exec(html);
  return m ? m[1] : null;
}
const meta = (html, key) =>
  attr(html, new RegExp(`<meta\\s+(?:name|property)="${key.replace(/[:.]/g, '\\$&')}"\\s+content="([^"]*)"`));

function navLinks(html) {
  const block = /id="navlinks"[^>]*>([\s\S]*?)<\/div>/.exec(html);
  if (!block) return null;
  return [...block[1].matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
}

/* PNG dimensions live at fixed offsets in the IHDR chunk: width at 16,
   height at 20, both big-endian uint32. No image library needed. */
function pngSize(rel) {
  const buf = fs.readFileSync(path.join(ROOT, rel));
  assert.equal(buf.toString('ascii', 1, 4), 'PNG', `${rel} is not a PNG`);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const failures = [];
function check(label, fn) {
  try { fn(); } catch (err) { failures.push(`${label}\n    ${err.message.split('\n')[0]}`); }
}

/* --------------------------------------------------------------- sitemap */

const sitemap = read('sitemap.xml');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const sitemapPaths = locs.map((loc) => loc.replace(SITE, '') || '/');

/* Public pages: every publishable index.html at the root or one level down,
   except the 404 and anything under tools/ or a scratch concepts route. */
const publicPages = [...publishable]
  .filter((p) => /^([^/]+\/)?index\.html$/.test(p))
  .filter((p) => !/^(tools|vault|notes)\//.test(p));

check('every sitemap <loc> is a publishable page', () => {
  for (const p of sitemapPaths) {
    assert.ok(publishable.has(fileFor(p)), `${p} -> ${fileFor(p)} would 404`);
  }
});

check('every public page is in the sitemap', () => {
  for (const file of publicPages) {
    const url = '/' + file.replace(/index\.html$/, '');
    assert.ok(sitemapPaths.includes(url), `${url} is live but not in sitemap.xml`);
  }
});

/* ------------------------------------------------------ per-page metadata */

for (const urlPath of sitemapPaths) {
  const file = fileFor(urlPath);
  if (!fs.existsSync(path.join(ROOT, file))) continue;
  const html = read(file);
  const loc = SITE + urlPath;

  check(`${urlPath} has a meta description`, () => {
    assert.ok(meta(html, 'description'), 'missing <meta name="description">');
  });
  check(`${urlPath} canonical matches its sitemap <loc>`, () => {
    assert.equal(attr(html, /<link\s+rel="canonical"\s+href="([^"]+)"/), loc);
  });
  check(`${urlPath} has og:title and og:url`, () => {
    assert.ok(meta(html, 'og:title'), 'missing og:title');
    assert.equal(meta(html, 'og:url'), loc);
  });
  check(`${urlPath} uses a large twitter card`, () => {
    assert.equal(meta(html, 'twitter:card'), 'summary_large_image');
  });
  check(`${urlPath} has a 1200x630 og:image that will publish`, () => {
    const img = meta(html, 'og:image');
    assert.ok(img, 'missing og:image');
    assert.ok(img.startsWith(SITE + '/'), `og:image must be absolute on ${SITE}: ${img}`);
    const rel = img.replace(SITE + '/', '');
    assert.ok(publishable.has(rel), `${rel} would 404`);
    assert.deepEqual(pngSize(rel), { width: 1200, height: 630 });
    assert.equal(meta(html, 'og:image:width'), '1200');
    assert.equal(meta(html, 'og:image:height'), '630');
    assert.ok(meta(html, 'og:image:alt'), 'missing og:image:alt');
    assert.equal(meta(html, 'twitter:image'), img);
  });
}

/* ------------------------------------------------------ nav and footer */

const shellPages = [...publicPages, '404.html'].filter((p) => publishable.has(p));
const reference = navLinks(read('index.html'));

for (const file of shellPages) {
  const html = read(file);
  check(`${file} carries the same nav as home`, () => {
    assert.deepEqual(navLinks(html), reference);
  });
  check(`${file} has the site footer`, () => {
    assert.match(html, /<footer class="sitefoot"/);
  });
}

/* ---------------------------------------------------------------- links */

for (const file of shellPages) {
  const html = read(file);
  check(`${file}: every root-relative link would publish`, () => {
    const refs = [...html.matchAll(/(?:href|src)="(\/[^"#?]*)/g)].map((m) => m[1]);
    /* srcset holds several URLs, each followed by a width or a density */
    for (const m of html.matchAll(/srcset="([^"]+)"/g)) {
      for (const part of m[1].split(',')) {
        const url = part.trim().split(/\s+/)[0];
        if (url.startsWith('/')) refs.push(url.split(/[#?]/)[0]);
      }
    }
    for (const ref of new Set(refs)) {
      if (ref.startsWith('//')) continue; // protocol-relative, not ours
      assert.ok(publishable.has(fileFor(ref)), `${ref} -> ${fileFor(ref)} would 404`);
    }
  });
}

/* ------------------------------------------------------- reachability */

/* Every page in the sitemap has to be reachable from home. On 2026-09-29
   the home jar — then the only link to /atlas/ anywhere on the site — was
   pointed at /jar/, which would have left the Atlas live but unlinked. */
check('every sitemap page is linked from home', () => {
  const home = read('index.html');
  const linked = new Set([...home.matchAll(/href="(\/[^"#?]*)/g)].map((m) => m[1]));
  for (const p of sitemapPaths) {
    if (p === '/') continue;
    assert.ok(linked.has(p), `${p} is in the sitemap but nothing on home links to it`);
  }
});

/* ------------------------------------------------------------- llms.txt */

const llms = read('llms.txt');

check('llms.txt names every sitemap page', () => {
  for (const p of sitemapPaths) {
    if (p === '/') continue;
    assert.ok(llms.includes(p), `llms.txt never mentions ${p}`);
  }
});

check('llms.txt advertises nothing that 404s as live', () => {
  /* Only the "Live now" block is a claim that a page exists. Planned pages
     are allowed to not exist yet — that is what the heading says. */
  const live = /Live now:\n([\s\S]*?)(?:\n\n|$)/.exec(llms);
  assert.ok(live, 'llms.txt has no "Live now:" block');
  for (const m of live[1].matchAll(/^- (\/[^\s:]*)/gm)) {
    assert.ok(publishable.has(fileFor(m[1])), `llms.txt lists ${m[1]} as live, but it would 404`);
  }
  assert.doesNotMatch(llms, /\/notes\/:?\s*\(PIN-gated\)/, 'llms.txt still advertises the removed /notes/');
});

/* -------------------------------------------------------------- report */

if (failures.length) {
  console.error(`site-meta: ${failures.length} check(s) failed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exitCode = 1;
} else {
  console.log(`site-meta: all checks pass (${sitemapPaths.length} pages, ${shellPages.length} shells)`);
}

/* Run under `node --test` too, like the other files here. */
require('node:test')('site metadata agrees with the site', () => {
  assert.equal(failures.length, 0, failures.join('\n'));
});
