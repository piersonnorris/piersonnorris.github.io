# Portfolio Stock Chart Plan

## Outcome

The portfolio tracker should feel like a focused private market terminal: fast enough to check daily, clear enough to understand at a glance, and careful about keeping holdings and credentials out of the public repository.

The first implementation is now part of the gated **Charts** tab. It charts only included equity positions for the active month and does not expose stock symbols until the tracker has been unlocked.

## Product principles

1. **Private by default.** Holdings stay inside the encrypted tracker payload. API keys stay in browser storage and are never committed or sent to the build workflow.
2. **Useful before complex.** Lead with price direction, volume, range return, and position context. Add comparison and attribution only when their calculation can be explained.
3. **Honest data states.** Clearly distinguish live provider data, cached data, manually entered prices, loading, and unavailable history.
4. **Portfolio-aware.** Show charts only for stocks the user owns and currently includes in the portfolio scope.
5. **Accessible everywhere.** Pointer and keyboard inspection, screen-reader data tables, high-contrast states, and a mobile layout are required features.

## Version 1 — implemented

### Chart workspace

- An owned-stock switcher derived from the active portfolio month.
- A default selection based on the largest priced included equity position.
- Range controls for 1 month, 3 months, 6 months, and 1 year.
- Daily close-price line with a positive/negative area treatment.
- Daily volume bars colored by up/down session when OHLC data is available.
- A dashed reference at the first close in the selected range.
- Pointer crosshair and detail tooltip for date, close, high, low, daily move, and volume.
- Keyboard inspection with Left, Right, Home, and End.
- Summary metrics for range return, high, low, average close, shares owned, and position value.
- Responsive two-column metrics on small screens.
- A disclosure arrow on every stock row that opens its private purchase journal.
- Multiple dated buy-price lots with average buy, tracked cost basis, and tracked unrealized gain/loss.
- Autosaved internal notes stored in the encrypted stock vault and included in Obsidian exports.

### Data behavior

- Twelve Data requests trading-session counts appropriate to each selected range.
- Finnhub requests calendar windows large enough to cover the selected trading range.
- History is cached separately by provider, symbol, and range for 15 minutes.
- Expired history cache entries are pruned after 24 hours.
- Manual pricing still supports portfolio valuation, but the history chart explains that a live market-data source is required.
- Switching symbol or range ignores stale in-flight responses so an older request cannot overwrite the newest selection.

### Security boundary

```text
Encrypted tracker payload
        |
        v
User unlocks tracker --> included equity symbols are derived in memory
                                      |
Browser-only API key -----------------+
                                      |
                                      v
                         read-only history request
                                      |
                                      v
                         15-minute local cache --> SVG chart
```

- The public template contains no real holdings.
- The browser sends a ticker to the configured provider only after unlock.
- Market-data credentials are not brokerage credentials and must remain read-only.
- The generated production tracker remains password protected; the source template remains a non-sensitive shell.
- Purchase lots and internal notes are encrypted in the device-local stock vault; plaintext exists only while unlocked or when the user explicitly exports Markdown for Obsidian.

## Version 2 — portfolio comparison

### Features

- Multi-select comparison mode with every series normalized to 100 at the range start.
- Portfolio aggregate line built from dated share counts and historical closing prices.
- Optional benchmark line, initially the user's chosen broad-market ETF.
- A toggle between **Price return** and **Total return**.
- Dividend event markers sourced from confirmed payment records, with estimated events styled differently.
- A compact legend showing each series' return and contribution over the range.

### Data additions

Add a dated transaction model rather than assuming today's shares were owned for the full range:

```json
{
  "symbol": "SAMPLE",
  "date": "2026-01-15",
  "type": "buy",
  "shares": 2.5,
  "price": 100.00
}
```

Until this history exists, any aggregate portfolio line must be labeled as a **current-holdings simulation**, not historical performance.

## Version 3 — live session view

### Features

- Optional intraday ranges: 1D and 5D.
- Last-updated timestamp and market-session state.
- Automatic refresh while the page is open, with a user-visible pause control.
- Watchlist separate from owned positions.
- Price and percentage alerts stored locally first; external notifications require an explicit service integration.
- Provider adapter interface so a future stock-data MCP or brokerage connector can supply the same normalized quote/history shape.

### Guardrails

- Respect the provider's free-tier request and rate limits.
- Back off after provider errors; never retry continuously.
- Stop polling when the tab is hidden or the tracker is locked.
- Never request trading permissions for a read-only tracker.

