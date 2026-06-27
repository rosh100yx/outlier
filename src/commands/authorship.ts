import { getAuthorshipStats } from '../git';
import { getTokenAuthorship } from '../agentic';
import { configuredCap } from '../shared';

export async function runAuthorshipCommand(_args: string[]): Promise<void> {
  const gitStats = await getAuthorshipStats().catch(() => null);
  if (!gitStats) {
    console.log('No git history found here.');
    return;
  }

  const pct = (gitStats.ratio * 100).toFixed(1);
  const nmPct = (gitStats.ratioNoMerges * 100).toFixed(1);
  const cap = configuredCap() / 100;
  const color = gitStats.ratio > cap ? pcRed : gitStats.ratio > 0.4 ? pcYellow : pcGreen;
  const warning = gitStats.ratio > cap ? ' ⚠ high dependency' : gitStats.ratio > 0.4 ? ' ⚠ moderate' : '';

  const ta = getTokenAuthorship();
  const tokenBlock = ta.found
    ? `\nBy tokens (the real signal):
AI output:          ${(ta.aiOutputTokens/1e6).toFixed(1)}M tokens
Your prompts:       ~${(ta.humanPromptTokens/1e3).toFixed(0)}K tokens
AI authorship:      ${ta.aiPercent.toFixed(0)}%  (${ta.sessions} sessions)
Commit tags measure tagging, not authorship. In agentic work the agent writes the code and commits it under your name — tokens show it.`
    : `\nNo agent session logs for this repo path, so token-based authorship is unavailable — the commit-tag % above is a weak proxy.`;

  console.log(`
By commit tags (what git sees):
Total Commits:      ${gitStats.total}
AI Co-Authored:     ${gitStats.ai}
Tag Ratio:          ${color(pct + '%')}${warning}
Conservative Floor: ${color(nmPct + '%')}  (non-merge)${tokenBlock}`);
}

function pcRed(s: string) { return '\x1b[31m' + s + '\x1b[0m'; }
function pcYellow(s: string) { return '\x1b[33m' + s + '\x1b[0m'; }
function pcGreen(s: string) { return '\x1b[32m' + s + '\x1b[0m'; }
