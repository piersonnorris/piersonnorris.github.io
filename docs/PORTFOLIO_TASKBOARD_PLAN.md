# Private Portfolio Project Board

## Phase 2 status

The project task board is implemented as a dedicated password-gated **Projects** tab inside the portfolio tracker.

## Included now

- Five workflow stages: Backlog, Planned, In progress, Blocked, and Complete.
- Summary metrics for active, due-soon, blocked, and completed goals.
- Goal creation and editing with a target outcome and concrete next action.
- Milestones and dependencies, entered one per line for easy scanning.
- Optional target dates with overdue highlighting.
- Optional links back to tracker views, calendar views, or trusted web resources.
- Left/right movement controls for advancing or revising a goal's stage.
- Seeded roadmap goals for the calendar, task board, Google Calendar sync, and a future read-only brokerage connection.
- Device-local AES-GCM persistence through the existing stock-note vault.
- Obsidian Markdown export/import with structured JSON frontmatter and a readable five-section board.

## Privacy model

```text
Tracker PIN
    |
    v
Encrypted stock-note vault
    |
    +---- project goals / outcomes / milestones / blockers / next actions
    |
    +---- explicit export ----> Obsidian Markdown
```

The public site contains the board interface and non-sensitive starter roadmap only. Personal project edits stay encrypted in browser storage. The exported Markdown becomes readable only when the user explicitly downloads it into a private Obsidian vault.

## Goal model

```json
{
  "id": "goal-example",
  "title": "Read-only brokerage connection",
  "status": "backlog",
  "outcome": "Import positions without trading permission.",
  "nextAction": "Compare supported read-only providers.",
  "targetDate": "",
  "milestones": ["Connector comparison", "Security review"],
  "dependencies": ["Approved provider"],
  "relatedLink": "#positions"
}
```

## Validation checklist

- All five stages are represented in a horizontally scrollable board.
- Cards can move only within the defined stage sequence.
- Invalid goals and unsupported links are normalized before storage.
- An intentionally empty saved board is not repopulated with starter goals.
- Goal metadata survives Obsidian Markdown export/import.
- Personal goal content is absent from plaintext browser storage.
- The task board is inaccessible until the portfolio payload is unlocked.

## Phase 3 boundary

The task board tracks the future brokerage-integration work but does not connect an account. Any Robinhood-compatible integration must be read-only, must keep reusable credentials and tokens outside Obsidian, and must receive a separate security review before implementation.
