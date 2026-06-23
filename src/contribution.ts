// 3-axis human-contribution profile.
//
// "Who wrote the code" measures only EXECUTION — the axis AI is taking over. Human value
// has moved to INTENT (deciding what to build, steering) and OVERSIGHT (reviewing, iterating,
// keeping understanding). A single % is a lie; this reports the profile + a judgment.
//
// Honest blind spots are stated, not hidden:
//   - Copy-paste from a chat (AI code that looks 100% human) — invisible to every signal.
//   - Prompt *quality* — we count words, not judgment.
//   - Comprehension — no tool can measure whether the human understood the AI's code.

import { execSync } from 'child_process';
import type { AuthorshipStats } from './git';
import { getTokenAuthorship, type TokenAuthorship } from './agentic';
import { getEditAuthorship, type EditAuthorship } from './edits';

export interface Contribution {
  execution: {
    aiPercent: number;
    source: 'edits' | 'commit-tags' | 'none';
    // 'measured'  = edit-attribution from this repo's sessions (honest)
    // 'proxy'     = commit-tags only; the editor was NOT observed (weak, can mislead)
    // 'none'      = no signal at all
    confidence: 'measured' | 'proxy' | 'none';
    // surviving line counts when source==='edits', so the % is auditable
    aiLines?: number;
    totalLines?: number;
  };
  intent:    { prompts: number | null; promptTokens: number | null };
  oversight: { iterationRate: number; iterationCommits: number; totalCommits: number };
  label: string;
  judgment: string;
  blindSpots: string[];
}

// Oversight proxy from local git: commits that look like a human reviewing/iterating on
// prior (often AI) output — fixes, refactors, reverts, review follow-ups. Rough, labelled.
function getOversight(cwd: string): { iterationRate: number; iterationCommits: number; total: number } {
  try {
    const subjects = execSync(`git -C "${cwd}" log --no-merges --format=%s`, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim().split('\n').filter(Boolean);
    const total = subjects.length;
    const re = /^(fix|revert|refactor|hotfix|review|address|cleanup|polish|tweak|adjust|correct|amend)\b/i;
    const iter = subjects.filter(s => re.test(s)).length;
    return { iterationRate: total ? +(iter / total).toFixed(2) : 0, iterationCommits: iter, total };
  } catch {
    return { iterationRate: 0, iterationCommits: 0, total: 0 };
  }
}

export function buildContribution(gitStats: AuthorshipStats | null, cwd: string = process.cwd()): Contribution {
  const tok: TokenAuthorship = getTokenAuthorship(cwd);
  const edits: EditAuthorship = getEditAuthorship(cwd);

  // Execution: prefer EDIT attribution — lines an agent actually wrote to repo files,
  // measured against git's shipped additions. That is denominated in the artifact, not
  // in chat tokens. Fall back to commit tags (weak) only when no agent writes are on record.
  let execution: Contribution['execution'];
  if (edits.found) {
    execution = {
      aiPercent: edits.aiPercent,
      source: 'edits',
      confidence: 'measured',
      aiLines: edits.aiLines,
      totalLines: edits.totalLines,
    };
  } else if (gitStats) {
    // No Claude Code sessions for this repo → the editor was NOT observed. This number is
    // only the commit-tag proxy: it can read absurdly low (agents rarely tag) and we cannot
    // see edits made in Cursor/Copilot/Aider/etc. Mark it loudly as a proxy, not a measurement.
    execution = { aiPercent: +(gitStats.ratio * 100).toFixed(1), source: 'commit-tags', confidence: 'proxy' };
  } else {
    execution = { aiPercent: 0, source: 'none', confidence: 'none' };
  }

  const intent = tok.found
    ? { prompts: tok.prompts, promptTokens: tok.humanPromptTokens }
    : { prompts: null, promptTokens: null };

  const ov = getOversight(cwd);
  const oversight = { iterationRate: ov.iterationRate, iterationCommits: ov.iterationCommits, totalCommits: ov.total };

  // Judgment — combine the axes. execution.aiPercent is a LOWER bound: a low number can
  // mean "you hand-wrote it" OR "most shipped lines are imported/pasted prose, not agent
  // code." The two are told apart by intent: someone firing hundreds of prompts is steering
  // agents, not hand-coding — so a low execution % there is denominator composition, not
  // craftsmanship. Only call it Artisan when low AI coincides with little agent direction.
  const ai = execution.aiPercent;
  const STEER_MIN = 20; // prompts below this = incidental, not meaningful direction
  const reviews = oversight.iterationRate >= 0.15;
  const steers = (intent.prompts ?? 0) >= STEER_MIN;
  let label: string, judgment: string;
  // #1 Honesty gap: without edit-attribution we are blind to who actually wrote the code.
  // Do NOT assert a behavioral label (Artisan/Director/…) off the weak commit-tag proxy —
  // abstain and say so. A confident character read on a blind signal is the dishonest part.
  if (execution.confidence !== 'measured') {
    label = 'Unmeasured';
    judgment = execution.confidence === 'none'
      ? 'No git history or sessions to read here. Run inside the repo where you code.'
      : `No Claude Code sessions for this repo — your editor wasn't observed. The ${ai}% below is only a commit-tag proxy (agents rarely tag; Cursor/Copilot/Aider edits are invisible). Treat it as a floor, not a measurement.`;
    return {
      execution, intent, oversight, label, judgment,
      blindSpots: [
        'Execution is a commit-tag proxy here — the real editor signal (agent Edit/Write calls) was not found for this repo.',
        'Copy-paste from a chat is invisible — pasted AI code looks 100% human.',
        'Whether you understood the AI code cannot be measured here.',
      ],
    };
  }
  if (ai < 30 && !steers) {
    label = 'Artisan';
    judgment = 'Little agent code, little agent direction — you hand-write this. Low deskilling risk.';
  } else if (ai < 30 && steers) {
    // Heavy direction but few shipped lines trace to an agent: mixed/prose repo, or pasted code.
    label = reviews ? 'Centaur' : 'Director';
    judgment = `You direct agents heavily (${intent.prompts} prompts), yet only ${ai}% of shipped lines trace to one — the rest is hand-written, imported, or pasted. The execution % is a floor, not the whole story.`;
  } else if (reviews && steers) {
    label = 'Centaur';
    judgment = 'AI writes most of it, but you steer and you iterate/review. Healthy — you keep the judgment.';
  } else if (steers && !reviews) {
    label = 'Director';
    judgment = 'You steer with prompts, but little sign of review/iteration. Read more of what the agent ships.';
  } else if (reviews && !steers) {
    label = 'Reviewer';
    judgment = 'You mostly review rather than author or steer. Fine, as long as you can still build from scratch.';
  } else {
    label = 'Spectator';
    judgment = 'AI writes it, and there is little sign you steer or review. This is the deskilling pattern — read and rebuild a core path yourself.';
  }

  return {
    execution, intent, oversight, label, judgment,
    blindSpots: [
      'Copy-paste from a chat is invisible — pasted AI code looks 100% human.',
      'Prompt quality is not measured, only volume.',
      'Whether you understood the AI code cannot be measured here.',
    ],
  };
}
