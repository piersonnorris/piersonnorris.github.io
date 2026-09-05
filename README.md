# piersonnorris.com — starter repo

This folder is the complete, ready-to-push starting point for Pierson Norris's personal website. It was prepared by Claude (Cowork) on 2026-08-23 as the handoff package for a ChatGPT-driven build.

**What's inside**

| Path | What it is |
|---|---|
| `HANDOFF_PROMPT.md` | The exact prompt to paste into ChatGPT to start the build. Start here after pushing. |
| `docs/BLUEPRINT.md` | The master build spec — architecture, brand, pages, AI-crawlability kit, milestones, QA checklist. ChatGPT's bible. |
| `docs/CONTENT.md` | The real copy: bio, elevator pitch, the 2023–2027 timeline, skills, projects, links. No lorem ipsum, ever. |
| `docs/ASSET_TRACKER_SPEC.md` | The gated portfolio-dashboard feature spec (Google Sheets → GitHub Action → encrypted page). Sanitized with sample data — safe for a public repo. |
| `docs/SETUP_CHECKLIST.md` | The phased to-do list (mirrors the Build HQ page). |
| `index.html` | A dark, on-brand "coming soon" placeholder so the site is live from day one. |
| `robots.txt` / `llms.txt` | AI-crawlability starters — already allow GPTBot, ClaudeBot, PerplexityBot, etc. |
| `.gitignore` | Pre-configured so credentials can never be committed by accident. |
| `.nojekyll` | Tells GitHub Pages to serve files as-is (plain HTML, no Jekyll processing). |

---

## Step 1 — Get this onto GitHub (~10 minutes, no terminal)

1. **Install [GitHub Desktop](https://desktop.github.com)** and sign in with your GitHub account.
2. In GitHub Desktop: **File → Add local repository** → choose this folder. It will say the folder isn't a repo yet — click **create a repository** here. Name it exactly:
   ```
   YOURUSERNAME.github.io
   ```
   (Replace `YOURUSERNAME` with your actual GitHub username, lowercase. This exact name is what makes GitHub serve it as your personal site. If `piersonnorris` is free as a username, claim it — your site becomes `piersonnorris.github.io`.)
3. Leave "Initialize with README" unchecked (this folder already has one). Click **Create Repository**.
4. Click **Publish repository**. Uncheck **"Keep this code private"** — GitHub Pages is free only for public repos. Publish.
5. On github.com, open the repo → **Settings → Pages** → under "Build and deployment," Source: **Deploy from a branch** → Branch: **main**, folder **/ (root)** → Save.
6. Wait ~1 minute, then visit `https://YOURUSERNAME.github.io` — you should see the dark "coming soon" page. The site is live.

> Nothing in this folder is sensitive. Your real portfolio numbers, the Google service-account key, and the tracker password must NEVER be added to this repo — the `.gitignore` and the blueprint both enforce this.

## Step 2 — Hand off to ChatGPT

1. Open ChatGPT (your top-tier model) and create a dedicated **Project** for this build.
2. Upload the four files in `docs/` to the Project (or connect the GitHub repo if your ChatGPT plan supports it).
3. Paste the contents of `HANDOFF_PROMPT.md` as your first message.
4. Build milestone by milestone (they're defined in the blueprint). After each milestone, commit + push in GitHub Desktop and check the live site.

## Step 3 — Keep Claude in the loop

The living timeline + checklist stay at the Build HQ page (Claude republishes it as things change). Content edits, new timeline entries, and open decisions flow: **you → Claude → updated docs → ChatGPT builds**.
