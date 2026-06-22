// Source Detector — the foundation for being tool-agnostic.
//
// outlier reads whatever AI telemetry the developer's tools already leave on disk, then
// uses the richest source per metric and labels its provenance. This keeps us local-first
// (we never call a tool's API — we read the local trace it writes) and lets us add new
// tools without changing the receipt.
//
// Provenance ladder (per metric): MEASURED  > ESTIMATED > PROXY > NONE.

import { homedir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import { execSync } from 'child_process';

export type Provenance = 'measured' | 'estimated' | 'proxy' | 'none';

export interface DetectedSources {
  tools: string[];                 // tools/CLIs found on this machine
  tokenSource: { name: string; provenance: Provenance };
  carbonSource: { name: string; provenance: Provenance };
  capabilitySource: { name: string; provenance: Provenance };
}

const HOME = homedir();

function hasCli(cmd: string): boolean {
  try {
    // `command -v` is POSIX and does not execute the target.
    execSync(`command -v ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function hasPath(p: string): boolean {
  try { return existsSync(p); } catch { return false; }
}

// Fingerprint the local environment. Cheap checks only (no file reads here).
export function detectSources(cwd: string = process.cwd()): DetectedSources {
  const tools: string[] = [];
  const add = (t: string) => { if (!tools.includes(t)) tools.push(t); };

  // AI coding agents (CLI on PATH or a config dir)
  const cliTools: Record<string, string> = {
    claude: 'claude', cursor: 'cursor', aider: 'aider', gemini: 'gemini',
    opencode: 'opencode', cody: 'cody', continue: 'continue', codex: 'codex',
  };
  for (const [name, cmd] of Object.entries(cliTools)) {
    if (hasCli(cmd)) add(name);
  }
  for (const [name, dir] of Object.entries({
    claude: '.claude', cursor: '.cursor', gemini: '.gemini',
    codeium: '.codeium', continue: '.continue', aider: '.aider.conf.yml',
  })) {
    if (hasPath(join(HOME, dir))) add(name);
  }

  // Carbon/cost tooling that writes local data we can trust
  if (hasCli('codecarbon')) add('codecarbon');
  if (hasCli('ccusage')) add('ccusage');

  // ---- Token / cost source (richest first) ----
  const slug = cwd.replace(/\//g, '-');
  const claudeProjectDir = join(HOME, '.claude', 'projects', slug);
  const tokenomicsLog = join(HOME, '.claude', 'tokenomics-log.jsonl');
  let tokenSource: DetectedSources['tokenSource'];
  if (hasPath(tokenomicsLog)) {
    // Custom Stop hook: carries a real cost_usd field -> measured cost.
    tokenSource = { name: 'caveman tokenomics log', provenance: 'measured' };
  } else if (hasPath(claudeProjectDir)) {
    // Standard transcripts: real tokens, estimated cost.
    tokenSource = { name: 'Claude Code transcripts', provenance: 'estimated' };
  } else if (tools.includes('ccusage')) {
    tokenSource = { name: 'ccusage', provenance: 'estimated' };
  } else {
    tokenSource = { name: 'none', provenance: 'none' };
  }

  // ---- Carbon source ----
  // Baseline is our bundled offline model+grid ESTIMATE. CodeCarbon, when it has actually
  // written an emissions.csv, is a higher-accuracy MEASURED path (parser wired in a later
  // pass). We do not claim "measured" just because the CLI is installed.
  let carbonSource: DetectedSources['carbonSource'];
  const codecarbonData = hasPath(join(cwd, 'emissions.csv')) || hasPath(join(HOME, '.codecarbon', 'emissions.csv'));
  if (codecarbonData) {
    carbonSource = { name: 'CodeCarbon emissions.csv', provenance: 'measured' };
  } else if (tokenSource.provenance !== 'none') {
    carbonSource = { name: 'model+grid estimate', provenance: 'estimated' };
  } else {
    carbonSource = { name: 'none', provenance: 'none' };
  }

  // ---- Capability source ----
  let capabilitySource: DetectedSources['capabilitySource'];
  if (hasPath(join(HOME, '.claude', 'settings.json')) || hasPath(join(cwd, 'AGENTS.md')) || hasPath(join(cwd, '.mcp.json'))) {
    capabilitySource = { name: 'local config (settings/AGENTS/MCP)', provenance: 'measured' };
  } else {
    capabilitySource = { name: 'none', provenance: 'none' };
  }

  return { tools, tokenSource, carbonSource, capabilitySource };
}

// Short label for the receipt, e.g. "measured · caveman tokenomics log".
export function provLabel(s: { name: string; provenance: Provenance }): string {
  if (s.provenance === 'none') return 'no local data';
  return `${s.provenance} · ${s.name}`;
}
