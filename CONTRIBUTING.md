# Contributing to outlier

First, thank you for considering contributing to `outlier`! We are building the open-source standard for AI code governance and capability auditing.

## The Goal
`outlier` is designed to be the governance layer for AI-generated code. We measure AI Code Reliance (Hallucination Risk), Context Waste (Cache Bloat), and active Capability Surfaces (MCPs/Skills).

## Getting Started
1. Fork the repo.
2. Clone locally: `git clone https://github.com/YOUR_USERNAME/outlier.git`
3. Install dependencies: `bun install`
4. Run locally: `bun run src/cli.ts status`

## Good First Issues
If you're looking for an easy way to contribute:
* **Add Regional Grid Factors:** We keep our energy intensity data in `data/grid-factors.json`. If your country or AWS region isn't listed, please add it! Find the gCO2/kWh data from a reliable source (like Our World in Data) and open a PR.
* **Add new Token Log Parsers:** Currently we parse tokenomics from standard LLM JSONL logs. If you use a different local agent runner, add a parser for its log format in `src/carbon.ts`.
* **CI Integrations:** Add examples for using `npx @rosh100yx/outlier audit` in GitHub Actions, GitLab CI, or Bitbucket Pipelines.

## Pull Request Process
1. Keep PRs small and focused on one feature or bugfix.
2. Ensure you run `bun test` before submitting.
3. If you're adding a new CLI command, ensure it follows the `@clack/prompts` aesthetic used in `src/cli.ts`.

## Code of Conduct
Please ensure all discussions in issues and PRs remain respectful and focused on the technical governance of AI systems.
