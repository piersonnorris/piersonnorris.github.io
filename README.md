# piersonnorris.com

Pierson Norris's personal site and private portfolio console. Live at **https://piersonnorris.github.io** — plain HTML/CSS/JS on GitHub Pages, no framework, no build step (one sanctioned exception: the Node script that encrypts the tracker).

Built by three collaborators: **Pierce** (owner — decisions, secrets, content answers), **Claude** (gated tooling, docs, Drive research, build pipeline), and **ChatGPT** (public pages from the blueprint). If you are one of the AIs: read **`docs/ROADMAP.md`** first — it holds the live task list, owners, and the standing rules. `docs/CONTENT.md` is the only source of public copy; `docs/BLUEPRINT.md` is the architecture spec.

## Map

| Path | What it is |
|---|---|
| `index.html` | Home — the "live console" landing page |
| `experience/` | Public experience timeline (2023 → now, newest first) |
| `notes/` | "Obsidian — general vault": PIN-encrypted in-browser notes, `.md` export/import |
| `tools/tracker/` | The portfolio tracker. `index.html` is the **generated, encrypted** page; `index.template.html` is the source (and a fake-login demo with sample data); `build.js` seals real holdings in. See its README. |
| `assets/` | Shared CSS + the JS modules (charts, prices, vault, notes UI, calendar, taskboard). See its README. |
| `docs/` | The paper trail: `ROADMAP.md` (tasks), `BLUEPRINT.md` (spec), `CONTENT.md` (copy), tracker/calendar/chart/taskboard plans |
| `.github/workflows/refresh-tracker.yml` | Scheduled encrypted-tracker rebuild (needs repo secrets — ROADMAP R2) |
| `llms.txt` / `robots.txt` | AI-crawlability kit; keep `llms.txt` in sync with page content |

## The privacy model, in one paragraph

The repo is public, so nothing sensitive is ever tracked. This folder doubles as Pierce's local Obsidian vault: `.gitignore` ignores **everything** by default and allowlists site files one by one — local notes, `private/` (real holdings, PIN, dividend research) and anything unlisted stay on Pierce's machine. The published tracker page contains only an AES-256-GCM payload that decrypts in the browser with the PIN; notes on the site are encrypted into each visitor's own localStorage and never uploaded. Before any commit: no PIN, keys, holdings, or client names in tracked files or messages.

## Local workflow

```bash
# rebuild the encrypted tracker from the private snapshot
node tools/tracker/build.js --local-snapshot

# run the unit tests
node tools/tracker/calendar.test.js
node tools/tracker/taskboard.test.js
```

Preview by serving the folder root over HTTP (root-absolute paths — opening files directly won't resolve `/assets/…`). Any static server works. The template page at `/tools/tracker/index.template.html` opens as a **demo**: the login button deliberately bypasses the PIN and shows fabricated sample data, so every feature can be clicked through safely.
