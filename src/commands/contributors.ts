import { getCredits, calculatePoints } from '../credits';
import { homedir } from 'os';

export async function runContributorsCommand(_args: string[]): Promise<void> {
  const repoName = process.cwd().split('/').pop();
  const credits = getCredits(homedir(), repoName);
  const points = calculatePoints(credits);
  const sorted = Object.entries(points).sort((a: any, b: any) => b[1] - a[1]);

  console.log(`\nNon-Code Contribution Ledger`);
  console.log(`Points awarded for documentation, research, and review in ${repoName}.\n`);

  if (sorted.length === 0) {
    console.log('No non-code contributions recorded yet.');
  } else {
    for (const [email, pts] of sorted) {
      console.log(`${String(email).padEnd(30)} ${String(pts)} pts`);
    }
  }
}
