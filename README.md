<div align="center">
  <img src="https://raw.githubusercontent.com/rosh100yx/outlier/main/assets/cover.jpg" alt="Outlier Cover" width="100%" />
  <h1>outlier</h1>
  <p><b>The Governance & Policy Engine for AI Engineering</b></p>
  <p><i>Measure AI adoption. Enforce Zero-Trust. Protect Human Mastery.</i></p>
  <br/>
  
  <p>
    <img src="https://img.shields.io/badge/Compliance-Strict-blue?style=for-the-badge" />
    <img src="https://img.shields.io/badge/AI_Safety-Enabled-green?style=for-the-badge" />
    <img src="https://img.shields.io/badge/Zero_Trust-Verified-orange?style=for-the-badge" />
  </p>

  <p>
    <b>Get Started Instantly:</b><br/>
    <code>npm install -g @rosh100yx/outlier</code><br/>
    <code>outlier status</code>
  </p>
</div>

## The Compounding Value of Outlier (Why This Matters)
Software engineering is undergoing a catastrophic shift in skill acquisition. If you only look at today, AI saves you 30 minutes of writing regex. But if you look at the **compounding horizon of the next 5-10 years**, the value exchange flips.

<div align="center">
  <img src="https://raw.githubusercontent.com/rosh100yx/outlier/main/assets/metr-long-tasks.png" alt="METR Graph" width="800" />
  <p><i>Source: METR (Measuring AI Ability to Complete Long Tasks)</i></p>
</div>

### What Do We Lose and Gain?
- **Today (The 5-minute task):** You use AI to scaffold a component. You **gain** velocity. You **lose** syntax recall. 
- **Tomorrow (The 5-hour task):** Models like Claude Opus 4.5 will autonomously resolve multi-file architectural tickets (as proven by the METR graph). You **gain** massive scale and leverage. You **lose** granular intimacy with your own system architecture. You transition from a *Creator* to a *Reviewer*.
- **The Next 5-10 Years:** Unchecked AI reliance leads to **Deskilling**. When an agent introduces a fatal state bug in a 1M+ LOC codebase, the human reviewers will lack the muscle memory and "systems thinking" required to debug it. 

### How The Paper and Project Complement Each Other
`outlier` is the technical circuit breaker that forces developers to remain High-Agency. The **Paper** maps the trajectory of global skill atrophy and the geographic carbon tax of AI. The **Project (CLI)** is the empirical instrument that gathers this data safely, proving the literature while simultaneously protecting the developer's sovereignty. 

We measure the exact cost of AI for humans—not just in API tokens, but in cognitive load and lost mastery.

<div align="center">
  <img src="https://raw.githubusercontent.com/rosh100yx/outlier/main/assets/codecore.gif" alt="Codecore Aesthetic" width="300" />
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
**Step 2:** Developer attempts to merge code into the main branch.  
**Step 3:** The `outlier` Bouncer hook triggers. If AI reliance > 70%, the commit is physically blocked.  
**Step 4:** A "Mentoring Emergency" is triggered, forcing the developer to solve an architectural challenge to prove mastery and prevent deskilling.  

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
| `outlier` | Start the interactive Onboarding Wizard (Recommended for first-timers) |
| `outlier --help` | View the CLI help menu and all available commands |
| `outlier status` | Run the full AI reliance & capability audit (Generates the Thermal Receipt) |
| `outlier authorship` | Scan git history for AI co-authorship ratio and Hallucination Risk |
| `outlier carbon` | Scan local logs for context waste & token costs |
| `outlier policy` | Configure Personal, Team, or Enterprise guardrails in CI |
| `outlier confessional` | Submit qualitative feedback or feature requests directly from the terminal |

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
   *Watch the Bouncer block your commit for deskilling risk.*

3. **Measure the Damage**
   ```bash
   npx @rosh100yx/outlier audit
   ```
   *See your exact AI Authorship ratio and Token Waste.*

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

## License
MIT License
