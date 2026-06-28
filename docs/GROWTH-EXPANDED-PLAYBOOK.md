# Outlier Expansion Playbook — Step by Step

> Rules of engagement: zero ad spend, developer-led growth, local-first credibility, every action must leave an auditable mark in git.

---

## Phase 0 — Foundation Audit (before you post anywhere)

**Objective:** make sure what people land on converts.

- [ ] README has a real receipt screenshot (not a fake menu). Use `outlier` on your own repo, copy the receipt, paste into a terminal screenshot.
- [ ] npm downloads badge + GitHub stars badge visible in README. (Already done in `06c7321`.)
- [ ] `docs/GROWTH-PLAYOUT.md` exists and is linked from README so contributors see the strategy.
- [ ] Paper PDF compiles cleanly: `pdflatex paper/measuring-ai-use.tex` (if TeX installed) or verify the committed PDF `paper/v1-draftmeasuring-ai-use.pdf`.
- [ ] Create `docs/GIT-WORKFLOW.md` so community contributors know the workflow law (no direct main pushes, PR review required).
- [ ] Verify `npx outlier-audit` runs end-to-end on a fresh clone: `git clone --depth 1 <your-repo> /tmp/test && cd /tmp/test && npx outlier-audit audit --strict`.

Success criteria: README renders a real receipt, package installs in <60s, paper PDF is committed.

---

## Phase 1 — Paper Publication (Google Scholar / Indexing)

**Objective:** get `Measuring AI Use: A Governance Framework for Carbon, Authorship Erosion, and AI Adoption` indexed.

### Step 1.1 — Fix submission metadata in the paper
- [x] Add `\hypersetup{doi=...}` placeholder in `measuring-ai-use.tex`
- [x] Add `\keywords{}` to abstract block
- [x] Remove abstract duplicate sentence
- [x] Add ORCID to `\author[1]{...}` block
- [x] Add `\pdfinfo` with Title/Author/Subject/Keywords (Google Scholar reads this)

### Step 1.2 — Assign persistent identifiers
- [ ] Register ORCID: https://orcid.org/register → save ID in `paper/osf-metadata.md`
- [ ] Reserve DOI via OSF Preprints (instant, free). OSF returns DOI on upload. Copy it into:
  - `paper/measuring-ai-use.tex` `\hypersetup{doi=...}`
  - `paper/osf-metadata.md`

### Step 1.3 — Distributions
Priority order:

| Server | Why | Action |
|--------|-----|--------|
| OSF Preprints | Instant DOI, no endorsement, no politics | Upload PDF + metadata → get DOI immediately |
| Zenodo | Long-term archive + DOI + GitHub release auto-harvest | Connect GitHub repo to Zenodo; Zenodo will mint on every release |
| SSRN | Socio-economic/policy audience | Upload PDF under "Sustainability" or "Economics" |
| TechRxiv | IEEE-backed CS audience | Upload under "Software Engineering" or "AI Ethics" |
| arXiv | Highest visibility, needs endorsement | Prepare cover letter citing prior work in cs.CY; find endorser from co-author network |

**For each server:**
1. Open a branch `feat/paper-submission-<server>`
2. Add `docs/submissions/<server>-notes.md`
3. Open PR → self-merge with `--admin` after sanity review
4. Tag commit hash in paper/osf-metadata.md "Submitted to <server> on <date>"

Success criteria: paper PDF, Zenodo release, and ORCID are finalized.

---

## Phase 2 — Developer Communities

**Objective:** 100 stars, 50 npm downloads, 3 quality Reddit discussions.

### Week 2.1 — Tender a "graft" period (comment before posting)
In each sub, spend 48–72 hours commenting on 2–3 recent threads before creating your own post.

| Sub | Comment angle | Goal |
|-----|--------------|------|
| r/LocalLLM | "I built a local-first CLI that measures carbon + authorship from Claude logs" → offer OP receipt screenshot | Demonstrate contribution |
| r/vibecoding | Reply to "what's your AI workflow" threads with receipt + `outlier learn` tip | Help, don't pitch |
| r/opencodeCLI | Explain `outlier watch -- any agent` as the capture primitive | Technical credibility |
| r/SideProject | "Did a carbon authorship audit on my solo app — 62% AI, 6.8kg CO2" | Personal proof |

Rules:
- Never start a comment with a link to your repo (shadow-ban risk).
- Let people ask "what tool is that?" then answer.
- Save permalinks of good comment threads in `docs/WINS.md`.

### Week 2.2 — First wave of posts

**r/LocalLLM** — Post:
> "I built a CLI that audits what your local AI coding agent wrote, and shows the carbon cost on your grid. No cloud. Reads git + Claude logs only. Here's my own repo's receipt (anonymized)."

