import { confirm, isCancel, cancel, note } from '@clack/prompts';
import pc from 'picocolors';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import os from 'os';
import { CMD } from '../shared';

export async function runInitCommand(_args: string[]): Promise<void> {
  const shell = process.env.SHELL || '';
  const rcName = shell.includes('zsh') ? '.zshrc' : '.bashrc';
  const rcPath = join(os.homedir(), rcName);

  if (_args[0] === 'uninit') {
    const start = '# --- OUTLIER PRE-FLIGHT RITUAL START ---';
    const end = '# --- OUTLIER PRE-FLIGHT RITUAL END ---';
    if (existsSync(rcPath)) {
      const content = readFileSync(rcPath, 'utf8');
      const cleaned = content.replace(new RegExp(`\\n?${start}[\\s\\S]*?${end}\\n?`), '');
      if (cleaned !== content) writeFileSync(rcPath, cleaned);
    }
    note('Outlier shell greeting removed.', 'Uninit');
    return;
  }

  const start = '# --- OUTLIER PRE-FLIGHT RITUAL START ---';
  const end = '# --- OUTLIER PRE-FLIGHT RITUAL END ---';
  const block = `
${start}
if command -v ${CMD} >/dev/null 2>&1; then
  ${CMD} daily-greeting
fi
${end}
`;

  let rc = '';
  if (existsSync(rcPath)) rc = readFileSync(rcPath, 'utf8');
  if (!rc.includes(start)) {
    writeFileSync(rcPath, rc + block);
  }

  note(`Added daily outlier greeting to ${rcName}. Restart your shell or run: source ~/${rcName}`, 'Init');
}
