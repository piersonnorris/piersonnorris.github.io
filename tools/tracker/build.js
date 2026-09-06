/* Build the password-gated tracker in CI.  This file never prints holdings,
   calendar data, spreadsheet IDs, credentials, or the tracker password. */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { google } = require('googleapis');

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

function seal(data, password) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(password, salt, 600000, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final(), cipher.getAuthTag()]);
  return { salt: salt.toString('base64'), iv: iv.toString('base64'), ct: ciphertext.toString('base64'), iter: 600000 };
}

async function fetchMonths() {
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
  const password = process.env.TRACKER_PASSWORD;
  if (!password) fail('TRACKER_PASSWORD is required.');
  const months = await fetchMonths();
  if (!months.length) fail('No month-named tabs were found.');
  const payload = seal({ generatedAt: new Date().toISOString(), months, quotes: {}, dividendCalendar: loadCalendar() }, password);
  const source = fs.readFileSync(TEMPLATE, 'utf8');
  const next = source.replace(/var PAYLOAD = \/\*__PAYLOAD__\*\/null\/\*__END__\*\//, `var PAYLOAD = /*__PAYLOAD__*/${JSON.stringify(payload)}/*__END__*/`);
  if (next === source) fail('Tracker template payload marker was not found.');
  fs.writeFileSync(OUTPUT, next);
}

main().catch((error) => { console.error('Tracker build failed:', error.message); process.exitCode = 1; });
