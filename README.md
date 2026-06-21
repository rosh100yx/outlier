<div align="center">
  <h1>outlier</h1>
  <p><b>AI Code Governance & Capability Auditing for the Terminal</b></p>
</div>

`outlier` is a local-first, zero-cloud CI/CD tool that audits your repository for AI Code Reliance, Hallucination Risk, and Cache Context Waste. It acts as a strict governance gate for AI-generated code.

```text
┌   outlier 
│
◇  [outlier] 4/5 policies • ✓ safe surface • Local CI ───────╮
│                                                            │
│  [1] Capability Engine ▰▰▰▰▰▰▱▱▱▱  Active                  │
│      status: ✓ Configured                                  │
│  [2] AI Code Reliance ▰▰▰▰▰▰▰▰▱▱  20.0% Reliance           │
│      gate: ✓ Hallucination Risk Low                        │
│  [3] Tokenomics & Cost ▰▰▰▰▰▰▰▰▰▱ 96.5% Cache Bloat        │
│      waste: ⚠ 96.5% of tokens are redundant context reads  │
│  Governance: ✓ All clear                                   │
│                                                            │
├────────────────────────────────────────────────────────────╯
```

## The Problem
When developers rely heavily on AI agents to write code, two invisible risks enter the codebase:
1. **Code Durability & Hallucination Risk:** High AI reliance means lower human mastery. Codebases that are >70% AI-generated face severe maintenance and security risks.
2. **Context Waste:** Over 90% of token usage in agentic workflows is often redundant cache reads. This is pure financial and energy waste.

## Theoretical Foundations
`outlier` is built on four core empirical literatures:
- **Disempowerment:** Incremental AI substitution erodes human influence. `outlier` acts as a sovereignty shield against opaque AI platforms.
- **Carbon at the Point of Delegation:** We meter carbon footprint directly at the developer's machine and weight it by local grid factors (e.g., Vietnam vs. France), rather than relying on global datacenter averages.
- **Authorship:** We track AI reliance per-individual via Git parsing, rather than at the population level.
- **Deskilling:** Delegating operators lose supervisory skills (Bainbridge, 1983). `outlier` specifically flags high AI-authorship as a "Deskilling Risk" and "Mentoring Emergency."

`outlier` measures these risks directly at the source—your terminal—without sending a single byte of telemetry to a remote server.

## Installation & Zero-Config Execution

`outlier` requires no environment variables or API keys. It parses existing local telemetry.

```bash
# Run the interactive UI
npx github:rosh100yx/outlier

# Run the CI/CD audit instantly
npx github:rosh100yx/outlier audit
```

### Strict Mode (Enterprise Compliance)
If you are running `outlier` for an official compliance audit or prefer a standard terminal UI without the ASCII cats and passive-aggressive "Vibe" checks, use the `--strict` flag. This removes the personality and outputs clean, dry policy statements.
```bash
npx github:rosh100yx/outlier audit --strict
```

## Features

### 1. The Governance Audit (`npx @rosh100yx/outlier audit`)
Scans Git history and local agent logs to calculate your **AI Code Reliance**. 
If a module is 80% AI-generated, `outlier` flags it as a high hallucination/security risk, requiring human code-review before CI. It also exposes **Cache Bloat**, showing exactly what percentage of your API bill is wasted on redundant context.

### 2. Capabilities Map (`npx @rosh100yx/outlier capabilities`)
A critical compliance tool. It maps exactly which Model Context Protocol (MCP) servers and Agent Skills are active in the workspace, proving what the AI actually has access to (e.g., preventing unauthorized database or web-search access).

### 3. CI/CD Policy Gates (`npx @rosh100yx/outlier policy`)
Sets a governance tier (Personal, Team, Enterprise) and physically installs a Git pre-commit hook. This hook actively prevents commits if AI Authorship exceeds the chosen threshold, acting as a mandatory human-in-the-loop verification gate.

## Data Sovereignty
`outlier` does not have a backend. It parses `git log` and local JSONL token logs via standard UNIX buffers. Your code and token usage never leave your machine.

## Contributing
We welcome contributions! See our [Contributing Guide](CONTRIBUTING.md) to get started. Great first issues include adding new regional grid factors to `data/grid-factors.json` or writing custom CI/CD pipeline integrations.

## License
MIT
