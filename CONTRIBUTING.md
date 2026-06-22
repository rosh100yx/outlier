# Contributing to Outlier

We are thrilled you want to help us measure and mitigate the global trajectory of AI deskilling. This is an open-source research project, and we welcome contributions from developers, researchers, and enterprise teams.

## Getting Started Locally
1. Clone the repository.
2. Install dependencies: `bun install`
3. Build the CLI: `npm run build`
4. Test locally: `bun run src/cli.ts status`

## What We Need Help With

### 1. Expanding the Carbon Grid Data
If you live in a region not listed in `data/grid-factors.json`, please submit a PR! Find your local energy grid's kgCO2/kWh average and add it to the JSON file. This is critical for our research on the "Geographic Tax" of AI.

### 2. Supporting More AI Agents
Currently, we parse `~/.claude/` for Claude Code. We want to support Aider, Cursor, and Devin log parsing in `src/carbon.ts`. 

### 3. Policy Integrations
If your enterprise uses a specific CI/CD pipeline (GitLab, Bitbucket, CircleCI), please contribute a markdown guide on how to integrate `outlier policy` into those environments.

## Pull Request Process
- Ensure you have run `npm run build` to verify the TypeScript compiles correctly.
- Add tests in the `tests/` directory if you are adding new log parsers.
- Keep the terminal aesthetic brutalist, clean, and plain-language.
