// Pre-commit hook runner — called by the shell hook installed by `outlier policy`.
// Uses the same measured signal as the audit receipt (edits.ts), falling back
// to the weaker commit-tag proxy when no agent logs exist.

import { getEditAuthorship } from './edits';
import { getAuthorshipStats } from './git';
import { homedir } from 'os';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface HookResult {
  aiPercent: number | null;
  cap: number;
  over: boolean;
  source: 'measured' | 'proxy' | 'none';
}

export async function runHook(cwd: string = process.cwd()): Promise<HookResult> {
  const capPath = join(cwd, '.git', 'outlier-cap');
  let cap = 70;
  try {
    if (existsSync(capPath)) {
      const raw = readFileSync(capPath, 'utf-8').trim();
      cap = parseInt(raw, 10);
      if (isNaN(cap)) cap = 70;
    }
  } catch {}

  let aiPercent: number | null = null;
  let source: HookResult['source'] = 'none';

  // Try measured signal first (blame + transcript intersection)
  try {
    const edits = getEditAuthorship(cwd, homedir());
    if (edits.found) {
      aiPercent = edits.aiPercent;
      source = 'measured';
    }
  } catch {}

  // Fallback to commit-tag proxy
  if (aiPercent === null) {
    try {
      const stats = await getAuthorshipStats(cwd);
      aiPercent = stats.ratio * 100;
      source = 'proxy';
    } catch {}
  }

  const over = aiPercent !== null && aiPercent > cap;
  return { aiPercent, cap, over, source };
}
