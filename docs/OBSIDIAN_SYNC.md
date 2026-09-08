# Obsidian connectivity — graph view + vault sync

Status: **shipped 2026-09-07** (ROADMAP R15). Two halves that meet in the middle: a graph that shows how notes connect, and a pipeline that gets the *real* vault in front of it.

---

## 1. The graph — `assets/js/notes-graph.js`

`PNGraphify` mounts inside the notes UI on both `/notes/` (general vault) and the tracker's Obsidian tab (stock vault), behind a **Graph** button in the toolbar.

Deliberately split in two:

| Half | What it is | Tested |
|---|---|---|
| `build(notes, {tags, missing})` | Pure. Notes → `{nodes, links, stats}`. No DOM, no layout, no randomness. | Yes — `tools/tracker/notes-graph.test.js` |
| `mount(el, opts)` | Force-directed SVG: pan, zoom, node dragging, neighbourhood highlight, click-to-open. | No — left to the browser |

### The judgement calls `build()` makes

These are the decisions the picture then draws confidently, so they are the part worth writing down:

- **A link is a resolved `[[wikilink]]`, once.** `A → B` and `B → A` are one connection, not two. `[[Note|alias]]` and `[[Note#heading]]` resolve to `Note`, matching Obsidian. Resolution is case-insensitive; a note linking to itself is not a link.
- **A tag is not a link.** Tag nodes are drawn (toggleable) and tags are counted, but sharing `#macro` does not connect two notes and does not rescue either from being an orphan. Tagging is a weaker signal than linking and conflating them would flatter the vault.
- **An unresolved link is not a link either.** A note whose only bracket points at a note that doesn't exist is still an orphan. That is exactly why orphans and unresolved links are two separate numbers.
- **Data blobs are not writing.** Notes carrying a `noteType` (the tracker's calendar and project-board storage) are excluded — they would dominate the picture.
- **Density** is `links × 2 / notes`: average links per note, the single number for whether the vault is a web or a pile.

### Two known implementation traps

- **Layout runs synchronously before the first paint.** Nodes are positioned by a `transform` on their `<g>`, and `requestAnimationFrame` does not fire at all in a background tab — so a graph that waited for the first animation frame rendered the entire vault stacked at `0,0`. The sim settles ~90 steps up front, paints, auto-fits the camera to the node bounds, and only then animates the remainder.
- **Focus rings.** `.pg-node:focus-visible` restates its own ring for the same specificity reason `.pnchart-graph .vg-node` had to (ROADMAP U2): a two-class selector outranks the generic `[tabindex]:focus-visible` rule regardless of source order.

`PNGraphify` is separate from `PNCharts.graph`, which stays what it was — the tracker Projects tab's projects-and-AI-thoughts map.

---

## 2. The sync — `tools/obsidian-sync.js`

```bash
node tools/obsidian-sync.js --vault "C:\path\to\Vault"        # → private/notes/obsidian-vault.json
node tools/obsidian-sync.js --vault "…" --list --dry-run      # report only, writes nothing
node tools/obsidian-sync.js --help
```

| Flag | Effect |
|---|---|
| `--vault <dir>` | The vault folder. Falls back to `OBSIDIAN_VAULT`, then `private/.obsidian-vault-path` (one line, gitignored). |
| `--out <file>` | Bundle destination. Default `private/notes/obsidian-vault.json`. |
| `--scope general\|stocks` | Which vault the bundle is meant for. |
| `--no-body` | Index only: titles, tags and paths, no note text. |
| `--list` | Print orphan and unresolved titles. **Off by default** — the script prints counts, never note content. |
| `--stdout` / `--dry-run` | Print the bundle / report and write nothing. |

It walks the folder for `.md`, skipping every dot-directory (`.obsidian`, `.trash`, `.git`). Parsing is **not** reimplemented: it calls the site's own `PNVault.fromMarkdown`, so a note read here and a note imported through the browser end up identical. The only thing layered on top is block-style YAML (`tags:\n  - a`) plus `alias`/`aliases`, which Obsidian writes and the browser importer never had to handle.

Output is one `pn-vault-bundle` JSON: `{format, version, scope, generatedAt, source, count, notes[]}`, each note carrying its vault-relative `path`.

### Getting a bundle into a vault

**Route A — Import button (`/notes/`, no build).** Pick the one `.json` file instead of hand-selecting hundreds of `.md` files. `PNVault.importBundle()` **upserts** by `sourcePath`, so re-running the sync after editing in Obsidian updates notes in place; the old `.md` path only ever *added*, which made repeat imports useless. `source_path` is written into exported frontmatter too, so the identity survives a full round trip. Nothing is ever deleted: a note removed from the vault folder stays in the browser until you delete it.

**Route B — baked into the encrypted build (tracker).** Drop the same bundle at `private/tracker/obsidian-vault.json` and `tools/tracker/build.js` (`loadObsidianVault`) seals it into the payload as `obsidianVault`, exactly like `googleEvents`. The tracker's Obsidian tab then shows a banner offering a one-click merge. Merging is a button and never automatic — it overwrites notes that came from the same vault paths, and silently rewriting a vault on unlock would be a surprising thing for a page to do. Malformed or missing input degrades to `null`; the build never fails over vault data.

---

## 3. The public route — `--public` (added 2026-09-08, R17)

The third destination for a bundle, after the Import button and the encrypted build: a committed file the
public `/vault/` page reads. Design and reasoning live in `docs/BACKSTAGE_PLAN.md`; the mechanics are here.

```bash
node tools/obsidian-sync.js --vault "<dir>" --report                  # what WOULD publish. Writes nothing.
node tools/obsidian-sync.js --vault "<dir>" --public --prefix notes   # → assets/data/vault-public.js
```

| Flag | Effect |
|---|---|
| `--report` | Every note that would publish — path, word count, title — plus scrubber hits. No note text. |
| `--public` | Writes the public bundle. Default `assets/data/vault-public.js`. |
| `--label <name>` | What the page calls the snapshot. |
| `--prefix <dir>` | Nests published paths under a folder, so the tree has something to draw. |
| `--waive <ids>` | Skip named scrub rules for this run. Printed loudly and recorded in the bundle. |
| `--no-link-paths` | Leave inline path references alone instead of resolving them into wikilinks. |

Three things are worth knowing before running it against a real vault:

- **Default is publish, and the opt-outs are Pierce's.** `publish: false` in frontmatter, a `#private` tag, or a
  `nopublish/` folder. That default was his decision (2026-09-08), taken over two narrower scopes.
- **The scrubber refuses; it never redacts.** Dollar amounts, share counts, addresses, phone numbers,
  key-shaped tokens, plus literal terms from `private/.publish-blocklist` (gitignored — a committed list of
  names you must never publish is itself a published list of those names). A hit prints `path:line`, never the
  matched text, and stops the write. The fix belongs in the vault.
- **Output is `.js`, not `.json`.** It loads with a `<script>` tag, exactly like `atlas-data.js`, so the page
  works over `file://` with no fetch and no CORS. A `.json` path is still honoured if you ask for one.

A publish-time transform runs on the way out: an inline-code path pointing at another published note
(`` `docs/CONTENT.md` ``) becomes a `[[wikilink]]`. Vaults link with brackets; the site's own docs link by
writing a path, and both are the author saying "this connects to that". Only the exact inline-code form is
rewritten — guessing inside prose or fenced blocks would invent edges nobody wrote. The count lands in the
bundle as `linkedPaths` so the page can say it happened.

The first published snapshot is the site's own `docs/` folder, which was already public in this repo. The
personal vault is not published; that step is P4 in the plan and waits on Pierce.

## Known boundary

Same as `docs/PORTFOLIO_CALENDAR_PLAN.md` says about Google Calendar, and for the same reason: **this is a snapshot, not live sync.**

The site is static, served from GitHub Pages. It has no server, no OAuth, and no way to read a folder on disk — not from the browser, not from CI. `obsidian-sync.js` runs on the machine that has the vault, outside the site's own code. Refreshing means running it again and re-importing (or rebuilding). GitHub Actions cannot do this pull: the vault lives on Pierce's disk, not behind a portable credential.

Note text never enters the repo. The bundle path is gitignored, and Route B's copy exists only inside the AES-256-GCM payload.
