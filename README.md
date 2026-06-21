# outlier

A local-first, zero-cloud governance framework for measuring AI adoption, carbon exhaust, and authorship erosion directly on the developer's machine.

> Built for the Global South AIS Challenge 2026

## The Problem
When a developer generates code using an AI agent, two unmeasured things happen:
1. **Carbon Exhaust**: A high volume of context tokens (cache reads) are evaluated in energy-heavy data centers.
2. **Authorship Erosion**: The developer cedes skill-retention to the agent.

`outlier` measures both of these directly at the source—your terminal—without sending a single byte of telemetry to a remote server.

## Installation

```bash
npm install -g @rosh100yx/outlier
```

## Usage

Run `outlier` interactively:

```bash
$ outlier
```

Or run specific modules directly:

### 1. Cost Intelligence & Status Audit
Measures Git authorship history, Claude tokenomics (highlighting Cache Bloat), and summarizes the governance status.
```bash
$ outlier status
```

### 2. Capabilities Map (Surface Area)
Maps exactly which Model Context Protocol (MCP) servers and Agent Skills are active in the workspace, proving what the AI has access to.
```bash
$ outlier capabilities
```

### 3. Policy Enforcement
Sets a governance tier (Personal, Team, Enterprise, Regulatory) and physically installs a Git pre-commit hook that prevents commits if AI Authorship exceeds the chosen threshold.
```bash
$ outlier policy
```

## Data Sovereignty
`outlier` does not have a backend. It parses `git log` and `~/.claude/` local files via standard UNIX buffers. Your code and token usage never leave your machine.

## License
MIT
