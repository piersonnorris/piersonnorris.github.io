/* Build the password-gated tracker in CI or from the ignored local snapshot. This file never prints holdings,
   calendar data, spreadsheet IDs, credentials, or the tracker password. */
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

function render(payload) {
  const source = fs.readFileSync(TEMPLATE, 'utf8');
  const next = source.replace(
    /var PAYLOAD = \/\*__PAYLOAD__\*\/null\/\*__END__\*\//,
    `var PAYLOAD = /*__PAYLOAD__*/${JSON.stringify(payload)}/*__END__*/`
  );
  if (next === source) fail('Tracker template payload marker was not found.');
  fs.writeFileSync(OUTPUT, next);
}

function reuseEncryptedPayload() {
  if (!fs.existsSync(OUTPUT)) fail('Existing encrypted tracker output was not found.');
  const existing = fs.readFileSync(OUTPUT, 'utf8');
  const match = existing.match(/var PAYLOAD = (?:\/\*__PAYLOAD__\*\/)?(\{[^\r\n]+\})(?:\/\*__END__\*\/)?;/);
  if (!match) fail('Existing encrypted tracker payload was not found.');
  let payload;
  try { payload = JSON.parse(match[1]); }
  catch { fail('Existing encrypted tracker payload is invalid.'); }
  if (!payload || !payload.salt || !payload.iv || !payload.ct || !payload.iter) {
    fail('Existing tracker payload is not a supported encrypted payload.');
  }
  render(payload);
}

async function buildFromLocalSnapshot() {
  const handoffPath = path.join(ROOT, 'private', 'STOCK_HANDOFF.md');
  const pinPath = path.join(ROOT, 'private', '.tracker-pin');
  if (!fs.existsSync(handoffPath) || !fs.existsSync(pinPath)) fail('Private local tracker inputs were not found.');
  const handoff = fs.readFileSync(handoffPath, 'utf8');
  const match = /## Machine-readable snapshot[\s\S]*?```json\s*([\s\S]*?)```/.exec(handoff);
  if (!match) fail('Private local tracker snapshot was not found.');
  let snapshot;
  try { snapshot = JSON.parse(match[1]); }
  catch { fail('Private local tracker snapshot is invalid JSON.'); }
  if (!snapshot || !Array.isArray(snapshot.holdings) || !snapshot.holdings.length) fail('Private local tracker snapshot has no holdings.');
  const password = fs.readFileSync(pinPath, 'utf8').trim();
  if (!password) fail('Private local tracker PIN is empty.');
  const quotes = await fetchQuotes([snapshot]);
  render(seal({ generatedAt: new Date().toISOString(), months: [snapshot], quotes, dividendCalendar: loadCalendar() }, password));
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
  if (process.argv.includes('--local-snapshot')) {
    await buildFromLocalSnapshot();
    return;
  }
  if (process.argv.includes('--reuse-payload')) {
    reuseEncryptedPayload();
    return;
  }
  const password = process.env.TRACKER_PASSWORD;
  if (!password) fail('TRACKER_PASSWORD is required.');
  const months = await fetchMonths();
  if (!months.length) fail('No month-named tabs were found.');
  const quotes = await fetchQuotes(months);
  const payload = seal({ generatedAt: new Date().toISOString(), months, quotes, dividendCalendar: loadCalendar() }, password);
  render(payload);
}

main().catch((error) => { console.error('Tracker build failed:', error.message); process.exitCode = 1; });
