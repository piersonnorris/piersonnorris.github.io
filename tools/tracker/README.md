# tools/tracker/ — the encrypted portfolio tracker

Six tabs behind one PIN: Positions, Dividends (income + 12-month payout projection + calendar), Calendar (month grid, private events, `.ics` export), Projects (the shared task board + vault graph), Charts (price/volume with EMA 10/20/50/200 toggles), Obsidian (the encrypted stock-note vault).

## The two pages

- **`index.template.html`** — the committed source. `PAYLOAD` is `null`, so it runs as a **demo**: the login button deliberately bypasses the PIN (per Pierce, 2026-09-05 — "for now") and boots fabricated sample data, synthetic price history, seeded dividends, and an in-memory board. Nothing real is reachable from this file.
- **`index.html`** — **generated, never hand-edited.** `build.js` replaces the payload marker with real holdings sealed under AES-256-GCM (PBKDF2, 600k iterations). With a payload present the fake-login path is dead code and the PIN is required.

## Building

```bash
node tools/tracker/build.js --local-snapshot   # from private/STOCK_HANDOFF.md + private/.tracker-pin
node tools/tracker/build.js --reuse-payload    # re-render template changes around the existing ciphertext
node tools/tracker/build.js                    # CI mode: Google Sheet via env secrets (see workflow)
```

Inputs that must NEVER be committed: `private/STOCK_HANDOFF.md` (holdings), `private/.tracker-pin`, `private/tracker/dividend-calendar.json` (researched ex/pay dates — baked into the encrypted payload as `dividendCalendar`), and `private/.twelvedata-key` (market-data key; when present, `build.js` fetches a spot price per symbol — chunked 8/minute for the free tier, so a build waits ~1 min per 8 symbols — and bakes the map into the payload as `quotes`; env `TWELVEDATA_API_KEY` does the same in CI). After every build, grep the output for known tickers/amounts **and the API key** to confirm nothing leaked in plaintext.

## Data flow after unlock

decrypted payload → `PNPrices.resolve` (baked quotes → cache → provider key → manual) → `valuate` → headline, charts, per-platform tables → dividend map (payload defaults + user edits) → dividend charts + calendar events → encrypted stock vault (notes, journals, board, private events) via `PNNotes`.

`calendar.test.js` and `taskboard.test.js` are plain-Node tests; run both before committing changes here.
