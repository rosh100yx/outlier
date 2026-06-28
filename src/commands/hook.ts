import { runHook } from '../hook';

export async function runHookCommand(_args: string[]): Promise<void> {
  const result = await runHook();
  if (result.over) {
    console.log(`Outlier policy warning: AI authorship (${result.aiPercent!.toFixed(1)}%) exceeds threshold (${result.cap}%)`);
    console.log('Take a moment to review your recent architectural decisions. Ensure you still understand the system.');
  } else {
    console.log('Governance Policy OK');
  }
  process.exit(0);
}
