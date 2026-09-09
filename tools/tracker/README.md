# tools/tracker/ — the portfolio tracker

Six tabs: Positions, Dividends (income + 12-month payout projection + calendar), Calendar (month grid, private events, `.ics` export), Projects (the shared task board + vault graph), Charts (price/volume with EMA 10/20/50/200 toggles), Obsidian (the encrypted stock-note vault).

## Two payload shapes

`build.js` can produce either, and the page reads which one it got:

- **Sealed** (`{salt,iv,ct,iter}`) — holdings under AES-256-GCM, PBKDF2 600k. The PIN *is* the key: nothing renders until it is typed, and the published file is safe in a public repo because it is ciphertext.
- **Open** (`{open:true,data:{…}}`, from `--public`) — holdings in the **clear**. No lock screen; the page boots straight in. Chosen deliberately by Pierce on 2026-09-08.

**What `--public` actually means.** `index.html` is a tracked file in a public repo. An open build puts real positions, share counts and totals on the open web and into git history, where deleting them later does not take them back. The censor toggle (below) hides figures on screen; it is not a secrecy mechanism, and View Source defeats it in one keystroke. That is understood and intended, not an oversight.

## The censor toggle

Header button, next to the theme switch. **Default on**, remembered per browser in `pn.tracker.censor`. It stars out every figure that says *how much is held* — position values, share and coin counts, cost basis, P/L, dividend income, portfolio totals, and the same numbers inside chart legends, tooltips and screen-reader tables.

It deliberately leaves **market data legible**: a stock's close, its range, its session move. Those are public information, identical on every screen in the world, and starring them would break the price chart to protect nothing. Price stays visible while quantity does not, so price × quantity cannot be reconstructed on screen.

Two things it does not do: chart *shapes* still show relative proportions (a donut slice is still half a donut), and it never touches the page source. `assets/js/charts.js` holds the switch (`PNCharts.censor`) and the raw formatters (`moneyRaw`/`pctRaw`) that bypass it; `charts.test.js` asserts the split both ways.

## The two pages

- **`index.template.html`** — the committed source. `PAYLOAD` is `null`, so it runs as a **demo**: the login button deliberately bypasses the PIN (per Pierce, 2026-09-05 — "for now") and boots fabricated sample data, synthetic price history, seeded dividends, and an in-memory board. Nothing real is reachable from this file.
- **`index.html`** — **generated, never hand-edited.** `build.js` replaces the payload marker with a sealed or an open payload. With either present the fake-login path is dead code.

## Building

```bash
node tools/tracker/build.js --local-snapshot            # sealed, from private/STOCK_HANDOFF.md + private/.tracker-pin
node tools/tracker/build.js --local-snapshot --public   # OPEN — real holdings in plaintext, no PIN
node tools/tracker/build.js --reuse-payload             # re-render template changes around the existing payload (either shape)
node tools/tracker/build.js                             # CI mode: Google Sheet via env secrets (see workflow)
```

Inputs that must NEVER be committed: `private/STOCK_HANDOFF.md` (holdings), `private/.tracker-pin`, `private/tracker/dividend-calendar.json` (researched ex/pay dates — baked into the payload as `dividendCalendar`), and `private/.twelvedata-key` (market-data key; when present, `build.js` fetches a spot price per symbol — chunked 8/minute for the free tier, so a build waits ~1 min per 8 symbols — and bakes the map into the payload as `quotes`; env `TWELVEDATA_API_KEY` does the same in CI).

After a **sealed** build, grep the output for known tickers/amounts **and the API key** to confirm nothing leaked in plaintext. After an **open** build only the API-key check applies — the tickers and amounts are supposed to be there, which is exactly why that build needs a deliberate decision behind it every time.

## Data flow after unlock

decrypted payload → `PNPrices.resolve` (baked quotes → cache → provider key → manual) → `valuate` → headline, charts, per-platform tables → dividend map (payload defaults + user edits) → dividend charts + calendar events → encrypted stock vault (notes, journals, board, private events) via `PNNotes`.

## Staying unlocked on one device

The lock screen has an opt-in **Stay unlocked on this device** checkbox (encrypted build only — the demo page has no PIN to remember). The PIN *is* the decryption key, so it cannot be removed, only remembered: on unlock the page generates a non-extractable AES-GCM key, stores it in IndexedDB (`pn-tracker-unlock`), and keeps the PIN encrypted under it. The PIN is never written in the clear, never leaves the browser profile, and is never sent anywhere. The record also carries the payload's `salt`, so any rebuild that reseals the holdings retires the saved unlock and asks for the PIN once instead of reporting a wrong PIN nobody typed. **Lock deletes the record** — that is the way to un-remember a device.

The tradeoff is deliberate and local: anyone who can use that browser profile is inside. Do not tick it on a shared or public machine.

`calendar.test.js` and `taskboard.test.js` are plain-Node tests; run both before committing changes here.
