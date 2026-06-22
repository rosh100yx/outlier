<div align="center">
  <img src="https://raw.githubusercontent.com/rosh100yx/outlier/main/assets/cover.jpg" alt="Outlier: AI Code Governance and Policy Engine" width="100%" />
  <h1>Outlier: The Governance & Policy Engine for AI Engineering</h1>
  <p><b>Measure AI adoption. Enforce Zero-Trust. Protect Human Mastery.</b></p>
  <p><i>Outlier is an open-source, local-first CLI tool that measures AI code reliance, enforces zero-trust telemetry, and protects developers from deskilling by auditing local agent logs (Claude, Cursor) and Git history.</i></p>
  <br/>
  
  <p>
    <img src="https://img.shields.io/badge/Compliance-Strict-blue?style=for-the-badge" />
    <img src="https://img.shields.io/badge/AI_Safety-Enabled-green?style=for-the-badge" />
    <img src="https://img.shields.io/badge/Zero_Trust-Verified-orange?style=for-the-badge" />
  </p>

  <p>
    <b>Get Started Instantly:</b><br/>
    <code>npx @rosh100yx/outlier@latest</code>
  </p>

  <br/>
  
  ```text
  ┌────────────────────────────────────────────────────────┐
  │ █▀█ █░█ ▀█▀ █░░ █ █▀▀ █▀█  :: THERMAL AUDIT RECEIPT    │
  │ █▄█ █▄█ ░█░ █▄▄ █ ██▄ █▀▄  :: TIMESTAMP: 2026-06-23    │
  ├────────────────────────────────────────────────────────┤
  │  [ COGNITIVE BUDGET ]                                  │
  │  AI Authorship     ................. ▇▇▇▇░░░░░░ 40%    │
  │  Human Sovereignty ................. ▇▇▇▇▇▇░░░░ 60%    │
  │                                                        │
  │  ↳ Verdict: (=^ ◡ ^=) CENTAUR                          │
  │    Healthy symbiosis. You orchestrate agents           │
  │    but maintain architectural authority.               │
  ├────────────────────────────────────────────────────────┤
  │  [ FINANCIAL & COMPUTE TOLL ]                          │
  │  Tokens Burnt      ................. 3.12M vs Human    │
  │  Cache Bloat       ................. ▇▇▇▇▇▇▇▇░░ 80%    │
  │  Regional Grid     ................. 1.54 kgCO2        │
  └────────────────────────────────────────────────────────┘
  ```
</div>

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
| **Deskilling** | Silent skill atrophy | JIT Mentoring Triggers on high-reliance |
| **Commit Gate**| Accepts hallucinated code | Physically blocks code over AI-thresholds |
| **Context** | Blind token spend | Detects "Cache Bloat" and context waste |
| **Security** | Opaque MCP access | Maps and audits active skills/capabilities |

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
If you run `npx @rosh100yx/outlier` directly, you'll instantly get your Thermal Receipt and a simple list of follow-up commands:
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

1. **Set the Trap (Install the Bouncer)**
   ```bash
   npx @rosh100yx/outlier policy
   ```
   *Select the "Team (70% Max AI)" tier.*

2. **Trigger the Bouncer**
   Write a massive feature using 100% AI. Attempt to commit it:
   ```bash
   git commit -am "added massive ai feature"
   ```
   *Watch the Bouncer physically block your commit for deskilling risk.*

3. **Measure the Damage**
   ```bash
   npx @rosh100yx/outlier
   ```
   *Instantly generate your Thermal Receipt to see your exact AI Authorship ratio and Token Waste.*

## Theoretical Foundations
`outlier` is the live, technical implementation of an academic thesis on the thermodynamics of AI code generation and digital sovereignty. 
- **The Geographic Tax:** Western tech companies ship highly compute-intensive AI tools globally, but local infrastructure in the Global South is forced to absorb the carbon cost. `outlier` proves this by weighting session carbon by regional grid intensity (e.g., proving identical work imports 31x more carbon in Vietnam than France).
- **Disempowerment:** Incremental AI substitution erodes human influence. `outlier` acts as a sovereignty shield against opaque AI platforms.
- **Deskilling:** Delegating operators lose supervisory skills. By parsing `Co-Authored-By` Git trailers, `outlier` tracks AI reliance per-individual and flags high reliance as a "Deskilling Risk", triggering mandatory mentoring checkpoints.

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
- **Principal & Staff Engineers:** Protect the craft. Use the Bouncer hook to enforce architectural standards and prevent your team from deskilling.
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
