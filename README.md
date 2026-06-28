<div align="center">
  <img src="https://raw.githubusercontent.com/rosh100yx/outlier/main/assets/cover.jpg" alt="Outlier: AI Code Governance and Policy Engine" width="100%" />
  <h1>Outlier: The Governance & Policy Engine for AI Engineering</h1>
  <p><b>See how much of your code is AI's, what it cost, what your agents can reach — and turn what the AI wrote into skills you actually learn.</b></p>
  <p><i>A local-first CLI for building in a room full of agents. It measures how much of your code AI wrote (honestly — it abstains when it can't tell), what it cost, and what your agents can actually touch — works with any tool via <code>outlier watch</code>, not just Claude Code, and never sends a byte off your machine.</i></p>
  <br/>
  
  <p>
    <a href="https://www.npmjs.com/package/outlier-audit"><img src="https://img.shields.io/npm/v/outlier-audit?style=for-the-badge&color=cb3837&logo=npm" alt="npm" /></a>
    <a href="https://www.npmjs.com/package/outlier-audit"><img src="https://img.shields.io/npm/dm/outlier-audit?style=for-the-badge&color=cb3837&logo=npm" alt="npm downloads" /></a>
    <a href="https://github.com/rosh100yx/outlier"><img src="https://img.shields.io/github/stars/rosh100yx/outlier?style=for-the-badge&color=ffdd57&logo=github" alt="GitHub stars" /></a>
    <a href="https://github.com/rosh100yx/outlier/issues/new?assignees=&labels=enhancement&template=feature_request.md&title=%5BFEATURE%5D+"><img src="https://img.shields.io/badge/%E2%9C%A8_Feature_Request-Submit_an_idea-blueviolet?style=for-the-badge&logo=github" alt="Feature Request" /></a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/Compliance-Strict-blue?style=for-the-badge" />
    <img src="https://img.shields.io/badge/AI_Safety-Enabled-green?style=for-the-badge" />
    <img src="https://img.shields.io/badge/Zero_Trust-Verified-orange?style=for-the-badge" />
    <img src="https://img.shields.io/badge/Carbon_Footprint-Tracked-lightgrey?style=for-the-badge" />
    <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />
  </p>

  <p>
    <b>Get Started — one command, then a guided menu:</b><br/>
    <code>npx outlier-audit@latest</code><br/>
    <sub>It runs the audit, then lets you arrow-key through everything else — no commands to memorise.</sub>
  </p>

  <br/>
  
  ```text
  ┌──────────────────────────────────────────────────────────────────┐
  │ █▀█ █░█ ▀█▀ █░░ █ █▀▀ █▀█  :: CODE AUDIT                          │
  │ █▄█ █▄█ ░█░ █▄▄ █ ██▄ █▀▄  :: my-repo · JUN 23, 2026              │
  ├──────────────────────────────────────────────────────────────────┤
  │  WHAT YOUR AGENTS CAN REACH                                      │
  │ Blast radius   HIGH · 13 tools, 5 can write/deploy · 6 unused    │
  │ Full map (deploy/push/write tools): outlier capabilities         │
  ├──────────────────────────────────────────────────────────────────┤
  │  WHAT IT COST                                                    │
  │ New tokens       3.1M (work done)                                │
  │ Re-read context  74M (96% of all tokens)                         │
  │ Est. spend       $18.40                                          │
  │ Re-read ratio    ▰▰▰▰▰▰▰▰▰▰ 96%                                  │
  │ Energy           0.12kg CO2 (Global Average grid)                │
  │ Source: estimated · Claude Code transcripts                      │
  ├──────────────────────────────────────────────────────────────────┤
  │  YOUR LIMIT                                                      │
  │ AI cap   70% · change with: outlier policy                       │
  │ Status   Within limit · Nothing to do.                           │
  ├──────────────────────────────────────────────────────────────────┤
  │ Who wrote the code · a mirror, not a verdict · outlier learn     │
  │ Execution  62% AI (blame · 5.1K of 8.2K live lines)              │
  │ Intent     240 prompts · ~180K tokens you typed                  │
  │ Oversight  64% · 18/160 rework commits · 240/380 in-session rev. │
  │                                                                  │
  │ Centaur — AI writes most of it, but you steer and review.        │
  │ Blind: copy-paste from chat is invisible; prompt quality unmeas… │
  ├──────────────────────────────────────────────────────────────────┤
  │  WHAT TO DO                                                      │
  │ ⚠ Blast radius HIGH                                              │
  │   → Disable the write/deploy MCP tools you don't need now.       │
  │ → Learn what the AI wrote: outlier learn — one skill to unlock   │
  └──────────────────────────────────────────────────────────────────┘
  ```
</div>

> *"In a room full of agents" shifts the perspective. The developer is no longer a solo coder — they are a manager of bots. Outlier exists to make sure the human doesn't get lazy while managing them. We all want our time back; we don't want to lose control of the craft.*

> **Note:** the npm package is `outlier-audit`; the command it installs is `outlier`. So `npx outlier-audit` runs `outlier …`.

## How It Works
```text
┌───────────┐   ┌────────────┐   ┌──────────┐   ┌──────────────┐
│ AI CODING │──▸│ GIT + LOGS │──▸│  OUTLIER │──▸│ AUDIT + WARN │
└───────────┘   └────────────┘   └──────────┘   └──────────────┘
                                       │ (over your limit)
                                 ┌──────────────┐
                                 │ REVIEW PROMPT │  (warns, never blocks)
                                 └──────────────┘
```
**Step 1:** Developer delegates code generation to an AI agent (Claude Code, Cursor).  
**Step 2:** `outlier` reads the local trace — git history + AI logs — already on the machine.  
**Step 3:** It reports who wrote the code, what it cost, and your authorship limit.  
**Step 4:** Optionally, a local git hook *warns* (never silently blocks) when AI authorship exceeds your limit, so you review before you merge.  

### What it reads (and what it doesn't)

`outlier` is local-first. It reads, from your own machine, only:

- **`git ls-files`** of the current repo — for the lines that actually survive in HEAD (the living artifact), and the `Co-Authored-By` trailer as a fallback signal.
- **Your Claude Code session transcripts** at `~/.claude/projects/<this-repo>/*.jsonl` — read three ways: the agent's `Edit`/`Write` tool calls (the lines it actually wrote to your files), your prompts (intent), and token usage (cost / cache / carbon). Worktrees and moved checkouts of the same repo are found too. (Falls back to `~/.claude/tokenomics-log.jsonl` for cost if present.)

It does **not** send anything anywhere — no API calls, no telemetry, no account. Your code and prompts never leave the machine. The only network action in the whole tool is *you* choosing to open a share link or a feedback issue.

### How accurate is it?

We are deliberately honest about this:

- **"Who wrote the code" is a profile, not a single number.** A single % is a lie — it measures only *execution* (the axis AI is taking over) and ignores where human value moved. Outlier reports three axes:
  - **Execution** — *who wrote the lines.* Primary signal is **blame-based and content-matched**: outlier collects every line the agent emitted through `Edit`/`Write`/`MultiEdit` calls in your session transcripts, then walks every line that **survives in HEAD** and counts how many match an agent write — `aiPercent = aiLines / totalLines`. It measures the **living artifact**, line by line, not chat tokens and not churn totals (a churn count never checks the agent's lines are the lines that survived). Trivial lines (blank, bare brackets, <8 chars) and binary/lockfile/generated paths are excluded on both sides. Two opposing biases are stated rather than hidden — reformatted/pasted/teammate lines fall to the human; a distinctive line the agent wrote in one place is credited as AI everywhere it recurs — so it's a best estimate with **auditable counts** (`39K of 121K live lines`), not a claim of precision. When no agent writes are on record (you use Cursor/Copilot/Aider, or the sessions were rotated), outlier does **not** pretend: it marks execution `⚠ Unmeasured`, shows the weak `Co-Authored-By` commit-tag figure only as a labelled *proxy/floor*, and skips the behavioral label rather than assert a character read on a blind signal — *or* you bracket those sessions with [`outlier watch`](#tool-agnostic-capture--the-effect-observer-outlier-watch) to capture them tool-agnostically. On a **shared repo** (more than one commit author) it scopes both sides to *your* lines via `git blame` — your agent's lines over *your* surviving lines — so teammates' code isn't miscounted as your "human" work; the receipt reads `blame · your slice · 5K of 12K · 4 contributors`. (Each developer measures their own slice locally; outlier never reads anyone else's machine.)
  - **Intent** — *who decided what to build.* The count and volume of prompts you typed. Hundreds of prompts means you steer, even when execution is mostly AI.
  - **Oversight** — *who reviews.* Two local signals, headline is the stronger of the two: the share of commits that read as rework (fix / refactor / revert / review) — direct but brittle, and squash-merge collapses a PR's review commits to one subject → reads ~0 falsely; and **in-session revisions** — edits an agent made to a file beyond its first write (back-and-forth refinement), which is squash-proof and harder to game. Blind spot: an agent's own multi-step edits also count as iteration.
  - The three combine into a label — **Artisan / Centaur / Director / Reviewer / Spectator** — so a low execution % with heavy steering reads as *Director* (you direct agents; the rest is hand/imported prose), not falsely as a hand-coding *Artisan*. High AI execution is healthy when intent + oversight are present; it's the deskilling pattern only when they're absent.
- **Tokens, split honestly.** The headline "new tokens" is `total − cache_read`: the work actually done. For agentic sessions ~95%+ of raw tokens are cache **re-reads** (context re-sent each turn), shown separately so the cost number isn't a vanity figure. Energy is computed from output tokens only; cost discounts cache reads.
- **Cost ($)** is exact when the log carries a cost field, otherwise a *rough* blended token estimate (labelled as such).
- **Carbon** is a rough estimate (inference energy varies ~4–20× in the literature) and the per-region figure is a *counterfactual* — cloud inference runs on the provider's grid, not yours. Treat it as an order-of-magnitude signal, not an audit.
## Install & Use

**The easy path — just run it.** One word, then a menu does the rest:

```bash
npx outlier-audit          # runs the audit, then opens a guided menu
```

```text
┌──────────────────────────────────────────────────────────────────┐
│ █▀█ █░█ ▀█▀ █░░ █ █▀▀ █▀█  :: CODE AUDIT                          │
│ █▄█ █▄█ ░█░ █▄▄ █ ██▄ █▀▄  :: my-repo · JUN 23, 2026              │
├──────────────────────────────────────────────────────────────────┤
│  WHAT YOUR AGENTS CAN REACH                                      │
│ Blast radius   HIGH · 13 tools, 5 can write/deploy · 6 unused    │
│ Full map (deploy/push/write tools): outlier capabilities         │
├──────────────────────────────────────────────────────────────────┤
│  WHAT IT COST                                                    │
│ New tokens       3.1M (work done)                                │
│ Re-read context  74M (96% of all tokens)                         │
│ Est. spend       $18.40                                          │
│ Re-read ratio    ▰▰▰▰▰▰▰▰▰▰ 96%                                  │
│ Energy           0.12kg CO2 (Global Average grid)                │
│ Source: estimated · Claude Code transcripts                      │
├──────────────────────────────────────────────────────────────────┤
│  YOUR LIMIT                                                      │
│ AI cap   70% · change with: outlier policy                       │
│ Status   Within limit · Nothing to do.                           │
├──────────────────────────────────────────────────────────────────┤
│ Who wrote the code · a mirror, not a verdict · outlier learn     │
│ Execution  62% AI (blame · 5.1K of 8.2K live lines)              │
│ Intent     240 prompts · ~180K tokens you typed                  │
│ Oversight  64% · 18/160 rework commits · 240/380 in-session rev. │
│                                                                  │
│ Centaur — AI writes most of it, but you steer and review.        │
│ Blind: copy-paste from chat is invisible; prompt quality unmeas… │
├──────────────────────────────────────────────────────────────────┤
│  WHAT TO DO                                                      │
│ ⚠ Blast radius HIGH                                              │
│   → Disable the write/deploy MCP tools you don't need now.       │
│ → Learn what the AI wrote: outlier learn — one skill to unlock   │
└──────────────────────────────────────────────────────────────────┘
```

**Want the short `outlier` command?** Install globally:
```bash
npm install -g outlier-audit   # no sudo — use a node manager (mise/nvm) if you hit EACCES
outlier                        # now the command is just `outlier`
```
If `npx` ever serves a stale version, clear its cache: `rm -rf ~/.npm/_npx`.

**First run** shows a one-time welcome screen (in a real terminal). It does **not** appear on
later runs. To replay it: `rm ~/.outlier_config`.

**Notes**
- `outlier policy` installs a local **git pre-commit hook** (`.git/hooks/pre-commit`) that
  *warns* over your AI-authorship limit. It backs up any existing hook. Needs write access to
  your own repo's `.git/` (normal).
- `outlier init` adds an opt-in once-a-day greeting to your shell rc — it **asks first**;
  remove it with `outlier uninit`.
- Everything is local-first: no network, no account, nothing leaves your machine.

> The package on npm is **`outlier-audit`**; the command it provides is **`outlier`**. So with
> a global install you type `outlier …`; with npx you type `npx outlier-audit …`. The tool
> prints whichever form matches how you launched it.

## What Outlier Adds
`outlier` builds a coordination layer on top of native agent workflows.

| Capability | Ungoverned AI | Outlier Governed |
|------------|---------------|------------------|
| **Authorship** | You can't tell how much is yours | Blame-based, content-matched, team-scoped — and it abstains rather than guess |
| **Skill** | The AI's code teaches you nothing | `outlier learn` turns a technique it used into a lesson with the `file:line` in your repo |
| **Agent reach** | Opaque MCP access | Maps what your agents can reach + a **blast-radius** score; flags unused-but-reachable tools |
| **Context cost** | Blind token spend | Splits new work from re-sent context (most of your bill) |
| **Any tool** | Only Claude leaves a readable log | `outlier watch` captures Cursor/Aider/Copilot/… by their file changes |
| **Commit gate** | Ships AI code unchecked | A local hook *warns* when AI authorship is over your limit |
| **Agents & CI** | No machine signal | `--json` audit a supervisor agent or pipeline can act on |

## Commands
| Command | Purpose |
|---------|---------|
| `npx outlier-audit` | Run the full AI reliance & capability audit |
| `npx outlier-audit authorship` | Scan git history for AI co-authorship ratio |
| `npx outlier-audit carbon` | Scan local logs for context waste & token costs |
| `npx outlier-audit capabilities` | Map what your agents can reach + blast radius |
| `npx outlier-audit learn` | Turn a technique the AI used into a skill to learn |
| `npx outlier-audit watch -- <cmd>` | Observe ANY agent (Cursor/Aider/…) by its file changes, not its logs |
| `npx outlier-audit policy` | Configure Personal, Team, or Enterprise guardrails in CI |
| `npx outlier-audit --json` | Machine-readable audit for agents, CI, and swarms |

### Tool-agnostic capture — the effect-observer (`outlier watch`)

The honest execution signal reads Claude Code's transcripts. Other tools write a different log (Aider), a proprietary one (Cursor), or none at all (Copilot inline, web IDEs) — so for them outlier abstains (`⚠ Unmeasured`). The observer fixes that by measuring the **artifact, not the tool's log**: bracket an agent session and the lines that appear during it are attributed to that tool.

```bash
outlier watch -- claude        # wrap any terminal agent (cursor-agent, aider, codex, …)
outlier watch start            # for GUI tools (Cursor IDE, Copilot): begin a manual session
#   …work in your editor…
outlier watch stop             # record what changed
outlier status                 # execution now counts that session — no Claude logs needed
```

It writes a local ledger of **line hashes** (never source) to `~/.outlier/observed/`, which unions into the same signal the transcript reader feeds — so **execution and the learning loop become tool-agnostic for any tool**, and you even get per-tool attribution. Honest limits: it's forward-only (can't attribute past history), the whole bracketed window is attributed to the tool (hand-edits during it count as the agent), and it captures *code changes, not tokens* — so cost/carbon still needs the transcripts.

### Learn loop — coach, not judge (`outlier learn`)

A reliance number can scold ("you're a Spectator") without helping. `outlier learn` flips it: it reads the code your agent actually wrote and surfaces **one technique it used that you can go learn** — the concept, *the exact `file:line` in your own repo*, and a 30-second challenge ("rewrite this from memory"). Mark it learned (`outlier learn --done <id>`) and the next one surfaces. It's a small, curated, local pattern catalog (hashing & tokens, concurrent async, transactions, memoization, streams, rate-limiting, …) matched against the agent's own tool-writes — no network, no LLM call. Especially for "vibe coders": instead of guilt, a path to actually understand what you shipped.

### For agents, CI & swarms (`--json`)

`outlier --json` emits a clean, ANSI-free JSON audit and nothing else — so an agent (or a supervisor in a swarm) can read its own authorship, cost, carbon, and **blast radius** before it acts, and CI can gate on it. Local-first: it still never leaves the machine.

```jsonc
{
  "tool": "outlier",
  "authorship": {
    "aiPercent": 7.4, "provenance": "proxy",
    "contribution": {
      "label": "Director",
      "execution": { "aiPercent": 62.0, "source": "edits", "confidence": "measured", "aiLines": 5100, "totalLines": 8200, "contributors": 4, "shared": true, "scopedToUser": true },
      "intent":    { "prompts": 240, "promptTokens": 180000 },
      "oversight": { "iterationRate": 0.18, "iterationCommits": 29, "totalCommits": 160 }
    }
  },
  "cost": { "totalTokens": 137700000, "newTokens": 5500000, "reReadTokens": 132200000, "estUsd": 63.76, "provenance": "measured" },
  "carbon": { "co2Kg": 0.10, "region": "Global Average", "provenance": "estimated" },
  "reach": { "blastRadius": "HIGH", "toolCount": 13, "toolsUsed": 7, "toolsLatent": 6, "writeOrDeployCount": 5,
             "reasons": ["can deploy to production", "6 write/deploy/money tools reachable but never used"] },
  "policy": { "aiCapPercent": 70, "status": "within" }
}
```

### First run
The very first time you run it in a terminal, outlier shows a short welcome: what it stands for (keep the skill while you use the speed; measure honestly; local, not surveillance), the problem it addresses, and its zero-trust principles — then asks you to set your **governance framework**: who the limit is for (Personal / Team / Enterprise) and the maximum AI-authorship share you'll allow before it flags a review (50 / 70 / 85 / 100%). That cap is saved to `~/.outlier_config` and drives the **YOUR LIMIT** line on every audit. Change it anytime with `outlier policy`. In CI / non-interactive shells the welcome is skipped (no hang) and the default 70% cap applies.

## Share

Run `outlier` and pick **Share flex receipt** from the menu. It copies an anonymized ASCII receipt to your clipboard — ready to paste in Slack, Discord, or X.

- **25 roast-style templates**, including news-themed quotes (token bills, AI safety, regulation).
- **Multi-AI Chat** — pick **ChatGPT** or **Perplexity** and get a prefilled prompt that opens instantly in the browser.
- **RSS-refreshing feed** — science-headline templates auto-update from HN, The Verge, TechCrunch, and MIT Tech Review (`bun scripts/refresh-quotes.ts`).

```text
 ┌──────────────────────────────────────────────────────────────────┐
 │ "My token bill this month could fund a junior dev.  Context: 93%"│
 └─┬────────────────────────────────────────────────────────────────┘
   │
  [🤖] — Audit generated by outlier
         Code Yield: 3.6% | Context Tax: 93.8%
```

## Quickstart: Your First Audit

**Prerequisites:** You need Node/Bun installed and to be inside a Git repository.

1. **Run your first audit**
   ```bash
   npx outlier-audit
   ```
   *See who wrote the code, what it cost, and what your agents can reach. (First run also asks you to set a governance cap.)*

2. **Learn what the AI wrote**
   ```bash
   npx outlier-audit learn
   ```
   *One technique the agent used in your code — concept, the `file:line` in your repo, and a 30-second challenge. Coach, not judge.*

3. **Capture any tool (not just Claude Code)**
   ```bash
   npx outlier-audit watch -- cursor-agent     # or aider, codex, claude…
   ```
   *Observe an agent by its file changes, so its work counts even if it leaves no readable log.*

4. **Set a limit & wire into CI (optional)**
   ```bash
   npx outlier-audit policy     # local pre-commit hook that WARNS, never blocks
   npx outlier-audit --json     # machine-readable audit for a supervisor agent or pipeline
   ```

## The ideas behind it
A few well-grounded signals, measured honestly — not a manifesto:
- **The automation paradox (Bainbridge, 1983):** when operators delegate the work, they lose the skill they need to supervise it. Outlier surfaces this as a profile (execution / intent / oversight) and answers it with `outlier learn` — a prompt to stay fluent, not a wall.
- **Regional carbon:** the energy cost of a token is the same anywhere, but the *grid* it runs on is not — identical work weighs far more on a coal-heavy grid than a nuclear one. Outlier weights its (rough, counterfactual) carbon estimate by grid intensity to make that visible. See `data/grid-factors.json`.
- **Measuring authorship at all:** commit metadata can't see how agentic coding actually happens. Outlier's execution signal is blame-based and content-matched, scoped to your lines, tool-agnostic via `outlier watch`, and it abstains when it genuinely can't tell. The honesty is the point.

## FAQ

**Does this send my code or prompts to the cloud?**  
**Absolutely not.** `outlier` is built on a strict **Zero-Trust, Local-First Architecture**. It runs native parsing commands against your `.git/` history and your local `~/.claude/` session logs. It never calls an API, it never extracts your proprietary data, and it never phones home. Your research, your code, and your prompts stay 100% on your machine. We believe in open-source integrity.

**Do I need to be using a specific IDE?**  
No. The git-based signals work for any tool. The *rich* execution signal reads Claude Code's session transcripts directly; for any other tool (Cursor, Aider, Copilot, …) you bracket the session with `outlier watch` and it's captured by the file changes. When there's no signal at all, outlier abstains rather than guess.

**Can I run this in CI/CD like GitHub Actions?**  
Yes. Use the `--strict` flag (`npx outlier-audit audit --strict`) to return standard zero-exit-code parsing for headless CI environments.

## Who is this for?

If you hold one of these roles, `outlier` was built specifically for you. Please help us improve the framework by running an audit and sharing your terminal screenshot on X.com or your favorite developer community!

- **Engineering Managers & CTOs:** Stop flying blind. Measure true AI adoption, enforce zero-trust security on your IP, and cut your API token bloat.
- **Principal & Staff Engineers:** Protect the craft. See your team's blast radius (what your agents can deploy/push/write) and use the warn-on-commit hook to keep humans in the loop.
- **Developers & "Vibe Coders":** See how much of your code is the agent's, learn one technique it used (`outlier learn`), and — if you want — share your receipt to help the research.

## Research & collaborate
There's an ongoing study on how much code AI actually writes, where oversight breaks down, and the regional carbon picture. Real-world receipts make it better.

**Contribute a data point:** run `outlier participate` (or share your receipt screenshot via the [issue templates](https://github.com/rosh100yx/outlier/issues/new/choose)). Nothing is sent automatically — you choose what to share.

See our [Contributing Guide](CONTRIBUTING.md) to get started. Great first issues include adding new regional grid factors to `data/grid-factors.json` or writing custom CI/CD pipeline integrations.

## Why outlier exists

AI writing your code is not the problem. **Losing track of it is.**

Every month, agents write more of what ships under your name. That is good leverage — *as long as you stay the author of your own judgment.* The risk isn't some 10-year apocalypse; it's the quiet, present-tense gap you already have:

- You can't see **how much** of your codebase is actually yours.
- You can't see **what your agents can reach** — which of them can deploy, push, or move money if a prompt injection drives them.
- You can't see **what it cost** — most of your token bill is re-sent context, not work.
- And the code the AI wrote teaches you nothing — unless something turns it into a lesson.

Outlier closes that gap, locally, in about 90 seconds. It's a **mirror, not a verdict**: it measures honestly (and abstains rather than guess when it can't tell), shows your real security surface, and — instead of scolding you about "deskilling" — turns the techniques the AI used into skills you can actually learn (`outlier learn`). Keep the speed. Keep the skill.

<div align="center">
  <img src="https://raw.githubusercontent.com/rosh100yx/outlier/main/assets/codecore.gif" alt="Codecore Aesthetic" width="300" />
</div>

> The macro picture — how fast agents are taking on longer tasks, and what that means for review and oversight — is laid out (with the METR data) in `outlier impact` and the [research](paper/measuring-ai-use.md). It's context, not a scare graphic: the point is to close the understanding gap on purpose, not to panic about it.

## License
MIT License
