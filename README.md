<div align="center">
  <img src="https://raw.githubusercontent.com/rosh100yx/outlier/main/assets/cover.jpg" alt="Outlier: AI Code Governance and Policy Engine" width="100%" />
  <h1>Outlier: The Governance & Policy Engine for AI Engineering</h1>
  <p><b>Measure AI adoption. See what your agents can reach. Keep your skill.</b></p>
  <p><i>A local-first CLI for when you are building in a room full of agents — it measures how much of your code AI wrote, what it cost, and what your agents can actually touch, all without a single byte leaving your terminal.</i></p>
  <br/>
  
  <p>
    <a href="https://www.npmjs.com/package/outlier-audit"><img src="https://img.shields.io/npm/v/outlier-audit?style=for-the-badge&color=cb3837&logo=npm" alt="npm" /></a>
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
  │  WHO WROTE THE CODE   execution is only one axis                 │
  │ Execution  62% AI (edits · 5.1K of 8.2K lines)                   │
  │ Intent     240 prompts · ~180K tokens you typed                  │
  │ Oversight  18% fix/refactor/review commits (29/160)              │
  │                                                                  │
  │ Centaur — AI writes most of it, but you steer and review.        │
  │ Blind: copy-paste from chat is invisible; prompt quality unmeas… │
  ├──────────────────────────────────────────────────────────────────┤
  │  WHAT IT COST                                                    │
  │ New tokens       3.1M (work done)                                │
  │ Re-read context  74M (96% of all tokens)                         │
  │ Est. spend       $18.40                                          │
  │ Re-read ratio    ▰▰▰▰▰▰▰▰▰▰ 96%                                  │
  │ Energy           0.12kg CO2 (Global Average grid)                │
  │ Source: estimated · Claude Code transcripts                      │
  ├──────────────────────────────────────────────────────────────────┤
  │  WHAT YOUR AGENTS CAN REACH                                      │
  │ Blast radius   HIGH · 13 tools, 5 can write/deploy · 6 unused    │
  │ Full map (deploy/push/write tools): outlier capabilities         │
  ├──────────────────────────────────────────────────────────────────┤
  │  YOUR LIMIT                                                      │
  │ AI cap   70% · change with: outlier policy                       │
  │ Status   Within limit · Nothing to do.                           │
  ├──────────────────────────────────────────────────────────────────┤
  │  WHAT TO DO                                                      │
  │ ⚠ Blast radius HIGH                                              │
  │   → Disable the write/deploy MCP tools you don't need now.       │
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

- **`git log --numstat`** of the current repo — for the lines actually added across history (the shipped artifact), and the `Co-Authored-By` trailer as a fallback signal.
- **Your Claude Code session transcripts** at `~/.claude/projects/<this-repo>/*.jsonl` — read three ways: the agent's `Edit`/`Write` tool calls (the lines it actually wrote to your files), your prompts (intent), and token usage (cost / cache / carbon). Worktrees and moved checkouts of the same repo are found too. (Falls back to `~/.claude/tokenomics-log.jsonl` for cost if present.)

It does **not** send anything anywhere — no API calls, no telemetry, no account. Your code and prompts never leave the machine. The only network action in the whole tool is *you* choosing to open a share link or a feedback issue.

### How accurate is it?

We are deliberately honest about this:

