'use strict';

/* Render the share cards (ROADMAP U5) to assets/img/og/<page>.png.

   Social crawlers — LinkedIn, iMessage, Slack, X — do not reliably render
   SVG og:images, so the cards have to be real rasters. This drives headless
   Chrome against tools/og/card.html, one screenshot per page. No npm
   dependency: Chrome is already installed, and that is the whole toolchain.

     node tools/og/render.js            every card
     node tools/og/render.js jar atlas  just those

   Each PNG is checked for the exact 1200x630 size before the script calls it
   done; tools/tests/site-meta.test.js checks the same thing on every run.

   CHROME=<path> overrides the browser location. */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..', '..');
const TEMPLATE = path.join(__dirname, 'card.html');
const OUT = path.join(ROOT, 'assets', 'img', 'og');
const PAGES = ['home', 'jar', 'atlas', 'athletics'];
const WIDTH = 1200;
const HEIGHT = 630;

const CANDIDATES = [
  process.env.CHROME,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium'
].filter(Boolean);

function findChrome() {
  const found = CANDIDATES.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error('Chrome not found. Set CHROME=<path to chrome executable>.');
  }
  return found;
}

function pngSize(file) {
  const buf = fs.readFileSync(file);
  if (buf.toString('ascii', 1, 4) !== 'PNG') throw new Error(`${file} is not a PNG`);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function render(chrome, page) {
  const url = `${pathToFileURL(TEMPLATE).href}?page=${encodeURIComponent(page)}`;
  const out = path.join(OUT, `${page}.png`);
  /* A throwaway profile, so a running Chrome window is never touched and
     no extension or cached state leaks into the render. */
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pn-og-'));

  try {
    execFileSync(chrome, [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${profile}`,
      `--window-size=${WIDTH},${HEIGHT}`,
      '--force-device-scale-factor=1',
      /* Web fonts arrive over the network; give them time to settle so the
         card is never captured in a fallback face. */
      '--virtual-time-budget=8000',
      '--run-all-compositor-stages-before-draw',
      `--screenshot=${out}`,
      url
    ], { stdio: 'ignore', timeout: 60_000 });
  } finally {
    fs.rmSync(profile, { recursive: true, force: true });
  }

  const size = pngSize(out);
  if (size.width !== WIDTH || size.height !== HEIGHT) {
    throw new Error(`${page}.png came out ${size.width}x${size.height}, expected ${WIDTH}x${HEIGHT}`);
  }
  return { page, out, bytes: fs.statSync(out).size };
}

function main() {
  const asked = process.argv.slice(2);
  const pages = asked.length ? asked : PAGES;
  const unknown = pages.filter((p) => !PAGES.includes(p));
  if (unknown.length) {
    console.error(`Unknown card(s): ${unknown.join(', ')}. Known: ${PAGES.join(', ')}`);
    process.exit(1);
  }

  const chrome = findChrome();
  fs.mkdirSync(OUT, { recursive: true });

  for (const page of pages) {
    const r = render(chrome, page);
    console.log(`${r.page.padEnd(10)} ${WIDTH}x${HEIGHT}  ${(r.bytes / 1024).toFixed(0)} KB  ${path.relative(ROOT, r.out)}`);
  }
}

main();