Flair: `local tool` or `project` (per sub rules).

**r/vibecoding** — Post title:
> "The AI-vibe-code receipt: I audited my vibe-coded repo and found out I'm a 'Centaur' — 60% AI execution, 240 prompts, 96% context re-read"

**r/opencodeCLI** — Post title:
> "Show outlier: a CLI that audits AI authorship, blast radius, and session carbon for any agent (watch -- cursor/claude/aider)"

**r/SideProject** — Post title:
> "I measured how much AI actually writes in my solo project. Turns out my blast radius is HIGH and my token tax is 93%. Tool in comments."

**Rules for every post:**
- Add a real terminal screenshot (hide API keys, path names).
- Self-comment within 30m: "If you run `outlier learn` it gives you one technique the agent used + a 30s challenge — that's the under-discussed part."
- Never edit the post to add the link after the fact; it should be present at submission.

### Week 2.3 — HN + broader reach
- Submit https://news.ycombinator.com/submit as:
  Title: "Show HN: A CLI that Audits What Your AI Coding Agent Actually Wrote"
  URL: https://github.com/rosh100yx/outlier

HN-specific:
- Be ready to answer within 5 minutes of posting (first 30m determine visibility).
- Expect questions about methodology — link to `paper/measuring-ai-use.md` and arXiv if ready.
- If asked about npm, point to `npx outlier-audit`.

---

## Phase 3 — GitHub / Reach

**Objective:** 50 stars from GitHub-native sources.

### Week 3.1 — Optimization
- [ ] Add 5 GIFs to README under "Share" showing:
  1. Audit receipt
  2. Share submenu → X/Reddit/Slack/WhatsApp/Threads/Facebook
  3. Chat submenu → ChatGPT/Perplexity
  4. `outlier watch` flow
  5. `outlier policy` git hook install
- [ ] Create `scripts/refresh-quotes.ts` successful run → commit fresh quotes

### Week 3.2 — Submission to directories
Submit to (use `docs/WINS.md` to track status):
- LibHunt: https://www.libhunt.com (submit)
- Awesome Self-Hosted: https://github.com/awesome-selfhosted/awesome-selfhosted (PR)
- Product Hunt: https://www.producthunt.com (if README polished enough)
- IndieHunt: https://indiehunt.io
- Submit25: https://www.submit25.com/sites
- RepoRanker: https://reporanker.com/submit
- ShipIt: https://shippin.dev/
- Distribute: https://distribute.dev/
- LaunchList: https://getlaunchlist.com/blog/product-hunt-alternatives
- Yanib: https://www.yanib.dev/

For each: create `docs/submissions/<platform>.md` with status (`submitted` / `listed` / `rejected`) and date.

### Week 3.3 — GitHub-native credibility
- [ ] Engage with 10 issues/comments in `awesome-claude-code`, `awesome-cursor`, `awesome-aider` repos
- [ ] Comment with `outlier watch` on 3 issues in `vercel/ai`, `langchain-ai/langgraph`
- [ ] Answer 2 HN threads about "how do you measure AI coding adoption?"

---

## Phase 4 — Ongoing rituals

**Weekly (30 min):**
- [ ] Check npm downloads: `npm view outlier-audit`
- [ ] Post 1 receipt screenshot on LinkedIn/Twitter from personal account (not brand)
- [ ] Review 5 Reddit threads in the Tier-1 subs, contribute without linking
- [ ] Hit the RSS refresh: `bun scripts/refresh-quotes.ts` → commit fresher quotes

**Bi-weekly:**
- [ ] Release a minor bump with new feature (`outlier learn` update, new grid factors, etc.)
- [ ] Publish a 5-line changelog to GitHub Discussions under "Announcements"

**Monthly:**
- [ ] Submit 1 paper update (if methodology advances)
- [ ] Update benchmark tables in README
- [ ] Review and update `docs/GROWTH-PLAYOUT.md` status

---

## Anti-patterns (do not do)

- Do not auto-respond to every mention.
- Do not delete bad Reddit comments — reply with facts instead.
- Do not DM mods.
- Do not post a link to the paper in tech subs unless the methodology is the story (developers care about the tool, not the citation).
- Do not use the brand account for comments.

---

## Owner + Cron

You own Phases 0–1. The community will do Phase 2–4 if the README + paper are solid.

Suggested cron for RSS-refresh + community digest:
```
0 9 * * * cd /Users/rosh100yx/Projects/workspace/outlier && bun scripts/refresh-quotes.ts >> logs/rss-refresh.log 2>&1
```
Add under `cronjob` if you want it handled by Hermes.


