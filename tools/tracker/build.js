/* Build the tracker in CI or from the ignored local snapshot. This file never prints holdings,
   calendar data, spreadsheet IDs, credentials, or the tracker password.

   Two output shapes:
     default    holdings sealed under AES-256-GCM; the PIN is the key, and the
                published file is safe in a public repo because it is ciphertext.
     --public   holdings written in the CLEAR. The generated index.html is a
                tracked file in a public repo, so this puts real positions,
                counts and totals on the open web and into git history, where
                deleting them later does not take them back. Pierce chose this
                deliberately (2026-09-08); the page's censor toggle stars the
                figures on screen but is not a secrecy mechanism and cannot be. */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const TEMPLATE = path.join(__dirname, 'index.template.html');
const OUTPUT = path.join(__dirname, 'index.html');
const PLATFORMS = ['Sofi', 'Webull', 'Robinhood', 'Gemini', 'GoMining'];
const MONTH = /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/;

function fail(message) { throw new Error(message); }
function text(value) { return String(value == null ? '' : value).trim(); }
function amount(value) {
  const parsed = Number(String(value == null ? '' : value).replace(/[$,]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseTab(name, rows) {
  const holdings = [];
  let platform = null;
  for (const row of rows.slice(3)) {
    const cells = [text(row[0]), text(row[1]), text(row[2]), text(row[3])];
    if (!cells.some(Boolean)) { platform = null; continue; }
    if (PLATFORMS.includes(cells[0]) && cells[1].toLowerCase() === 'amount') {
      platform = cells[0];
      continue;
    }
    if (!platform || !cells[0] || amount(cells[1]) == null) continue;
    holdings.push({ platform, label: cells[0], amount: amount(cells[1]), unit: cells[2] || 'USD', notes: cells[3] });
  }
  const match = name.match(MONTH);
  return {
    tab: name,
    month: match ? match[1] : name,
    year: match ? Number(name.slice(-4)) : null,
    note: text(rows[1] && rows[1][0]),
    fetchedAt: new Date().toISOString(),
    holdings
  };
}

function loadCalendar() {
  let source = process.env.DIVIDEND_CALENDAR_JSON;
  const privateFile = path.join(ROOT, 'private', 'tracker', 'dividend-calendar.json');
  if (!source && fs.existsSync(privateFile)) source = fs.readFileSync(privateFile, 'utf8');
  if (!source) return {};
  try {
    const value = JSON.parse(source);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { fail('DIVIDEND_CALENDAR_JSON is not valid JSON.'); }
}

/* ---- Google Calendar snapshot (ROADMAP R9) --------------------------
   Read-only events pulled from the real Google Calendar. build.js has
   no OAuth of its own and never will (see docs/PORTFOLIO_CALENDAR_PLAN.md
   "Known boundary") — a session with the connector snapshots events into
   private/tracker/google-calendar.json (gitignored), and this just bakes
   that snapshot into the encrypted payload, same as dividend dates.
   Missing/invalid input degrades to an empty list; the build never fails
   over stale or absent calendar data.

   NEVER in an open build. These are real personal events -- course
   times, deadlines, instructor names, room numbers, who is where and
   when -- and an open payload is plaintext in a tracked file. This seam
   was written for the sealed build, where the PIN is the only reader;
   --public has no reader at all. An open build gets an empty list, and
   the page hides the Calendar tab to match (index.template.html, OPEN).
   Found 2026-09-10: a --public build had already published 130 events. */
function loadGoogleEvents(openBuild) {
  if (openBuild) return [];
  let source = process.env.GOOGLE_CALENDAR_EVENTS_JSON;
  const privateFile = path.join(ROOT, 'private', 'tracker', 'google-calendar.json');
  if (!source && fs.existsSync(privateFile)) source = fs.readFileSync(privateFile, 'utf8');
  if (!source) return [];
  try {
    const value = JSON.parse(source);
    if (!Array.isArray(value)) return [];
    return value
      .filter((event) => event && text(event.date) && text(event.title))
      .map((event) => ({ id: text(event.id) || `google-${text(event.date)}-${text(event.title)}`, date: text(event.date), title: text(event.title), notes: text(event.notes) }));
  } catch { return []; }
}

/* ---- Obsidian vault snapshot (ROADMAP R15) -------------------------
   Same shape as the Google Calendar seam above and the same boundary:
   the site can't read a folder on disk, so tools/obsidian-sync.js reads
   the real vault once and writes a bundle. Drop that bundle at
   private/tracker/obsidian-vault.json (gitignored) and it rides along
   inside the encrypted payload, so the tracker can offer to merge those
   notes into its vault without a file to hand-pick.

   Only titles, tags and bodies travel, and only inside the AES payload —
   nothing here lands in the repo in the clear. Missing or malformed
   input degrades to null; the build never fails over vault data.

   That sentence is only true because of the guard below. An open
   payload is plaintext, so --public would have written every synced
   note body straight into a tracked file. Nothing had been dropped at
   private/tracker/obsidian-vault.json yet when this was caught
   (2026-09-10), so it never fired — but it was one file away. */
function loadObsidianVault(openBuild) {
  if (openBuild) return null;
  let source = process.env.OBSIDIAN_VAULT_JSON;
  const privateFile = path.join(ROOT, 'private', 'tracker', 'obsidian-vault.json');
  if (!source && fs.existsSync(privateFile)) source = fs.readFileSync(privateFile, 'utf8');
  if (!source) return null;
  try {
    const bundle = JSON.parse(source);
    if (!bundle || bundle.format !== 'pn-vault-bundle' || !Array.isArray(bundle.notes)) return null;
    const notes = bundle.notes
      .filter((note) => note && text(note.title))
      .map((note) => ({
        path: text(note.path),
        title: text(note.title),
        body: String(note.body == null ? '' : note.body),
        tags: Array.isArray(note.tags) ? note.tags.map(text).filter(Boolean) : [],
        ticker: text(note.ticker).toUpperCase() || null,
        created: text(note.created),
        updated: text(note.updated)
      }));
    if (!notes.length) return null;
    console.log(`Baked an Obsidian bundle of ${notes.length} note${notes.length === 1 ? '' : 's'} into the payload.`);
    return { format: 'pn-vault-bundle', version: 1, generatedAt: text(bundle.generatedAt), source: text(bundle.source), count: notes.length, notes };
  } catch { return null; }
}

/* ---- baked quotes (ROADMAP R5) -------------------------------------
   If a Twelve Data key is available (env TWELVEDATA_API_KEY, or the
   ignored local file private/.twelvedata-key), fetch a spot price for
   every holding symbol and bake the map into the encrypted payload as
   `quotes`. The page then values itself with zero browser API calls.
   The key is never printed and never written to the output. Failures
   degrade to an empty map — counts still render, values wait. */

function loadQuoteKey() {
  const env = text(process.env.TWELVEDATA_API_KEY);
  if (env) return env;
  const keyFile = path.join(ROOT, 'private', '.twelvedata-key');
  if (fs.existsSync(keyFile)) return fs.readFileSync(keyFile, 'utf8').trim();
  return '';
}

function quoteSymbols(months) {
  const seen = new Set();
  for (const month of months) {
    for (const holding of month.holdings || []) {
      const unit = text(holding.unit).toLowerCase();
      if (unit !== 'shares' && unit !== 'units') continue;
      const sym = text(holding.label).replace(/\([^)]*\)/g, '').trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, '');
      if (!sym) continue;
      seen.add(unit === 'units' ? `${sym}/USD` : sym);
    }
  }
  return [...seen];
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchQuotes(months) {
  const key = loadQuoteKey();
  if (!key) return {};
  const symbols = quoteSymbols(months);
  if (!symbols.length) return {};
  const quotes = {};
  const CHUNK = 8; // free tier: 8 API credits per minute
  for (let i = 0; i < symbols.length; i += CHUNK) {
    const chunk = symbols.slice(i, i + CHUNK);
    if (i > 0) {
      console.log(`Waiting out the per-minute quote limit (${i}/${symbols.length} fetched)…`);
      await sleep(62000);
    }
    try {
      const res = await fetch(`https://api.twelvedata.com/price?symbol=${encodeURIComponent(chunk.join(','))}&apikey=${encodeURIComponent(key)}`);
      if (!res.ok) continue;
      const json = await res.json();
      if (chunk.length === 1) {
        const price = Number(json && json.price);
        if (Number.isFinite(price) && price > 0) quotes[chunk[0]] = price;
      } else {
        for (const sym of chunk) {
          const price = Number(json && json[sym] && json[sym].price);
          if (Number.isFinite(price) && price > 0) quotes[sym] = price;
        }
      }
    } catch { /* leave this chunk unpriced; manual entry still works */ }
  }
  console.log(`Baked quotes for ${Object.keys(quotes).length} of ${symbols.length} symbols.`);
  return quotes;
}

function seal(data, password) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(password, salt, 600000, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final(), cipher.getAuthTag()]);
  return { salt: salt.toString('base64'), iv: iv.toString('base64'), ct: ciphertext.toString('base64'), iter: 600000 };
}

/* The open counterpart to seal(). No key, no ciphertext: the page reads
   payload.data directly and skips its lock screen entirely. */
function publish(data) {
  return { open: true, data };
}

function render(payload) {
  const source = fs.readFileSync(TEMPLATE, 'utf8');
  /* The payload is inlined into a <script> block. A sealed payload is
     base64 and can hold nothing dangerous, but an open one carries note
     bodies and labels verbatim — one '</script>' in a stock note would
     end the script early and blank the page. Escaping '<' costs nothing
     and closes that off; U+2028/9 are escaped for old parsers. */
  const json = JSON.stringify(payload)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  const next = source.replace(
    /var PAYLOAD = \/\*__PAYLOAD__\*\/null\/\*__END__\*\//,
    () => `var PAYLOAD = /*__PAYLOAD__*/${json}/*__END__*/`
  );
  if (next === source) fail('Tracker template payload marker was not found.');
  fs.writeFileSync(OUTPUT, next);
}

function reuseExistingPayload() {
  if (!fs.existsSync(OUTPUT)) fail('Existing tracker output was not found.');
  const existing = fs.readFileSync(OUTPUT, 'utf8');
  const match = existing.match(/var PAYLOAD = (?:\/\*__PAYLOAD__\*\/)?(\{[^\r\n]+\})(?:\/\*__END__\*\/)?;/);
  if (!match) fail('Existing tracker payload was not found.');
  let payload;
  try { payload = JSON.parse(match[1]); }
  catch { fail('Existing tracker payload is invalid.'); }
  const sealed = payload && payload.salt && payload.iv && payload.ct && payload.iter;
  const open = payload && payload.open === true && payload.data;
  if (!sealed && !open) fail('Existing tracker payload is neither a sealed nor an open payload.');
  render(payload);
}

async function buildFromLocalSnapshot(openBuild) {
  const handoffPath = path.join(ROOT, 'private', 'STOCK_HANDOFF.md');
  const pinPath = path.join(ROOT, 'private', '.tracker-pin');
  if (!fs.existsSync(handoffPath)) fail('Private local tracker inputs were not found.');
  if (!openBuild && !fs.existsSync(pinPath)) fail('Private local tracker inputs were not found.');
  const handoff = fs.readFileSync(handoffPath, 'utf8');
  const match = /## Machine-readable snapshot[\s\S]*?```json\s*([\s\S]*?)```/.exec(handoff);
  if (!match) fail('Private local tracker snapshot was not found.');
  let snapshot;
  try { snapshot = JSON.parse(match[1]); }
  catch { fail('Private local tracker snapshot is invalid JSON.'); }
  /* The snapshot block is either one month object or {months: [...]}
     (newest first) once history exists. */
  const months = Array.isArray(snapshot && snapshot.months) ? snapshot.months : [snapshot];
  for (const month of months) {
    if (!month || !Array.isArray(month.holdings) || !month.holdings.length) fail('A private local tracker month has no holdings.');
  }
  let password = null;
  if (!openBuild) {
    password = fs.readFileSync(pinPath, 'utf8').trim();
    if (!password) fail('Private local tracker PIN is empty.');
  }
  const quotes = await fetchQuotes(months);
  const data = { generatedAt: new Date().toISOString(), months, quotes, dividendCalendar: loadCalendar(), googleEvents: loadGoogleEvents(openBuild), obsidianVault: loadObsidianVault(openBuild) };
  render(openBuild ? publish(data) : seal(data, password));
  if (openBuild) warnPublic();
}

/* Loud on purpose, and the one thing this file is allowed to say about
   the holdings: that they are no longer hidden. Still prints no data. */
function warnPublic() {
  console.log('');
  console.log('  !!  OPEN BUILD — tools/tracker/index.html now holds the real');
  console.log('      holdings in plaintext. It is a tracked file in a public');
  console.log('      repo: committing it publishes them, and git history keeps');
  console.log('      them after any later deletion. The page\'s censor toggle');
  console.log('      hides the figures on screen, not in the source.');
  console.log('');
}

async function fetchMonths() {
  const { google } = require('googleapis');
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON || !process.env.SHEET_ID) fail('Missing Google Sheets tracker secrets.');
  let credentials;
  try { credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON); }
  catch { fail('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.'); }
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
  const sheets = google.sheets({ version: 'v4', auth });
  const meta = await sheets.spreadsheets.get({ spreadsheetId: process.env.SHEET_ID, fields: 'sheets.properties.title' });
  const names = (meta.data.sheets || []).map((sheet) => sheet.properties.title).filter((name) => MONTH.test(name));
  const months = [];
  for (const name of names) {
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.SHEET_ID, range: `'${name.replace(/'/g, "''")}'!A1:D200` });
    months.push(parseTab(name, response.data.values || []));
  }
  return months.sort((a, b) => Date.parse(`${b.month} 1, ${b.year}`) - Date.parse(`${a.month} 1, ${a.year}`));
}

async function main() {
  const openBuild = process.argv.includes('--public');
  if (process.argv.includes('--local-snapshot')) {
    await buildFromLocalSnapshot(openBuild);
    return;
  }
  if (process.argv.includes('--reuse-payload')) {
    reuseExistingPayload();
    return;
  }
  const password = process.env.TRACKER_PASSWORD;
  if (!openBuild && !password) fail('TRACKER_PASSWORD is required.');
  const months = await fetchMonths();
  if (!months.length) fail('No month-named tabs were found.');
  const quotes = await fetchQuotes(months);
  const data = { generatedAt: new Date().toISOString(), months, quotes, dividendCalendar: loadCalendar(), googleEvents: loadGoogleEvents(openBuild), obsidianVault: loadObsidianVault(openBuild) };
  render(openBuild ? publish(data) : seal(data, password));
  if (openBuild) warnPublic();
}

/* Exported so the payload seams can be tested without running a build
   (notes-graph.test.js). Running the file still builds, as CI does. */
module.exports = { parseTab, loadCalendar, loadGoogleEvents, loadObsidianVault, quoteSymbols };

if (require.main === module) {
  main().catch((error) => { console.error('Tracker build failed:', error.message); process.exitCode = 1; });
}
