import os from 'os';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export const CMD = (process.argv[1] || '').includes('/_npx/') ? 'npx outlier-audit' : 'outlier';

const CONFIG_PATH = join(os.homedir(), '.outlier_config');

export function readConfig(): any {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  } catch { return {}; }
}

export function writeConfig(patch: Record<string, any>): void {
  const cfg = readConfig();
  try {
    writeFileSync(CONFIG_PATH, JSON.stringify({ ...cfg, ...patch }, null, 2));
  } catch {}
}

export function configuredCap(): number {
  const c = readConfig();
  const v = c && c.governance && c.governance.capPercent;
  return typeof v === 'number' && v > 0 ? v : 70;
}