## Version 4 — portfolio intelligence

### Features

- Contribution to gain/loss by position.
- Realized versus unrealized return after transactions are available.
- Dividend income overlay and yield-on-cost.
- Allocation drift against user-set targets.
- Volatility, drawdown, and concentration indicators with plain-language explanations.
- Exportable monthly snapshot for the Obsidian vault using the existing encrypted sync path.

These calculations should not ship until transaction history, splits, dividends, fees, and corporate actions reconcile against the source data.

## Provider strategy

The UI consumes one normalized history record regardless of provider:

```json
{
  "date": "2026-08-21",
  "label": "08-21",
  "open": 101.20,
  "high": 104.00,
  "low": 100.80,
  "close": 103.50,
  "value": 103.50,
  "volume": 1234567
}
```

The provider adapter owns authentication, response mapping, rate-limit errors, and unsupported-symbol handling. The chart renderer never receives an API key and never depends on provider-specific fields.

## UI states

Every chart state must have an explicit visual treatment:

| State | Required behavior |
|---|---|
| Locked | Render no holdings, symbols, prices, or provider requests. |
| No equities | Explain that only included stock positions are charted. |
| Setup needed | Link the user conceptually to Price source and explain read-only keys. |
| Loading | Keep the selected ticker/range visible and show what is being requested. |
| Ready | Show data source, range, session count, and cache duration. |
| Empty history | Identify the symbol and suggest changing provider or range. |
| Provider error | Preserve the controls and show a concise provider message. |
| Stale cache | In a future release, show the cached timestamp and offer a manual refresh. |

## Accessibility and responsive requirements

- Chart SVG has an accessible title and description.
- The same daily close series is available in a visually hidden table.
- Stock and range controls expose selected state with `aria-pressed`.
- Tooltips are available through both pointer and keyboard interaction.
- Color never carries the only indication of gain or loss; signed numbers remain visible.
- Focus rings must remain visible against the dark background.
- At 320 CSS pixels wide, controls may scroll horizontally but the page must not overflow.
- Reduced-motion preferences must be respected if chart transitions are introduced later.

## Validation plan

### Automated checks

- Parse-check `assets/js/prices.js`, `assets/js/charts.js`, and the template's inline application script.
- Build the tracker with fabricated sample input and verify that the encrypted output contains no sample plaintext after encryption.
- Test provider response mapping with successful, empty, malformed, and rate-limited fixtures.
- Test each range's cache key and the 15-minute expiration boundary.
- Test stale-response protection by changing ticker and range before the first request resolves.
- Test range return, high, low, and average calculations with fixed fixtures.
- Test purchase-journal encryption and Markdown export/import round trips without duplicated generated tables.

### Manual checks

- Unlock with valid and invalid passwords.
- Verify that no market request happens before unlock in the network panel.
- Check all four ranges for at least two owned stocks.
- Inspect the first, middle, and last point with pointer and keyboard.
- Verify positive, negative, flat, missing-volume, and one-point histories.
- Check mobile widths, long ticker lists, zoom at 200%, and high-contrast focus.
- Confirm that excluding a portfolio removes its stocks from the chart selector.

## Acceptance criteria

Version 1 is complete when:

- The Charts tab displays an interactive price-and-volume chart for every included equity symbol returned by the active portfolio month.
- Range controls load the intended amount of history and cannot be overwritten by stale requests.
- Summary numbers agree with the returned history series.
- No holdings or API key appear in committed public source or build logs.
- The chart remains usable with keyboard navigation and at mobile widths.
- Loading, setup, empty, and error states are understandable without opening developer tools.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Free API quota is exhausted | Cache history, request only the active symbol/range, and avoid background polling in v1. |
| A provider changes its response | Keep normalization in the provider adapter and cover it with fixtures. |
| Historical portfolio return is misleading | Do not claim performance until dated transactions exist; label simulations clearly. |
| Password protection is mistaken for server security | Keep real data encrypted at build time and document that the static host sees ciphertext. |
| Real ticker names leak through analytics or logs | Do not log symbols and keep analytics off gated stock surfaces. |
| Small-screen charts become unreadable | Preserve the full-width plot, reduce surrounding chrome, and allow control strips to scroll. |

## Recommended next milestone

After Version 1 has been used for a few weeks, prioritize dividend markers and normalized comparison mode. They add the most insight without requiring brokerage write access. Historical portfolio-performance claims should wait for a reliable transaction ledger.
