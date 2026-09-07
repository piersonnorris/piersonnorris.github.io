# notes/ — the general Obsidian vault page

`/notes/` mounts the notes app (`PNNotes` from `assets/js/notes-ui.js`) with scope `general`: everyday Markdown notes with tags, `[[wikilinks]]`, and backlinks. Encrypted with the visitor's own PIN into **their** browser's localStorage — nothing is uploaded, nothing lands in this repo, and the page ships no note content.

The stock-desk vault (per-ticker notes, outlooks, purchase journals, board, calendar data) is a **separate scope** that lives inside `/tools/tracker/` — same engine, different storage namespace, so the two never mix.

## Graph view

The **Graph** button in the toolbar swaps the editor for `PNGraphify` (`assets/js/notes-graph.js`): every note as a node, every `[[wikilink]]` as an edge, with `#tags` and unresolved links as optional extra nodes. Drag a node, scroll to zoom, click to open.

It is pointed at connectivity rather than decoration, because that is the part a vault actually loses over time:

- **Orphans** (amber) are notes with no `[[wikilink]]` in either direction. Sharing a tag does not rescue a note from being one — tags are a weaker signal and are counted separately.
- **Unresolved** (dashed purple) are links pointing at notes that don't exist yet. Clicking one writes that note, so the link resolves immediately.
- The stat strip carries links-per-note, which is the one number that says whether the vault is a web or a pile.

`PNGraphify.build()` is a pure function and is unit-tested in `tools/tracker/notes-graph.test.js`; the SVG half is not.

## Round-tripping with the real Obsidian app

**Export** downloads a `.zip` of one `.md` per note (YAML frontmatter carries ticker/tags/outlook fields); unzip into a vault. **Import** reads `.md` files back and de-duplicates by title+ticker. Clearing site data deletes the browser vault — export regularly.

**Import also takes a `.json` bundle** from `tools/obsidian-sync.js`, which is the better route for a whole vault:

```bash
node tools/obsidian-sync.js --vault "C:\path\to\Vault"
```

That reads the real vault folder, prints a connectivity report, and writes `private/notes/obsidian-vault.json` (gitignored). Pick that one file with Import instead of hand-selecting hundreds of `.md` files. Unlike the `.md` path it **upserts**: notes are matched on their vault-relative path, so re-running the sync after editing in Obsidian updates what is already here rather than skipping it as a duplicate. Nothing is ever deleted — a note removed from the vault folder stays in the browser until you delete it.

The site can't read a folder on disk, and never will: it is static, with no server and no OAuth. `obsidian-sync.js` runs outside the site, exactly like the Google Calendar pull. See `docs/OBSIDIAN_SYNC.md`.

`visual-options/` is a local, untracked design exploration for this page's future look (ROADMAP R10).
