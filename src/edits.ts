// Edit-based authorship — the honest "who wrote the code" signal.
//
// output_tokens count everything the model emitted: thinking, explanations, tool
// reasoning, chat. Most of that is not code. Measuring authorship by output tokens
// over-states AI because it counts the talk, not the artifact.
//
// The artifact that ships is the code in git. Agents write it through Edit/Write tool
// calls, and those calls are recorded verbatim in the session transcript. So:
//
//   aiAddedLines  = lines an agent demonstrably wrote to files in THIS repo (transcripts)
//   gitAddedLines = lines git records as added across history (the shipped churn)
//   humanResidual = max(0, gitAddedLines - aiAddedLines)
//                   ^ committed lines no agent is on record for = human (direct IDE
//                     edits, pastes) OR agent writes from a tool we can't see.
//   aiPercent     = 100 * (1 - humanResidual / gitAddedLines)
//
// This is a LOWER bound on AI / conservative toward the human: anything we cannot prove
// an agent wrote is credited to the human. Edits are counted as net growth only
// (max(0, new-old)), so in-place rewrites don't inflate the AI share. The number is
// denominated in the artifact, not in chat volume — that is what makes it defensible.
//
// Blind spot (stated, not hidden): code pasted from an external chat shows up as a human
// direct edit. No local signal can see that.

import { execSync } from 'child_process';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { findRepoTranscriptDirs } from './agentic';

export interface EditAuthorship {
  found: boolean;
  aiAddedLines: number;     // lines agents wrote to repo files (transcript tool calls)
  gitAddedLines: number;    // lines git records as added (whole history, non-merge)
  humanResidualLines: number;
  aiPercent: number;        // 0..100, lower-bound AI share of shipped lines
  filesTouched: number;     // distinct repo files an agent wrote to
}

const linesOf = (s: string): number => (s ? s.split('\n').length : 0);

// Authorship is about code/prose a person or agent TYPES. Git counts additions in files
// nobody hand-authored: binaries it misreads as text (PDFs, fonts), lockfiles, minified
// and generated output, vendored deps. Counting those pollutes the denominator and (since
// agents don't write them either) silently inflates the "human" residual. Exclude them on
// BOTH sides so the ratio compares like with like. (linguist-style denylist, not allowlist.)
const EXCLUDE_RE = new RegExp([
  '\\.(pdf|png|jpe?g|gif|webp|svg|ico|bmp|tiff?|woff2?|ttf|otf|eot|mp4|mov|webm|mp3|wav|zip|gz|tar|tgz|rar|7z|wasm|lockb|ipynb)$',
  '(^|/)(node_modules|dist|build|out|vendor|\\.next|\\.nuxt|\\.svelte-kit|coverage|__snapshots__)/',
  '(^|/)(package-lock\\.json|yarn\\.lock|pnpm-lock\\.yaml|bun\\.lock|composer\\.lock|poetry\\.lock|Cargo\\.lock|Gemfile\\.lock)$',
  '\\.min\\.(js|css)$',
  '\\.(map)$',
].join('|'), 'i');

// numstat may show a rename as "old => new" or "{a => b}/c"; test the new-path tail.
function isCountedPath(raw: string): boolean {
  const path = raw.includes('=>') ? raw.replace(/\{[^}]*=> ?([^}]*)\}/, '$1').replace(/.*=> ?/, '').trim() : raw;
  return !EXCLUDE_RE.test(path);
}

function repoRootOf(cwd: string): string {
  try {
    return execSync(`git -C "${cwd}" rev-parse --show-toplevel`, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim() || cwd;
  } catch { return cwd; }
}

// Sum of added lines across the repo's whole non-merge history. numstat emits
// "<added>\t<deleted>\t<path>" per file; binary files show "-\t-\t<path>" and are skipped.
function gitAddedLines(repoRoot: string): number {
  try {
    const out = execSync(`git -C "${repoRoot}" log --no-merges --numstat --format=`, {
      stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 256 * 1024 * 1024,
    }).toString();
    let added = 0;
    for (const line of out.split('\n')) {
      const m = line.match(/^(\d+)\t\d+\t(.+)$/);
      if (m && m[1] && m[2] && isCountedPath(m[2])) added += parseInt(m[1], 10);
    }
    return added;
  } catch { return 0; }
}

// Lines an agent wrote to files inside repoRoot, read from the session transcripts.
function aiWrittenLines(repoRoot: string, baseDir: string, cwd: string): { lines: number; files: Set<string> } {
  const dirs = findRepoTranscriptDirs(cwd, baseDir);
  let lines = 0;
  const files = new Set<string>();
  const inRepo = (p: any): p is string => typeof p === 'string' && p.startsWith(repoRoot) && isCountedPath(p);

  const countTool = (b: any) => {
    if (!b || b.type !== 'tool_use') return;
    const inp = b.input || {};
    switch (b.name) {
      case 'Write':
        if (inRepo(inp.file_path)) { lines += linesOf(inp.content); files.add(inp.file_path); }
        break;
      case 'Edit':
        if (inRepo(inp.file_path)) {
          lines += Math.max(0, linesOf(inp.new_string) - linesOf(inp.old_string));
          files.add(inp.file_path);
        }
        break;
      case 'MultiEdit':
        if (inRepo(inp.file_path) && Array.isArray(inp.edits)) {
          for (const e of inp.edits) lines += Math.max(0, linesOf(e.new_string) - linesOf(e.old_string));
          files.add(inp.file_path);
        }
        break;
      case 'NotebookEdit':
        if (inRepo(inp.notebook_path)) { lines += linesOf(inp.new_source); files.add(inp.notebook_path); }
        break;
    }
  };

  for (const dir of dirs) {
    let entries: string[] = [];
    try { entries = readdirSync(dir).filter(f => f.endsWith('.jsonl')); } catch { continue; }
    for (const f of entries) {
      let text = '';
      try { text = readFileSync(join(dir, f), 'utf-8'); } catch { continue; }
      for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        try {
          const d = JSON.parse(line);
          const content = d.message && d.message.content;
          if (Array.isArray(content)) for (const b of content) countTool(b);
        } catch {}
      }
    }
  }
  return { lines, files };
}

export function getEditAuthorship(cwd: string = process.cwd(), baseDir: string = homedir()): EditAuthorship {
  const empty: EditAuthorship = { found: false, aiAddedLines: 0, gitAddedLines: 0, humanResidualLines: 0, aiPercent: 0, filesTouched: 0 };
  const repoRoot = repoRootOf(cwd);
  const gitAdded = gitAddedLines(repoRoot);
  if (gitAdded === 0) return empty;

  const { lines: aiAdded, files } = aiWrittenLines(repoRoot, baseDir, cwd);
  // No agent writes captured for this repo → fall back to other signals upstream.
  if (aiAdded === 0) return empty;

  const humanResidual = Math.max(0, gitAdded - aiAdded);
  const aiPercent = +((1 - humanResidual / gitAdded) * 100).toFixed(1);
  return {
    found: true,
    aiAddedLines: aiAdded,
    gitAddedLines: gitAdded,
    humanResidualLines: humanResidual,
    aiPercent,
    filesTouched: files.size,
  };
}
