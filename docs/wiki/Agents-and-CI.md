# Agents & CI/CD Guardrails

Outlier is designed to work seamlessly in automated environments. While the interactive CLI is beautiful for local terminal users, we have built Outlier to run headlessly as a strict Policy Engine.

## Running in CI/CD
To run Outlier in a GitHub Action or CI runner, always use the `--strict` flag. This disables the interactive UI (spinners, colors) and returns standard zero-exit-code parsing for headless environments.

```yaml
jobs:
  outlier-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx @rosh100yx/outlier audit --strict
```

## The Bouncer (Pre-Commit Hook)
You can install the Bouncer directly into your local `.git/hooks/` directory to physically prevent code commits that exceed your defined AI-reliance threshold (e.g., >70% AI authored).

Run `npx @rosh100yx/outlier policy` to interactively generate and install this hook.
