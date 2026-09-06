# notes/ — the general Obsidian vault page

`/notes/` mounts the notes app (`PNNotes` from `assets/js/notes-ui.js`) with scope `general`: everyday Markdown notes with tags, `[[wikilinks]]`, and backlinks. Encrypted with the visitor's own PIN into **their** browser's localStorage — nothing is uploaded, nothing lands in this repo, and the page ships no note content.

The stock-desk vault (per-ticker notes, outlooks, purchase journals, board, calendar data) is a **separate scope** that lives inside `/tools/tracker/` — same engine, different storage namespace, so the two never mix.

Round-trip with the real Obsidian app: **Export** downloads a `.zip` of one `.md` per note (YAML frontmatter carries ticker/tags/outlook fields); unzip into a vault. **Import** reads `.md` files back and de-duplicates by title+ticker. Clearing site data deletes the browser vault — export regularly.

`visual-options/` is a local, untracked design exploration for this page's future look (ROADMAP R10).
