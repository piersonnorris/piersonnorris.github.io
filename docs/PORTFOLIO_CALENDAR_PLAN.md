# Private Portfolio Calendar

## Phase 1 status

The first calendar phase is implemented as a dedicated password-gated tab inside the portfolio tracker.

### Included now

- Full six-week month grid with previous, next, and today navigation.
- Confirmed dividend ex-dates and payment dates derived from included stock positions.
- Private reminders, earnings dates, portfolio reviews, and tax deadlines.
- Create, edit, and delete flows for private events.
- Day detail panel and a rolling 90-day agenda.
- Summary cards for the current month, next 30 days, dividend dates, and private plans.
- Filters for ex-dividend dates, payments, earnings, and private plans.
- Per-event **Add to Google** links.
- A private `.ics` export for the current filtered calendar.
- A direct link to the user's signed-in Google Calendar.
- Encrypted device-local persistence through the existing stock vault.
- Persistent dividend-date overrides so manual calendar corrections survive reloads.
- Obsidian Markdown export/import for private calendar records.

## Privacy model

```text
Tracker password
      |
      v
Encrypted portfolio payload ----> confirmed dividend dates
      |
      v
Encrypted stock vault ----------> reminders / earnings / reviews / tax dates
      |
      +---- explicit user action ----> Google Calendar event link or .ics export
```

Nothing is sent to Google automatically. Opening **Add to Google** places that single event in a Google Calendar draft. Downloading `.ics` keeps the file local until the user chooses where to import it.

The tracker password protects the entire calendar surface. User-created calendar records are additionally stored as AES-GCM ciphertext in the browser's stock vault. Plaintext calendar data appears only while unlocked or in an export the user explicitly requests.

## Data model

```json
{
  "id": "calendar-example",
  "date": "2026-09-15",
  "title": "Quarterly allocation review",
  "kind": "review",
  "symbol": "",
  "notes": "Check target weights and unpriced assets.",
  "source": "private",
  "readonly": false
}
```

Dividend events use the same normalized shape but are marked `source: "dividend"` and `readonly: true`; they are edited from the Dividend tab so there is one source of truth.

## Accuracy rules

- Only dates explicitly present in the encrypted research payload or entered by the user appear on the calendar.
- The tracker does not invent future dividend dates from payout frequency.
- Included/excluded position scope controls which dividend events appear.
- Manual dividend corrections are encrypted and merged over the build-time research values.
- Calendar exports use all-day events and a one-day exclusive end date for broad calendar compatibility.
- Filters affect the grid, metrics, agenda, and exported `.ics` file together.

## Known boundary

This phase uses safe Google Calendar handoff links and standards-based `.ics` export. Automatic two-way Google Calendar synchronization would require Google OAuth credentials, token storage, revocation handling, and a private backend. That should be designed as a later integration rather than embedding long-lived credentials in a public static site.

## Validation checklist

- Calendar helper syntax and tracker application syntax parse successfully.
- Month generation always returns 42 day cells.
- Date-window filtering is deterministic.
- `.ics` output includes valid all-day start and end dates.
- Calendar metadata survives Obsidian Markdown export/import.
- Private calendar events and dividend overrides persist only inside the encrypted stock vault.
- Filtered event types remain visually distinct without relying on color alone.
- Calendar controls are native buttons, links, and form controls for keyboard access.

## Next phases

### Phase 2: Project task board — implemented

The private goals board is now available in the tracker's **Projects** tab. It includes Backlog, Planned, In progress, Blocked, and Complete columns; outcome, milestones, next action, target date, dependencies, related portfolio/calendar links; and an encrypted Obsidian export. See [PORTFOLIO_TASKBOARD_PLAN.md](PORTFOLIO_TASKBOARD_PLAN.md).

### Phase 3: Data connections

Evaluate a read-only Robinhood connection or compatible MCP, then normalize its positions and transactions into the tracker. Keep account authorization outside Obsidian; Obsidian should receive encrypted/exported summaries and research notes, never brokerage credentials or reusable access tokens.
