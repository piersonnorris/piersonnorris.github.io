# ASSET TRACKER — feature spec (public-repo-safe edition)

The gated portfolio dashboard at `/tools/tracker/`. Adapted from Pierson's full private spec (lives in his Google Drive: "assettrackingwebsitespec.md") for a public repo: **all real holdings replaced with sample data, and the spreadsheet ID moved to a secret.** ChatGPT: if you need the real data snapshot or the click-by-click Google Cloud screenshots, ask Pierson to paste from that private doc — never commit any of it.

Build this at Milestone 4, after the rest of the site works.

---

## 1. What it is

Pierson tracks his investment/crypto holdings across five platforms in a Google Sheet ("Asset Tracking"), one tab per month. The site shows this data live — but the page is password-gated and the repo/public build never contain readable numbers.

## 2. Architecture (locked)

```
Google Sheet (private)
   │  read-only, service account (JSON key in Actions secret)
   ▼
GitHub Action  — cron (daily) + workflow_dispatch (manual refresh)
   │  1. fetch tabs matching /^(January|…|December) \d{4}$/
   │  2. parse → normalized holdings JSON
   │  3. inject JSON into the dashboard template
   │  4. StatiCrypt-encrypt the whole page with TRACKER_PASSWORD
   ▼
commit ONLY tools/tracker/index.html (ciphertext)  →  GitHub Pages serves it
```

Why this shape: GitHub Pages is static and the repo is public (free Pages), so a browser can never hold the service-account key and plaintext data can never be committed. StatiCrypt (AES-256, client-side decrypt on password entry) means the published file is safe even though the repo is public. The old alternatives in the private spec (client-side API key, serverless function) are **superseded** by this.

### Secrets & variables (GitHub → Settings → Secrets and variables → Actions)

| Name | Type | Contents |
|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Secret | Full JSON key file contents |
| `TRACKER_PASSWORD` | Secret | The gate password (Pierson sets it; never appears in chat or code) |
| `SHEET_ID` | Secret | The spreadsheet ID |
| `DIVIDEND_CALENDAR_JSON` | Secret | Optional researched dividend data; never commit a holdings-linked calendar |

The Action is the ONLY place these are read. `.gitignore` already blocks `secrets/` and `*service-account*.json` as a second line of defense for local testing.

### Dividend calendar payload

The encrypted build may receive `DIVIDEND_CALENDAR_JSON` in this shape. Keep only issuer-confirmed dates; a historical cadence is not a confirmed future payment.

```json
{
  "TICKER": {
    "annual": 0.00,
    "exDate": "YYYY-MM-DD",
    "payDate": "YYYY-MM-DD",
    "frequency": "quarterly"
  }
}
```

After tracker unlock, the dashboard can export the confirmed dates as a `.ics` file for import into the owner's private Google Calendar. The dashboard PIN protects access to the calendar on the site; Google Calendar access remains governed by the owner's Google account.

The same unlock also synchronizes dividend-paying tickers and a linked `Dividend calendar` Markdown note into the encrypted stock-notes vault. Dividend edits stay in memory until they are written into that vault; they are never stored as readable browser data.

## 3. Source data shape

### 3.1 Tabs
One tab per month, named `<Month> <Year>` (e.g. `August 2026`). Discover tabs dynamically via the regex above — never hardcode names. One legacy tab (`July 2026`) uses an older flat layout; skip it in v1 (optionally render read-only later).

### 3.2 Current schema (all tabs from August 2026 onward)
Row-oriented, five platform sections in fixed order **Sofi → Webull → Robinhood → Gemini → GoMining**:

```
Row 1   Title:  "Stock flows — <Month> <Year> update"   (spans A:D)
Row 2   Note:   free text                                (spans A:D)
Row 3   (blank)
Row 4   Section header:  <Platform> | Amount | Unit | Notes
Row 5+  Data rows:       <ticker/label> | <number> | Shares|Units|USD | <notes>
(blank row ends a section; next section header follows)
```

**Column meanings** — A: ticker or free-text label ("Cash", "Robo (auto-invest sub-account)", "NVDA $230 Call (option)"). B: numeric amount. C: unit — `Shares` (equity count), `Units` (coin count), `USD` (already a dollar figure). D: notes, may be blank.

**Parsing rule:** walk rows after row 3. A row is a section header when col A equals one of the five platform names AND col B = "Amount". Rows until the next fully-blank row belong to that platform.

