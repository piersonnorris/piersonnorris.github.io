# piersonnorris.com

Pierson Norris's personal site. Live at **https://piersonnorris.github.io** — plain HTML/CSS/JS on GitHub Pages, no framework, no build step (plain Node scripts under `tools/` are the one sanctioned tooling seam).

Built by three collaborators: **Pierce** (owner — decisions, secrets, content answers), **Claude** (gated tooling, docs, Drive research, build pipeline), and **ChatGPT** (public pages from the blueprint). If you are one of the AIs: read **`docs/ROADMAP.md`** first — it holds the live task list, owners, and the standing rules. `docs/CONTENT.md` is the only source of public copy; `docs/BLUEPRINT.md` is the architecture spec.

**The portfolio tracker is not in this repo.** It lived at `/tools/tracker/` until 2026-09-15, then moved to its own private repo, `piersonnorris/stock-trackers`, where it needs no PIN. Its old files remain in this repo's git history only.

## Map

| Path | What it is |
|---|---|
| `index.html` | Home — the "live console" landing page |
| `experience/` | Public experience timeline (2023 → now, newest first) |
| `modules/` | Site guide: each module's job, audience and access state |
| `atlas/` | Knowledge atlas — curated public notes, graph and timeline |
| `vault/` | "Backstage" — read-only public snapshot of `docs/` |
| `notes/` | "Obsidian — general vault": PIN-encrypted in-browser notes, `.md` export/import, and a connectivity **graph view** of the vault’s `[[wikilinks]]` |
| `island/` | Public roadmap and to-do board |
| `assets/` | Shared CSS + the JS modules (vault, notes UI, graph, markdown, calendar, taskboard, atlas). See its README. |
| `tools/obsidian-sync.js` | Obsidian vault → private bundle, or the reviewed public `/vault/` snapshot |
| `tools/tests/` | Plain-Node unit tests |
| `docs/` | The paper trail: `ROADMAP.md` (tasks), `BLUEPRINT.md` (spec), `CONTENT.md` (copy), Obsidian/Backstage/showcase plans |
| `llms.txt` / `robots.txt` | AI-crawlability kit; keep `llms.txt` in sync with page content |

## The privacy model, in one paragraph

The repo is public, so nothing sensitive is ever tracked. This folder doubles as Pierce's local Obsidian vault: `.gitignore` ignores **everything** by default and allowlists site files one by one — local notes, `private/` and anything unlisted stay on Pierce's machine. Notes on the site are encrypted into each visitor's own localStorage and never uploaded. Holdings, share counts and portfolio values appear nowhere on the site. Before any commit: no PIN, keys, holdings, or client names in tracked files or messages.

## Local workflow

```bash
# snapshot a real Obsidian vault into an importable bundle (see docs/OBSIDIAN_SYNC.md)
node tools/obsidian-sync.js --vault "C:\path\to\Vault"

# run the unit tests
node tools/tests/atlas-links.test.js
node tools/tests/calendar.test.js
node tools/tests/markdown.test.js
node tools/tests/notes-graph.test.js
node tools/tests/taskboard.test.js
node tools/tests/vault-groups.test.js
node tools/tests/vault-publish.test.js
```

Preview by serving the folder root over HTTP (root-absolute paths — opening files directly won't resolve `/assets/…`). Any static server works.
