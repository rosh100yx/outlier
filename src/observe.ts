// The effect-observer — tool-agnostic execution capture.
//
// Instead of reading any tool's proprietary log, we measure the ARTIFACT: the lines that
// appear in the repo during a bracketed agent session. Bracket = `outlier watch -- <cmd>`
// (wrap a terminal agent) or `outlier watch start` / `stop` (for GUI tools you can't wrap).
// Everything added in the window is attributed to that tool and written to a local ledger of
// line HASHES (no source at rest). The ledger then unions into the same aiSet the Claude
// transcript reader feeds — so execution + learning go tool-agnostic for ANY tool.
//
// Honest limits (surfaced to the user): forward-only; the whole window is attributed to the
// tool (hand-edits during it count as agent); no token/cost data (the filesystem has none).

import { execSync, spawnSync } from 'child_process';
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';
import { isCountedPath, isSubstantive, hashLine, repoRootOf } from './util';

const MAX_FILE = 2 * 1024 * 1024;

function observedDir(baseDir: string): string {
  const dir = join(baseDir, '.outlier', 'observed');
  try { mkdirSync(dir, { recursive: true }); } catch {}
  return dir;
}
const slugFor = (repoRoot: string): string => repoRoot.replace(/[/\\]+/g, '-').replace(/^-+/, '');
const ledgerPath = (repoRoot: string, baseDir: string) => join(observedDir(baseDir), slugFor(repoRoot) + '.jsonl');
const pendingPath = (repoRoot: string, baseDir: string) => join(observedDir(baseDir), slugFor(repoRoot) + '.pending.json');

// All counted, non-huge files in the working tree (tracked + untracked, minus gitignored).
function workingFiles(repoRoot: string): string[] {
  const run = (args: string) => {
    try {
      return execSync(`git -C "${repoRoot}" ${args}`, { stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 256 * 1024 * 1024 })
        .toString().split('\0').filter(Boolean);
    } catch { return []; }
  };
  const set = new Set<string>([...run('ls-files -z'), ...run('ls-files --others --exclude-standard -z')]);
  return [...set].filter(isCountedPath);
}

// Snapshot: file → set of substantive line hashes, right now.
function snapshot(repoRoot: string): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const rel of workingFiles(repoRoot)) {
    const abs = join(repoRoot, rel);
    try { if (statSync(abs).size > MAX_FILE) continue; } catch { continue; }
    let text = ''; try { text = readFileSync(abs, 'utf-8'); } catch { continue; }
    const set = new Set<string>();
    for (const raw of text.split('\n')) { const t = raw.trim(); if (isSubstantive(t)) set.add(hashLine(t)); }
    map.set(rel, set);
  }
  return map;
}

// Lines present at `now` that were not present in the same file at `base` = added this session.
function diffSnapshots(base: Map<string, Set<string>>, now: Map<string, Set<string>>): { hashes: string[]; files: string[] } {
  const hashes = new Set<string>();
  const files = new Set<string>();
  for (const [file, nowSet] of now) {
    const baseSet = base.get(file) || new Set<string>();
    for (const h of nowSet) if (!baseSet.has(h)) { hashes.add(h); files.add(file); }
  }
  return { hashes: [...hashes], files: [...files] };
}

interface LedgerEntry { ts: string; tool: string; head: string; files: string[]; addedLines: number; hashes: string[]; }

