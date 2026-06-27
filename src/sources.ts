// Source Detector — the foundation for being tool-agnostic.
//
// outlier reads whatever AI telemetry the developer's tools already leave on disk, then
// uses the richest source per metric and labels its provenance. This keeps us local-first
// (we never call a tool's API — we read the local trace it writes) and lets us add new
// tools without changing the receipt.
//
// Provenance ladder (per metric): MEASURED  > ESTIMATED > PROXY > NONE.
//
// Tool coverage (as of v0.24):
//   MEASURED/ESTIMATED : Claude Code transcripts, tokenomics-log.jsonl, ccusage, CodeCarbon
//   PROXY              : Cursor (ai-code-tracking.db), Gemini/Antigravity (history.jsonl),
//                        Aider (.aider.chat.history.md), OpenCode (~/.opencode/session/),
//                        Continue (~/.continue/sessions/)
//   DETECTED ONLY      : GitHub Copilot, Windsurf/Codeium, Kilo Code, VS Code,
//                        JetBrains AI, Zed, Bolt, Devin, Replit, Kodu, Qodo

import { homedir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { claudeProjectSlug } from './util';

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
    execSync(`command -v ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch { return false; }
}

function hasPath(p: string): boolean {
  try { return existsSync(p); } catch { return false; }
}

// macOS app support path.
function appSupport(name: string): string {
  return join(HOME, 'Library', 'Application Support', name);
}

// VS Code extension global storage path.
function vscodeExt(extensionId: string): string {
  return join(appSupport('Code'), 'User', 'globalStorage', extensionId);
}

// Fingerprint the local environment. Cheap checks only (no file reads here).
export function detectSources(cwd: string = process.cwd()): DetectedSources {
  const tools: string[] = [];
  const add = (t: string) => { if (!tools.includes(t)) tools.push(t); };

  // ── CLI tools ──────────────────────────────────────────────────────────────
  const cliTools: Record<string, string> = {
    claude: 'claude',
    cursor: 'cursor',
    aider: 'aider',
    gemini: 'gemini',
    opencode: 'opencode',
    cody: 'cody',
    continue: 'continue',
    codex: 'codex',
    devin: 'devin',
  };
  for (const [name, cmd] of Object.entries(cliTools)) {
    if (hasCli(cmd)) add(name);
  }

  // ── Home-dir config/data directories ──────────────────────────────────────
  const homeDirs: Record<string, string> = {
    claude: '.claude',
    cursor: '.cursor',
    gemini: '.gemini',
    codeium: '.codeium',       // Codeium / Windsurf
    continue: '.continue',
    aider: '.aider.conf.yml',
    opencode: '.opencode',
  };
  for (const [name, dir] of Object.entries(homeDirs)) {
    if (hasPath(join(HOME, dir))) add(name);
  }

  // ── macOS app bundles / support dirs (IDE installs without CLI) ────────────
  if (hasPath(appSupport('Cursor'))) add('cursor');
  if (hasPath(appSupport('Windsurf'))) add('windsurf');
  if (hasPath(appSupport('Zed'))) add('zed');

  // ── VS Code extensions (no CLI on PATH) ────────────────────────────────────
  if (hasPath(vscodeExt('GitHub.copilot-chat'))) add('copilot');
  if (hasPath(vscodeExt('github.copilot-chat'))) add('copilot');
  if (hasPath(vscodeExt('sourcegraph.cody-ai'))) add('cody');
  if (hasPath(vscodeExt('kilocode.kilo-code'))) add('kilo-code');
  if (hasPath(vscodeExt('codeium.windsurf'))) add('windsurf');

  // JetBrains AI Assistant writes nothing local we can read — detect via config dir.
  if (hasPath(join(HOME, '.config', 'JetBrains'))) add('jetbrains');

  // ── Carbon/cost tooling ────────────────────────────────────────────────────
  if (hasCli('codecarbon')) add('codecarbon');
  if (hasCli('ccusage')) add('ccusage');

  // ── Token / cost source (richest first) ────────────────────────────────────
  const slug = claudeProjectSlug(cwd);
  const claudeProjectDir = join(HOME, '.claude', 'projects', slug);
  const tokenomicsLog = join(HOME, '.claude', 'tokenomics-log.jsonl');

  let tokenSource: DetectedSources['tokenSource'];

  if (hasPath(tokenomicsLog)) {
    // Custom Stop hook: carries real cost_usd → measured cost.
    tokenSource = { name: 'caveman tokenomics log', provenance: 'measured' };
  } else if (hasPath(claudeProjectDir)) {
    // Standard transcripts: real tokens, cost estimated.
    tokenSource = { name: 'Claude Code transcripts', provenance: 'estimated' };
  } else if (tools.includes('ccusage')) {
    tokenSource = { name: 'ccusage', provenance: 'estimated' };
  } else if (hasPath(join(HOME, '.gemini', 'antigravity-cli', 'history.jsonl'))) {
    // Gemini/Antigravity: prompt text only → proxy token count.
    tokenSource = { name: 'Gemini CLI history.jsonl', provenance: 'proxy' };
  } else if (hasPath(join(HOME, '.cursor', 'ai-tracking', 'ai-code-tracking.db'))) {
    // Cursor: AI code hashes / file snapshots → proxy token count.
    tokenSource = { name: 'Cursor ai-code-tracking.db', provenance: 'proxy' };
  } else if (hasPath(join(cwd, '.aider.chat.history.md'))) {
    // Aider: conversation history → proxy token count.
    tokenSource = { name: 'Aider .aider.chat.history.md', provenance: 'proxy' };
  } else if (hasPath(join(HOME, '.opencode', 'session'))) {
    tokenSource = { name: 'OpenCode session logs', provenance: 'proxy' };
  } else if (hasPath(join(HOME, '.continue', 'sessions'))) {
    tokenSource = { name: 'Continue session logs', provenance: 'proxy' };
  } else {
    tokenSource = { name: 'none', provenance: 'none' };
  }

  // ── Carbon source ──────────────────────────────────────────────────────────
  const codecarbonData = hasPath(join(cwd, 'emissions.csv')) || hasPath(join(HOME, '.codecarbon', 'emissions.csv'));
  let carbonSource: DetectedSources['carbonSource'];
  if (codecarbonData) {
    carbonSource = { name: 'CodeCarbon emissions.csv', provenance: 'measured' };
  } else if (tokenSource.provenance === 'measured' || tokenSource.provenance === 'estimated') {
    carbonSource = { name: 'model+grid estimate', provenance: 'estimated' };
  } else if (tokenSource.provenance === 'proxy') {
    carbonSource = { name: 'model+grid estimate (proxy tokens)', provenance: 'proxy' };
  } else {
    carbonSource = { name: 'none', provenance: 'none' };
  }

  // ── Capability source ──────────────────────────────────────────────────────
  let capabilitySource: DetectedSources['capabilitySource'];
  if (
    hasPath(join(HOME, '.claude', 'settings.json')) ||
    hasPath(join(cwd, 'AGENTS.md')) ||
    hasPath(join(cwd, '.mcp.json'))
  ) {
    capabilitySource = { name: 'local config (settings/AGENTS/MCP)', provenance: 'measured' };
  } else {
    capabilitySource = { name: 'none', provenance: 'none' };
  }

  return { tools, tokenSource, carbonSource, capabilitySource };
}

// Short label for the receipt, e.g. "estimated · Claude Code transcripts".
export function provLabel(s: { name: string; provenance: Provenance }): string {
  if (s.provenance === 'none') return 'no local data';
  return `${s.provenance} · ${s.name}`;
}