- **"Who wrote the code" is a profile, not a single number.** A single % is a lie — it measures only *execution* (the axis AI is taking over) and ignores where human value moved. Outlier reports three axes:
  - **Execution** — *who wrote the lines.* Primary signal: outlier reads the agent's `Edit`/`Write` tool calls from the session transcripts (the lines it actually wrote to your files) and measures them against git's added lines: `aiPercent = 1 − max(0, gitAdded − aiAdded) / gitAdded`. This is denominated in the **shipped artifact**, not in chat tokens, and it is a **lower bound** — any committed line we can't prove an agent wrote is credited to you. Binary/lockfile/generated paths are excluded on both sides. When no agent writes are on record, it falls back to the weak `Co-Authored-By` commit-tag proxy.
  - **Intent** — *who decided what to build.* The count and volume of prompts you typed. Hundreds of prompts means you steer, even when execution is mostly AI.
  - **Oversight** — *who reviews.* The share of commits that look like a human iterating on prior output (fix / refactor / revert / review).
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
◆  What next?
│  ● Pre-flight briefing        before you start an agent
│  ○ Agent reach / blast radius  what your agents can touch
│  ○ Set an AI-authorship limit  local git hook / CI
│  ○ Impact over time · authorship · cost & carbon · research
│  ○ Exit
└  ↑/↓ navigate · enter select · esc to leave
```
No commands to memorise — arrow-key through it. (Run a command directly any time, e.g.
`npx outlier-audit capabilities`, to skip the menu.)

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
| **Deskilling** | Silent skill atrophy | Flags high AI-authorship as a deskilling risk |
| **Commit Gate**| Ships AI code unchecked | A local hook *warns* when AI authorship is over your limit |
| **Context** | Blind token spend | Surfaces re-used context (the part that's most of your bill) |
| **Agent reach** | Opaque MCP access | Maps what your agents can reach + a **blast-radius** score |
| **Agents & CI** | No machine signal | `--json` audit a supervisor agent or pipeline can act on |

## Commands
| Command | Purpose |
|---------|---------|
| `npx outlier-audit` | Run the full AI reliance & capability audit |
| `npx outlier-audit authorship` | Scan git history for AI co-authorship ratio |
| `npx outlier-audit carbon` | Scan local logs for context waste & token costs |
| `npx outlier-audit capabilities` | Map what your agents can reach + blast radius |
| `npx outlier-audit policy` | Configure Personal, Team, or Enterprise guardrails in CI |
| `npx outlier-audit --json` | Machine-readable audit for agents, CI, and swarms |

### For agents, CI & swarms (`--json`)

`outlier --json` emits a clean, ANSI-free JSON audit and nothing else — so an agent (or a supervisor in a swarm) can read its own authorship, cost, carbon, and **blast radius** before it acts, and CI can gate on it. Local-first: it still never leaves the machine.

```jsonc
{
  "tool": "outlier",
  "authorship": {
    "aiPercent": 7.4, "provenance": "proxy",
    "contribution": {
      "label": "Director",
      "execution": { "aiPercent": 62.0, "source": "edits", "aiAddedLines": 5100, "gitAddedLines": 8200 },
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

### The UX Flow
If you run `npx outlier-audit` directly, you'll instantly get your audit receipt and a simple list of follow-up commands:
```text
  └────────────────────────────────────────────────────────┘

 Explore Outlier:
 ────────────────────────────────────────────────────────────
   outlier policy        Configure CI/CD guardrails and thresholds
   outlier capabilities  Audit active MCPs, skills, and orchestrations
   outlier impact        See the compounding horizon of AI Deskilling
   outlier participate   Help build the academic literature
 ────────────────────────────────────────────────────────────

 └ Prove Your Mastery: https://x.com/intent/tweet?...
```

## Quickstart: Your First Audit

**Prerequisites:** You need Node/Bun installed and to be inside a Git repository.

1. **Run your first audit**
   ```bash
   npx outlier-audit
   ```
   *See who wrote the code, what it cost, and what your agents can reach.*

2. **Set a limit (optional)**
   ```bash
   npx outlier-audit policy
   ```
   *Pick a tier (e.g. "Team — 70% max AI"). It installs a local pre-commit hook that **warns** when AI authorship goes over your limit — it never silently blocks your work.*

3. **Wire it into agents or CI**
   ```bash
   npx outlier-audit --json
   ```
   *A clean JSON audit a supervisor agent, a swarm, or a CI pipeline can read and act on.*

## Theoretical Foundations
`outlier` is the live, technical implementation of an academic thesis on the thermodynamics of AI code generation and digital sovereignty. 
- **The Geographic Tax:** Western tech companies ship highly compute-intensive AI tools globally, but local infrastructure in the Global South is forced to absorb the carbon cost. `outlier` proves this by weighting session carbon by regional grid intensity (e.g., proving identical work imports 31x more carbon in Vietnam than France).
- **Disempowerment:** Incremental AI substitution erodes human influence. `outlier` acts as a sovereignty shield against opaque AI platforms.
- **Deskilling:** Delegating operators lose the skills they need to supervise (Bainbridge, 1983). By parsing `Co-Authored-By` Git trailers, `outlier` tracks AI reliance per-individual and flags high reliance as a "Deskilling Risk" — a prompt to review before you delegate more, not a wall.

## FAQ

**Does this send my code or prompts to the cloud?**  
**Absolutely not.** `outlier` is built on a strict **Zero-Trust, Local-First Architecture**. It runs native parsing commands against your `.git/` history and your local `~/.claude/` session logs. It never calls an API, it never extracts your proprietary data, and it never phones home. Your research, your code, and your prompts stay 100% on your machine. We believe in open-source integrity.

**Do I need to be using a specific IDE?**  
`outlier` is IDE-agnostic. It works by parsing standard `Co-Authored-By` Git trailers, meaning it supports Claude Code, Cursor, Aider, and manual generation.

**Can I run this in CI/CD like GitHub Actions?**  
Yes. Use the `--strict` flag (`npx outlier-audit audit --strict`) to return standard zero-exit-code parsing for headless CI environments.

## Who is this for?

If you hold one of these roles, `outlier` was built specifically for you. Please help us improve the framework by running an audit and sharing your terminal screenshot on X.com or your favorite developer community!

- **Engineering Managers & CTOs:** Stop flying blind. Measure true AI adoption, enforce zero-trust security on your IP, and cut your API token bloat.
- **Principal & Staff Engineers:** Protect the craft. See your team's blast radius (what your agents can deploy/push/write) and use the warn-on-commit hook to keep humans in the loop.
- **Developers & "Vibe Coders":** Prove your mastery. Run the audit, check your vibe, and post your "Artisan" or "Centaur" terminal status to the community.

## Support the Thesis & Collaborate
This tool is the technical implementation of an ongoing academic thesis on the thermodynamics of AI code generation, skill atrophy, and digital sovereignty. We are actively looking for collaborators, researchers, and engineers to expand this framework.

**Call for Research Data:** We are actively collecting metrics to prove the "Geographic Tax" and measure industry-wide skill atrophy for our upcoming paper. If you use this tool, please share your terminal screenshot (`outlier audit`) on X.com (tagging the maintainers). By sharing your baseline **AI reliance %** and **carbon estimate**, you provide the exact empirical data we need to map how AI is impacting global engineering teams.

See our [Contributing Guide](CONTRIBUTING.md) to get started. Great first issues include adding new regional grid factors to `data/grid-factors.json` or writing custom CI/CD pipeline integrations.

## The Compounding Horizon of AI Deskilling

When you use an AI agent to skip the boring stuff today, it feels amazing. You get your time back. But what happens over the next 5 to 10 years? 

<div align="center">
  <img src="https://raw.githubusercontent.com/rosh100yx/outlier/main/assets/metr-long-tasks.png" alt="METR Graph" width="350" />
  <p><i>Source: METR (Measuring AI Ability to Complete Long Tasks)</i></p>
</div>

### What Does This Mean For Developers?
- **Today (The 5-minute task):** You gain speed. You lose the muscle memory of writing low-level code.
- **Tomorrow (The 5-hour task):** Agents will solve complex tickets across multiple files. You gain massive scale. You lose the deep, intimate understanding of your own system's architecture.
- **Next 5-10 Years (The 1M+ LOC Crisis):** When an agent introduces a critical bug in a massive codebase, human reviewers will lack the deeply ingrained "systems thinking" required to debug it. 

### Why This Project Exists
`outlier` is the technical circuit breaker that forces developers to stay sharp. We measure the exact cost of AI for humans—not just in API tokens burnt, but in cognitive load and lost mastery. 

<div align="center">
  <img src="https://raw.githubusercontent.com/rosh100yx/outlier/main/assets/codecore.gif" alt="Codecore Aesthetic" width="300" />
</div>

## License
MIT License