function headSha(repoRoot: string): string {
  try { return execSync(`git -C "${repoRoot}" rev-parse --short HEAD`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
  catch { return ''; }
}

function appendLedger(repoRoot: string, baseDir: string, tool: string, diff: { hashes: string[]; files: string[] }): number {
  if (diff.hashes.length === 0) return 0;
  const entry: LedgerEntry = {
    ts: new Date().toISOString(), tool, head: headSha(repoRoot),
    files: diff.files, addedLines: diff.hashes.length, hashes: diff.hashes,
  };
  try { appendFileSync(ledgerPath(repoRoot, baseDir), JSON.stringify(entry) + '\n'); } catch {}
  return diff.hashes.length;
}

// Public: union of all observed line hashes for this repo (the second aiSet provider).
export function getObservedHashes(repoRoot: string, baseDir: string = homedir()): Set<string> {
  const out = new Set<string>();
  const p = ledgerPath(repoRoot, baseDir);
  let text = ''; try { text = readFileSync(p, 'utf-8'); } catch { return out; }
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try { const e = JSON.parse(line); if (Array.isArray(e.hashes)) for (const h of e.hashes) out.add(h); } catch {}
  }
  return out;
}

// `outlier watch -- <cmd…>`: snapshot, run the agent, snapshot, record what it added.
export function runWrap(cmd: string[], cwd: string = process.cwd(), baseDir: string = homedir()): { tool: string; added: number; files: number } {
  const repoRoot = repoRootOf(cwd);
  const tool = basename(cmd[0] || 'agent');
  const before = snapshot(repoRoot);
  spawnSync(cmd[0] as string, cmd.slice(1), { stdio: 'inherit' });
  const after = snapshot(repoRoot);
  const diff = diffSnapshots(before, after);
  const added = appendLedger(repoRoot, baseDir, tool, diff);
  return { tool, added, files: diff.files.length };
}

// `outlier watch start`: persist a baseline so a later `stop` (after a GUI session) can diff.
export function runStart(tool: string, cwd: string = process.cwd(), baseDir: string = homedir()): { already: boolean } {
  const repoRoot = repoRootOf(cwd);
  if (existsSync(pendingPath(repoRoot, baseDir))) return { already: true };
  const base = snapshot(repoRoot);
  const serial: Record<string, string[]> = {};
  for (const [f, set] of base) serial[f] = [...set];
  writeFileSync(pendingPath(repoRoot, baseDir), JSON.stringify({ startedAt: new Date().toISOString(), tool, baseline: serial }));
  return { already: false };
}

// `outlier watch stop`: diff the saved baseline against now, record, clear the pending state.
export function runStop(cwd: string = process.cwd(), baseDir: string = homedir()): { ran: boolean; tool?: string; added?: number; files?: number; staleHours?: number } {
  const repoRoot = repoRootOf(cwd);
  const pp = pendingPath(repoRoot, baseDir);
  if (!existsSync(pp)) return { ran: false };
  let pending: any; try { pending = JSON.parse(readFileSync(pp, 'utf-8')); } catch { return { ran: false }; }
  const base = new Map<string, Set<string>>();
  for (const [f, arr] of Object.entries(pending.baseline || {})) base.set(f, new Set(arr as string[]));
  const diff = diffSnapshots(base, snapshot(repoRoot));
  const added = appendLedger(repoRoot, baseDir, pending.tool || 'manual', diff);
  try { require('fs').unlinkSync(pp); } catch {}
  const staleHours = pending.startedAt ? (Date.now() - new Date(pending.startedAt).getTime()) / 3.6e6 : 0;
  return { ran: true, tool: pending.tool || 'manual', added, files: diff.files.length, staleHours: +staleHours.toFixed(1) };
}

export function watchStatus(cwd: string = process.cwd(), baseDir: string = homedir()): { active: boolean; tool?: string; startedAt?: string; sessions: number } {
  const repoRoot = repoRootOf(cwd);
  let sessions = 0;
  try { sessions = readFileSync(ledgerPath(repoRoot, baseDir), 'utf-8').split('\n').filter(l => l.trim()).length; } catch {}
  const pp = pendingPath(repoRoot, baseDir);
  if (existsSync(pp)) {
    try { const p = JSON.parse(readFileSync(pp, 'utf-8')); return { active: true, tool: p.tool, startedAt: p.startedAt, sessions }; } catch {}
  }
  return { active: false, sessions };
}