**Mixed units — critical:** you cannot sum column B across rows. Shares, coins, and dollars are mixed. v1 shows amounts with their units and does NOT compute a total portfolio value (live-price conversion is a deliberate later phase — no price API chosen yet).

### 3.3 Normalized model (what the Action emits)

```json
{
  "tab": "August 2026", "month": "August", "year": 2026,
  "note": "<row 2 text>", "fetchedAt": "2026-08-23T11:00:00Z",
  "holdings": [
    {"platform": "Sofi", "label": "TICK", "amount": 12.5, "unit": "Shares", "notes": ""}
  ]
}
```

### 3.4 Sample data (SAFE — fabricated; use for the template, tests, and the public screenshot)

| Platform | Label | Amount | Unit | Notes |
|---|---|---|---|---|
| Sofi | AAPL | 4.2 | Shares | |
| Sofi | VTI | 10 | Shares | |
| Sofi | Robo (auto-invest) | 250.00 | USD | robo sub-account |
| Sofi | SOL (crypto) | 0.8 | Units | |
| Webull | Cash | 120.00 | USD | no open positions |
| Robinhood | SPY $500 Call (option) | 95.00 | USD | contract value |
| Robinhood | VDE | 2.1 | Shares | |
| Gemini | ETH | 0.05 | Units | |
| Gemini | SOL | 1.4 | Units | |
| GoMining | Total value | 15.00 | USD | |

## 4. Platform colors (carry into badges, section accents, chart fills)

| Platform | Hex | Note |
|---|---|---|
| Sofi | `#00A2C7` | brand blue |
| Webull | `#001B39` | brand navy, deliberately darker (Pierson's preference) — on the dark site, pair with a lighter border/text so it stays visible |
| Robinhood | `#00C805` | brand green |
| Gemini | `#F5A623` | orange — Pierson's stated preference over Gemini's real teal |
| GoMining | `#7C3AED` | purple — Pierson's preference |

Tint for fills: blend 85% toward the page background rather than white (dark site). Badges: color dot + mono label beats solid fills at small sizes.

## 5. Dashboard UI (inside the gate; site design system applies)

- **Month switcher** — mono tab strip of discovered months, newest active.
- **Platform sections** — card per platform: color dot + name + holding count; rows: label / amount+unit (tabular-nums, mono) / notes muted.
- **Header** — "Fetched <date>" timestamp from `fetchedAt` + the sheet's own note line.
- **No totals row** (see mixed-units rule) — a muted footnote explains why: "Counts, not valuations — live pricing is a later phase."
- Wrapper page (`/tools/tracker/`) carries `<meta name="robots" content="noindex">` and is excluded from sitemap.xml.

## 6. Action workflow — template to adapt

```yaml
name: refresh-tracker
on:
  schedule: [{cron: "0 11 * * *"}]   # daily ~6am Chicago
  workflow_dispatch: {}
permissions: {contents: write}
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: {node-version: 20}
      - run: npm install googleapis staticrypt
      - run: node tools/tracker/build.js   # fetch → parse → inject → encrypt
        env:
          GOOGLE_SERVICE_ACCOUNT_JSON: ${{ secrets.GOOGLE_SERVICE_ACCOUNT_JSON }}
          SHEET_ID: ${{ secrets.SHEET_ID }}
          TRACKER_PASSWORD: ${{ secrets.TRACKER_PASSWORD }}
      - run: |
          git config user.name "tracker-bot" && git config user.email "actions@github.com"
          git add tools/tracker/index.html
          git diff --cached --quiet || (git commit -m "tracker: refresh" && git push)
```

`build.js` responsibilities: auth via the JSON in env (write to a temp file OUTSIDE the repo dir or parse in-memory), `spreadsheets.get` for tab list, `values.get` per month tab (`'<tab>'!A1:D200`), run the §3.2 parser, render `index.template.html` (committed, sample data only) with real JSON, then StatiCrypt CLI → overwrite `tools/tracker/index.html`. The template with sample data doubles as the public screenshot source.

## 7. Security checklist (part of M4 acceptance)

- [ ] Repo history contains zero real holdings, zero key material, zero password (grep before merging).
- [ ] `index.template.html` contains sample data only.
- [ ] Action logs don't echo secrets (no `set -x`, no printing env).
- [ ] Wrong password → StatiCrypt prompt again; page source shows ciphertext only.
- [ ] Sheet shared with the service account as **Viewer** only.
- [ ] If the key ever leaks: revoke in Google Cloud Console → Credentials, regenerate, update the secret.
