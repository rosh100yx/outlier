# Outlier

**Measure what AI adoption really costs, at the point of use.**

When a developer asks an AI agent to write code, two costs appear and neither gets counted: the **carbon** the compute burns, and the **authorship** the developer hands over. Existing tools count the tokens and the cloud bill. They do not count the carbon footprint, and they do not count what the developer loses.

Outlier reads the logs already sitting on the developer's machine and surfaces two numbers:

- **AI authorship share** — the fraction of work authored by AI, from commit co-author trailers.
- **Session carbon** — tokens generated × energy per token × local grid intensity.

No new infrastructure. No data leaves the machine. It is a *reader* of logs that already exist.

> Research prototype from the [Global South AI Safety Hackathon 2026](https://apartresearch.com/sprints/global-south-ais-hackathon-2026-06-19-to-2026-06-21) (Apart Research), Asia track. This is the public home of the paper *"Measuring AI Use: A Governance Framework for Carbon, Authorship Erosion, and AI Adoption."* We will build the full tool on top of it.

---

## Key findings

From one real solo-founder repository and its own AI session logs:

- **75.6%** of commits carried an AI co-author (82.2% excluding merge commits), and the repo crossed into **majority-AI authorship within two weeks** and never dropped below 71%. On a sample of public AI-framework repos, authorship share ranges **21–79%**; this developer sits at the top of that range.
- The session logs recorded **2.26 billion tokens over 27 days**, of which **94.9% were cache reads** (re-sent context, not new reasoning). This is a first-party confirmation of the "context tax" the literature only estimates.
- The same AI workload emits roughly **31× more carbon on Vietnam's coal-heavy grid (681 gCO₂/kWh) than on France's clean grid (≈22)**, purely because of local energy mix. The regional ratio is exact; the absolute per-country figure is a bound (the developer was mobile across Southeast Asia during logging).

The point: the side effects of AI adoption are **half-visible and wholly unmeasured** at the place they are produced — the developer's computer.

## The two indicators

**1. AI authorship share** (skill side)

```
AI authorship share = (work units attributed to AI) / (total work units)
```

The work unit is a git commit. A commit is AI-attributed if its message carries a machine-readable trailer such as `Co-Authored-By: Claude`. Cheap, privacy-preserving, reproducible from public history, and already used by ecosystem-scale trackers. It is a proxy, not a measure of cognition (a commit is not a unit of thought), so we report it as a signal to investigate.

**2. Session carbon** (planetary side)

```
session carbon = tokens generated × energy per token × local grid intensity
```

Tokens come from the AI assistant's own per-message usage ledger (Claude Code writes one to local JSONL files). Energy uses the conservative published consensus of ~0.3 Wh per chat query. Carbon uses the local grid's published intensity. The load-bearing claim is the **grid ratio**, which is fixed by public data and holds under any energy assumption.

## Try it

The authorship-share half runs today on any git repository, with nothing but `git`:

```bash
scripts/outlier-ar.sh /path/to/repo
```

Output:

```
outlier — AI authorship share
repo: /path/to/repo

all commits:        121 / 160     AR = 75.6%
non-merge (floor):  120 / 146     AR = 82.2%

weekly (ISO week  AI/total):
  2026-W19  1/4    25.0%
  2026-W20  11/11  100.0%
  ...
```

It reads only commit metadata. Nothing is sent anywhere.

## Why it matters

AI adoption is happening fastest at the point of use, and governance only operates at the scale of nations and councils. That leaves the developer's computer, where the costs are actually produced, completely unmetered.

For a Global South government, Outlier is a leading indicator of **AI dependency** at the three levels it already regulates:

- **the worker** — a rising authorship share is an early signal of skill erosion and premature deprofessionalization in an IT-export economy, visible years before it reaches employment data;
- **the firm** — an auditable metric for human-oversight mandates such as Vietnam's Decree 142/2026;
- **the nation** — session carbon prices the trade-off between foreign-exchange drain from imported AI clouds and the carbon cost of building sovereign compute.

Because it is local-first and open-source, a regulator can require disclosure for audits while the raw data stays inside the country. No citizen data is exported.

## Status and roadmap

This repo is the research artifact, not the finished product. Today it ships the paper and the authorship-share script.

Next:

- [ ] `outlier` CLI: read git history + session logs + a grid-intensity database, surface a live terminal status line.
- [ ] Session-carbon reader for Claude Code JSONL logs (token ledger → energy → local grid).
- [ ] Policy profiles (personal / team / enterprise / regulatory thresholds).
- [ ] Cross-tool authorship readers beyond git (IDE edit events, orchestration graphs).
- [ ] A cross-regional authorship-share benchmark with a Global South cut.

## Paper

[`paper/measuring-ai-use.pdf`](paper/measuring-ai-use.pdf) — full report, methods, citations, and limitations.

## Honest limitations

- **N = 1, self-selected.** A case study, not a population estimate.
- **Authorship share is a proxy.** AI concentrates in boilerplate, where a high share can be harmless.
- **Carbon is a bound, not an audit.** Cloud inference runs on the provider's grid; the per-country figure is bounded by the developer's travel. The 31× ratio is the robust claim.
- **Energy is estimated, not metered.** Published per-query estimates vary widely, so we rest the argument on the grid ratio and the token ledger, not on absolute joules.

## Citation

```bibtex
@misc{abraham2026outlier,
  title  = {Measuring AI Use: A Governance Framework for Carbon, Authorship Erosion, and AI Adoption},
  author = {Abraham, Roshan},
  year   = {2026},
  note   = {Global South AI Safety Hackathon (Apart Research), Asia track},
  url    = {https://github.com/rosh100yx/outlier}
}
```

## License

MIT. See [LICENSE](LICENSE).

---

*Team Outlier · Global South AI Safety Hackathon 2026 · the human judgment outlier at the terminal.*
