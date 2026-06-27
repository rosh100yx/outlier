import { appendFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface CreditEntry {
  date: string;
  repo: string;
  branch: string;
  contributor: string;
  contributionType: 'documentation' | 'research' | 'design' | 'review' | 'other';
  details: string;
  points: number;
}

export function getCreditsDir(baseDir: string = homedir()): string {
  const dir = join(baseDir, '.outlier');
  try { mkdirSync(dir, { recursive: true }); } catch {}
  return dir;
}

export function getCreditsPath(baseDir: string = homedir()): string {
  return join(getCreditsDir(baseDir), 'credits.jsonl');
}

export function recordCredit(entry: Omit<CreditEntry, 'date'>, baseDir: string = homedir()): void {
  const fullEntry: CreditEntry = {
    ...entry,
    date: new Date().toISOString()
  };
  try {
    appendFileSync(getCreditsPath(baseDir), JSON.stringify(fullEntry) + '\n');
  } catch {}
}

export function getCredits(baseDir: string = homedir(), repoFilter?: string): CreditEntry[] {
  const p = getCreditsPath(baseDir);
  if (!existsSync(p)) return [];
  try {
    const text = readFileSync(p, 'utf-8');
    return text.split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line) as CreditEntry)
      .filter(entry => repoFilter ? entry.repo === repoFilter : true);
  } catch {
    return [];
  }
}

export function calculatePoints(credits: CreditEntry[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const c of credits) {
    if (!c) continue;
    const contributor = c.contributor || 'unknown';
    const pts = c.points || 0;
    totals[contributor] = (totals[contributor] || 0) + pts;
  }
  return totals;
}
