// Blame-based authorship — the honest "who wrote the code" signal.
//
// output_tokens count everything the model emitted: thinking, explanations, tool reasoning,
// chat. Most of that is not code. And a churn count (lines an agent added vs lines git added)
// never checks that the agent's lines are the lines that SURVIVED — it compares totals, so an
// agent that wrote 5K lines to file A and a human who wrote 5K to file B read as 50/50 with
// zero overlap.
//
// The honest signal is line-by-line survival, content-matched. For every substantive line that
// exists in the repo now, we ask: did an agent actually emit this exact line? Agents write code
// through Edit/Write/MultiEdit tool calls, recorded verbatim in the session transcripts. So:
//
//   aiLines    = HEAD lines whose content appears in an agent's tool-write output
//   totalLines = HEAD substantive lines (both sides filtered identically)
//   aiPercent  = 100 * aiLines / totalLines
//
// A line counts AI only when it is both substantive AND matches an agent write. Trivial lines
// (blank, bare brackets, <8 chars) are excluded from BOTH sides so boilerplate can't dominate.
//
// Two opposing biases — stated, not hidden — so this is a best estimate, not a strict bound:
//   toward human: reformatted-on-save lines, externally pasted code, lines an agent wrote
//     through a tool we can't see, and (on shared repos) teammates' AI all fall to the human.
//   toward AI: a distinctive line an agent wrote in one place is credited as AI everywhere it
//     recurs in HEAD; the substantive filter limits this but cannot kill it.
// The honesty is in the auditable counts (aiLines of totalLines) and these caveats, not in a
// claim of precision.

import { execSync } from 'child_process';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { findRepoTranscriptDirs } from './agentic';

export interface EditAuthorship {
  found: boolean;
  aiLines: number;       // surviving substantive lines an agent demonstrably wrote
  totalLines: number;    // surviving substantive lines (the denominator)
  humanLines: number;    // totalLines - aiLines
  aiPercent: number;     // 0..100, lower-bound AI share of surviving code
  filesTouched: number;  // distinct repo files an agent wrote to
}

// A line worth attributing: not blank, not pure punctuation/brackets, long enough that a match
// is meaningful. Short and bracket-only lines (`}`, `});`, `return`, ``) collide across all code
// and would create false AI matches, so they are excluded from numerator AND denominator.
function isSubstantive(trimmed: string): boolean {
  if (trimmed.length < 8) return false;
  if (!/[A-Za-z0-9]/.test(trimmed)) return false;
  return true;
}

// Files nobody hand-authored pollute the denominator: binaries git misreads as text (PDFs,
// fonts), lockfiles, minified/generated output, vendored deps. Excluded on both sides.
const EXCLUDE_RE = new RegExp([
  '\\.(pdf|png|jpe?g|gif|webp|svg|ico|bmp|tiff?|woff2?|ttf|otf|eot|mp4|mov|webm|mp3|wav|zip|gz|tar|tgz|rar|7z|wasm|lockb|ipynb)$',
  '(^|/)(node_modules|dist|build|out|vendor|\\.next|\\.nuxt|\\.svelte-kit|coverage|__snapshots__)/',
  '(^|/)(package-lock\\.json|yarn\\.lock|pnpm-lock\\.yaml|bun\\.lock|composer\\.lock|poetry\\.lock|Cargo\\.lock|Gemfile\\.lock)$',
  '\\.min\\.(js|css)$',
  '\\.(map)$',
].join('|'), 'i');

const isCountedPath = (path: string): boolean => !EXCLUDE_RE.test(path);

function repoRootOf(cwd: string): string {
  try {
    return execSync(`git -C "${cwd}" rev-parse --show-toplevel`, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim() || cwd;
  } catch { return cwd; }
}

// The set of substantive lines agents wrote to files inside repoRoot, from the transcripts.
function buildAiLineSet(repoRoot: string, baseDir: string, cwd: string): { lines: Set<string>; files: Set<string> } {
  const lines = new Set<string>();
  const files = new Set<string>();
  const inRepo = (p: any): p is string => typeof p === 'string' && p.startsWith(repoRoot) && isCountedPath(p);

  const addContent = (s: any, path: string) => {
    if (typeof s !== 'string') return;
    files.add(path);
    for (const raw of s.split('\n')) {
      const t = raw.trim();
      if (isSubstantive(t)) lines.add(t);
    }
  };
  const countTool = (b: any) => {
    if (!b || b.type !== 'tool_use') return;
    const inp = b.input || {};
    switch (b.name) {
      case 'Write':
        if (inRepo(inp.file_path)) addContent(inp.content, inp.file_path);
        break;
      case 'Edit':
        if (inRepo(inp.file_path)) addContent(inp.new_string, inp.file_path);
        break;
      case 'MultiEdit':
        if (inRepo(inp.file_path) && Array.isArray(inp.edits)) {
          for (const e of inp.edits) addContent(e && e.new_string, inp.file_path);
        }
        break;
      case 'NotebookEdit':
        if (inRepo(inp.notebook_path)) addContent(inp.new_source, inp.notebook_path);
        break;
    }
  };

  for (const dir of findRepoTranscriptDirs(cwd, baseDir)) {
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

// Tracked, counted files in the repo (working tree). Skips huge files (likely data dumps).
function trackedFiles(repoRoot: string): string[] {
  try {
    return execSync(`git -C "${repoRoot}" ls-files -z`, { stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 256 * 1024 * 1024 })
      .toString().split('\0').filter(p => p && isCountedPath(p));
  } catch { return []; }
}

export function getEditAuthorship(cwd: string = process.cwd(), baseDir: string = homedir()): EditAuthorship {
  const empty: EditAuthorship = { found: false, aiLines: 0, totalLines: 0, humanLines: 0, aiPercent: 0, filesTouched: 0 };
  const repoRoot = repoRootOf(cwd);

  const { lines: aiSet, files } = buildAiLineSet(repoRoot, baseDir, cwd);
  // No agent writes captured for this repo → no edit signal; let upstream fall back.
  if (aiSet.size === 0) return empty;

  let aiLines = 0, totalLines = 0;
  for (const rel of trackedFiles(repoRoot)) {
    const abs = join(repoRoot, rel);
    try {
      if (statSync(abs).size > 2 * 1024 * 1024) continue; // skip >2MB (data, not authored)
    } catch { continue; }
    let text = '';
    try { text = readFileSync(abs, 'utf-8'); } catch { continue; }
    for (const raw of text.split('\n')) {
      const t = raw.trim();
      if (!isSubstantive(t)) continue;
      totalLines++;
      if (aiSet.has(t)) aiLines++;
    }
  }
  if (totalLines === 0) return empty;

  return {
    found: true,
    aiLines,
    totalLines,
    humanLines: totalLines - aiLines,
    aiPercent: +((aiLines / totalLines) * 100).toFixed(1),
    filesTouched: files.size,
  };
}
