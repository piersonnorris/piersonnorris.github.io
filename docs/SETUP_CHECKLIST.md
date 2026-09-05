# SETUP CHECKLIST — work through bit by bit

Mirrors the Build HQ page. Check items off here (or there) and tell Claude/ChatGPT what's done.

## Phase 1 — this week (no code, ~45 min)

- [ ] Confirm (or pick) the GitHub username — it becomes `username.github.io`; `piersonnorris` is ideal if free
- [ ] Install GitHub Desktop (desktop.github.com) + VS Code (code.visualstudio.com)
- [ ] Pick the public contact email (norrispierce506@gmail.com or a cleaner alias)
- [ ] LinkedIn: claim a custom URL (currently `/pierson-norris-634954246`) + add Screencastify and True North entries
- [ ] Choose the tracker password → password manager only; later into GitHub Secrets; never into any chat
- [ ] React to the timeline (accent A/B/C, confirm chips, 2024/2025 gaps, the 2027 headline)

## Phase 2 — Google Cloud (tracker prep, ~25 min; click-by-click in the private Drive spec)

- [ ] Create a Google Cloud project (e.g. `pierce-asset-tracking`) + enable the Google Sheets API
- [ ] Create a service account + download its JSON key (treat like a password)
- [ ] Share the Asset Tracking sheet with the service-account email — Viewer, notify unchecked

## Phase 3 — when the build starts (with ChatGPT)

- [ ] Create the repo `piersonnorris.github.io` (public) + enable Pages (Settings → Pages → main / root)
- [ ] Add Actions secrets: `GOOGLE_SERVICE_ACCOUNT_JSON`, `TRACKER_PASSWORD`, `SHEET_ID`
- [ ] ChatGPT Project: upload the `docs/` files, paste `HANDOFF_PROMPT.md`

## Later — post-launch

- [ ] Buy piersonnorris.com (~$10–12/yr) → CNAME + DNS to Pages; update absolute URLs (blueprint §7)
- [ ] Privacy-friendly analytics: GoatCounter (free) or Plausible — one script tag
- [ ] Headshot for About (fresh, or Claude screens the May 2026 Drive photo set)
- [ ] Install the monthly-tab Apps Script on the sheet (written; in the private spec)
- [ ] Refresh the resume PDF → `/assets/resume/pierson-norris-resume.pdf` (Claude drafts it from CONTENT.md once timeline gaps close)
