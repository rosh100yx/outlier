<div align="center">
  <img src="https://raw.githubusercontent.com/rosh100yx/outlier/main/assets/cover.jpg" alt="Outlier: AI Code Governance and Policy Engine" width="100%" />
  <h1>Outlier: The Governance & Policy Engine for AI Engineering</h1>
  <p><b>Measure AI adoption. See what your agents can reach. Keep your skill.</b></p>
  <p><i>A local-first CLI for when you are building in a room full of agents — it measures how much of your code AI wrote, what it cost, and what your agents can actually touch, all without a single byte leaving your terminal.</i></p>
  <br/>
  
  <p>
    <a href="https://www.npmjs.com/package/@rosh100yx/outlier"><img src="https://img.shields.io/npm/v/@rosh100yx/outlier?style=for-the-badge&color=cb3837&logo=npm" /></a>
    <img src="https://img.shields.io/badge/Local_First-Zero_Trust-orange?style=for-the-badge" />
    <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />
  </p>

  <p>
    <b>Get Started Instantly:</b><br/>
    <code>npx @rosh100yx/outlier@latest</code>
  </p>

  <br/>
  
  ```text
  ┌────────────────────────────────────────────────────────
  │ █▀█ █░█ ▀█▀ █░░ █ █▀▀ █▀█  :: CODE AUDIT
  │ █▄█ █▄█ ░█░ █▄▄ █ ██▄ █▀▄  :: my-repo · JUN 23, 2026
  ├────────────────────────────────────────────────────────
  │  WHO WROTE THE CODE
  │ AI    ▰▰▰▰░░░░░░ 40%   (64 of 160 commits)
  │ You   ▰▰▰▰▰▰░░░░ 60%
  │ Typical: solo devs 10–40% · AI-framework repos up to ~80%
  │ You're driving — you still write the core. That's how you keep the skill.
  ├────────────────────────────────────────────────────────
  │  WHAT IT COST
  │ Tokens used      3.1M
  │ Est. spend       $18.40
  │ Re-used context  ▰▰▰▰▰▰▰▰░░ 80%
  │ Energy           0.12kg CO2 (Global Average grid)
  │ Source: estimated · Claude Code transcripts
  ├────────────────────────────────────────────────────────
  │  WHAT YOUR AGENTS CAN REACH
  │ Blast radius   HIGH · 13 tools, 5 can write/deploy
  │ Full map (deploy/push/write tools): outlier capabilities
  ├────────────────────────────────────────────────────────
  │  YOUR LIMIT
  │ AI cap   70% · change with: outlier policy
  │ Status   Within limit · Nothing to do.
  └────────────────────────────────────────────────────────
  ```
</div>

> *"In a room full of agents" shifts the perspective. The developer is no longer a solo coder — they are a manager of bots. Outlier exists to make sure the human doesn't get lazy while managing them. We all want our time back; we don't want to lose control of the craft.*

## How It Works
```text
┌───────────┐   ┌────────────┐   ┌───────────┐   ┌─────────────┐
│ AI CODING │──▸│ GIT COMMIT │──▸│  BOUNCER  │──▸│ AUDIT TRACE │
└───────────┘   └────────────┘   └───────────┘   └─────────────┘
                                       │ (Fails)
                                 ┌───────────┐
                                 │ MENTORING │
                                 └───────────┘
```
**Step 1:** Developer delegates code generation to an AI agent (Claude Code, Cursor).  
**Step 2:** `outlier` reads the local trace — git history + AI logs — already on the machine.  
**Step 3:** It reports who wrote the code, what it cost, and your authorship limit.  
**Step 4:** Optionally, a local git hook *warns* (never silently blocks) when AI authorship exceeds your limit, so you review before you merge.  

### What it reads (and what it doesn't)

`outlier` is local-first. It reads, from your own machine, only:

- **`git log`** of the current repo — to count commits carrying a `Co-Authored-By` trailer (the AI-authorship share).
- **Your Claude Code session transcripts** at `~/.claude/projects/<this-repo>/*.jsonl` — to sum token usage for the cost / cache / carbon estimate. (Falls back to `~/.claude/tokenomics-log.jsonl` if present.)

It does **not** send anything anywhere — no API calls, no telemetry, no account. Your code and prompts never leave the machine. The only network action in the whole tool is *you* choosing to open a share link or a feedback issue.

### How accurate is it?

We are deliberately honest about this:

- **Authorship** is an exact count of trailer-tagged commits, but it is a *proxy* for real human-vs-AI effort, and it **under-counts** when your agent doesn't write the `Co-Authored-By` trailer. A surprisingly low number usually means missing trailers, not that you wrote everything.
- **Tokens** are exact when the transcripts are present; otherwise the cost/carbon section reads zero.
- **Cost ($)** is exact when the log carries a cost field, otherwise a *rough* blended token estimate (labelled as such).
- **Carbon** is a rough estimate (inference energy varies ~4–20× in the literature) and the per-region figure is a *counterfactual* — cloud inference runs on the provider's grid, not yours. Treat it as an order-of-magnitude signal, not an audit.

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
| `npx @rosh100yx/outlier` | Run the full AI reliance & capability audit |
| `npx @rosh100yx/outlier authorship` | Scan git history for AI co-authorship ratio |
| `npx @rosh100yx/outlier carbon` | Scan local logs for context waste & token costs |
| `npx @rosh100yx/outlier capabilities` | Map what your agents can reach + blast radius |
| `npx @rosh100yx/outlier policy` | Configure Personal, Team, or Enterprise guardrails in CI |
| `npx @rosh100yx/outlier --json` | Machine-readable audit for agents, CI, and swarms |

### For agents, CI & swarms (`--json`)

`outlier --json` emits a clean, ANSI-free JSON audit and nothing else — so an agent (or a supervisor in a swarm) can read its own authorship, cost, carbon, and **blast radius** before it acts, and CI can gate on it. Local-first: it still never leaves the machine.

```jsonc
{
  "tool": "outlier",
  "authorship": { "aiPercent": 7.4, "provenance": "proxy" },
  "cost": { "totalTokens": 137700000, "estUsd": 63.76, "provenance": "measured" },
  "carbon": { "co2Kg": 0.10, "region": "Global Average", "provenance": "estimated" },
  "reach": { "blastRadius": "HIGH", "toolCount": 13, "writeOrDeployCount": 5,
             "reasons": ["can deploy to production", "can push to your remote repos"] },
  "policy": { "aiCapPercent": 70, "status": "within" }
}
```

### The UX Flow
If you run `npx @rosh100yx/outlier` directly, you'll instantly get your audit receipt and a simple list of follow-up commands:
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
   npx @rosh100yx/outlier
   ```
   *See who wrote the code, what it cost, and what your agents can reach.*

2. **Set a limit (optional)**
   ```bash
   npx @rosh100yx/outlier policy
   ```
   *Pick a tier (e.g. "Team — 70% max AI"). It installs a local pre-commit hook that **warns** when AI authorship goes over your limit — it never silently blocks your work.*

3. **Wire it into agents or CI**
   ```bash
   npx @rosh100yx/outlier --json
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
Yes. Use the `--strict` flag (`npx @rosh100yx/outlier audit --strict`) to return standard zero-exit-code parsing for headless CI environments.

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
