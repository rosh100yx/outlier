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

export interface Contribution {
  execution: { aiPercent: number; source: 'tokens' | 'commit-tags' | 'none' };
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

  // Execution: prefer the token signal (honest for agentic work); fall back to commit tags.
  let execution: Contribution['execution'];
  if (tok.found) execution = { aiPercent: tok.aiPercent, source: 'tokens' };
  else if (gitStats) execution = { aiPercent: +(gitStats.ratio * 100).toFixed(1), source: 'commit-tags' };
  else execution = { aiPercent: 0, source: 'none' };

  const intent = tok.found
    ? { prompts: tok.prompts, promptTokens: tok.humanPromptTokens }
    : { prompts: null, promptTokens: null };

  const ov = getOversight(cwd);
  const oversight = { iterationRate: ov.iterationRate, iterationCommits: ov.iterationCommits, totalCommits: ov.total };

  // Judgment — combine the axes. The point: high AI execution is fine IF intent + oversight
  // are present (you're a Centaur/Director); it's the deskilling risk only when they're absent.
  const ai = execution.aiPercent;
  const reviews = oversight.iterationRate >= 0.15;
  const steers = (intent.prompts ?? 0) > 0;
  let label: string, judgment: string;
  if (ai < 30) {
    label = 'Artisan';
    judgment = 'You write most of the code yourself. Low deskilling risk.';
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
