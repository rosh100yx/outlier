// Token-based authorship — the honest signal for agentic workflows.
//
// The commit-trailer metric is blind to how most AI coding actually happens: the human
// types a short prompt, the agent generates the code AND runs `git commit` under the
// human's identity. So git shows ~100% human even when the human wrote ~0% of the code.
//
// The truer signal lives in the agent's own session transcripts: the AI's OUTPUT tokens
// are the code/text it generated; the human's contribution is the text they actually
// typed (their prompts). In a fully-agentic session that ratio is ~99% AI. This does not
// claim precision — output tokens include explanations, prompt length is an approximation
// — but it captures the reality the commit count cannot.

import { homedir } from 'os';
import { join, basename, dirname } from 'path';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { claudeProjectSlug } from './util';

// Claude Code stores transcripts under ~/.claude/projects/<cwd-with-slashes-as-dashes>/.
// The same repo can have sessions under several such dirs (a worktree, a moved checkout,
// a different parent path). Find ALL dirs that belong to this repo — by git root + name —
// so token authorship isn't blind to logs created from another path.
export function findRepoTranscriptDirs(cwd: string, baseDir: string): string[] {
  let repoRoot = cwd;
  try { repoRoot = execSync(`git -C "${cwd}" rev-parse --show-toplevel`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || cwd; } catch {}
  const repoName = basename(repoRoot);
  const targetSlug = claudeProjectSlug(repoRoot);             // e.g. -Users-me-work-outlier
  const projectsRoot = join(baseDir, '.claude', 'projects');
  let names: string[] = [];
  try { names = readdirSync(projectsRoot); } catch { return []; }

  const matches = names.filter(n =>
    n === targetSlug ||                       // exact current path
    n.startsWith(targetSlug + '-') ||         // a sub-directory of the repo
    n.endsWith('-' + repoName) ||             // same repo under a different parent path
    n.includes('-' + repoName + '-')          // a worktree (e.g. …-worktrees-outlier-foo)
  );
  // Always include the exact slug dir if it exists, even if filtered above.
  if (existsSync(join(projectsRoot, targetSlug)) && !matches.includes(targetSlug)) matches.push(targetSlug);
  return matches.map(n => join(projectsRoot, n));
}

export interface TokenAuthorship {
  found: boolean;
  aiOutputTokens: number;     // tokens the agent generated (code + text)
  humanPromptTokens: number;  // ~tokens the human typed as prompts
  aiPercent: number;          // 0..100, AI share of authored tokens
  sessions: number;
  prompts: number;            // how many times the human actually typed a prompt
}

// Rough chars→tokens. We only need an order-of-magnitude human-vs-AI ratio.
const CHARS_PER_TOKEN = 4;

// Extract just the HUMAN-typed text from a user message — not tool results, not system
// reminders injected by the harness (those are not authorship).
function humanTextLen(content: any): number {
  if (typeof content === 'string') return content.length;
  if (Array.isArray(content)) {
    let n = 0;
    for (const b of content) {
      if (b && b.type === 'text' && typeof b.text === 'string') {
        // Skip harness-injected reminders/caveats wrapped in tags.
        if (b.text.includes('<system-reminder>') || b.text.includes('<command-')) continue;
        n += b.text.length;
      }
      // tool_result / image / other blocks are not human authorship → ignored
    }
    return n;
  }
  return 0;
}

export function findAntigravityTranscriptsForRepo(cwd: string, baseDir: string): string[] {
  let repoRoot = cwd;
  try { repoRoot = execSync(`git -C "${cwd}" rev-parse --show-toplevel`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || cwd; } catch {}
  
  const brainDir = join(baseDir, '.gemini', 'antigravity-cli', 'brain');
  const matches: string[] = [];
  let convDirs: string[] = [];
  try { convDirs = readdirSync(brainDir); } catch { return []; }

  for (const dir of convDirs) {
    const jsonl = join(brainDir, dir, '.system_generated', 'logs', 'transcript.jsonl');
    if (!existsSync(jsonl)) continue;
    try {
      // Check if the file is associated with this repo
      const text = readFileSync(jsonl, 'utf-8');
      if (text.includes(repoRoot)) {
        matches.push(jsonl);
      }
    } catch { continue; }
  }
  return matches;
}

export function getTokenAuthorship(cwd: string = process.cwd(), baseDir: string = homedir()): TokenAuthorship {
  const empty: TokenAuthorship = { found: false, aiOutputTokens: 0, humanPromptTokens: 0, aiPercent: 0, sessions: 0, prompts: 0 };
  const dirs = findRepoTranscriptDirs(cwd, baseDir);
  const agyFiles = findAntigravityTranscriptsForRepo(cwd, baseDir);
  if (dirs.length === 0 && agyFiles.length === 0) return empty;

  let aiOut = 0, humanChars = 0, prompts = 0;
  const sessions = new Set<string>();
  let anyFile = false;

  for (const dir of dirs) {
    let files: string[] = [];
    try { files = readdirSync(dir).filter(f => f.endsWith('.jsonl')); } catch { continue; }
    for (const f of files) {
      anyFile = true;
      let text = '';
      try { text = readFileSync(join(dir, f), 'utf-8'); } catch { continue; }
      for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        try {
          const d = JSON.parse(line);
          const msg = d.message || {};
          if (d.sessionId) sessions.add(d.sessionId);
          const role = msg.role;
          if (role === 'assistant') {
            aiOut += (msg.usage && msg.usage.output_tokens) || 0;
          } else if (role === 'user') {
            const len = humanTextLen(msg.content);
            humanChars += len;
            if (len > 0) prompts++; // a real human-typed prompt (not a tool result)
          }
        } catch {}
      }
    }
  }

  // Parse Antigravity files
  for (const f of agyFiles) {
    anyFile = true;
    let text = '';
    try { text = readFileSync(f, 'utf-8'); } catch { continue; }
    
    // Each Antigravity transcript is a unique session
    const sessionId = basename(dirname(dirname(dirname(f))));
    sessions.add(sessionId);

    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        const d = JSON.parse(line);
        if (d.type === 'USER_INPUT' && d.content) {
          const content = d.content;
          // Extract the actual user text from <USER_REQUEST> tags if present
          let userText = content;
          const match = content.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
          if (match) userText = match[1];
          humanChars += userText.length;
          if (userText.trim().length > 0) prompts++;
        } else if (d.type === 'PLANNER_RESPONSE') {
          // Fallback proxy: length / 4 for Antigravity output tokens (since it's not logged in transcript)
          let aiText = d.thinking || '';
          if (d.tool_calls) {
            aiText += JSON.stringify(d.tool_calls);
          }
          if (d.content) {
             aiText += d.content;
          }
          aiOut += Math.round(aiText.length / CHARS_PER_TOKEN);
        }
      } catch {}
    }
  }

  if (!anyFile) return empty;

  const humanTokens = Math.round(humanChars / CHARS_PER_TOKEN);
  const total = aiOut + humanTokens;
  return {
    found: true,
    aiOutputTokens: aiOut,
    humanPromptTokens: humanTokens,
    aiPercent: total > 0 ? +((aiOut / total) * 100).toFixed(1) : 0,
    sessions: sessions.size,
    prompts,
  };
}
