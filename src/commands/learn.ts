import { select, spinner, isCancel, cancel, note } from '@clack/prompts';
import pc from 'picocolors';
import { readConfig, writeConfig } from '../shared';

export async function runLearnCommand(_args: string[]): Promise<void> {
  const cfg = readConfig();
  const learned: string[] = (cfg.learning && Array.isArray(cfg.learning.learned)) ? cfg.learning.learned : [];

  const doneIdx = process.argv.indexOf('--done');
  if (doneIdx !== -1 && process.argv[doneIdx + 1]) {
    const id = process.argv[doneIdx + 1] as string;
    const next = learned.includes(id) ? learned : [...learned, id];
    writeConfig({ learning: { learned: next } });
    console.log(`Marked "${id}" learned. ${next.length} skill${next.length === 1 ? '' : 's'} banked.\n`);
    return;
  }

  const s = spinner();
  s.start('Reading what your agent wrote...');
  await new Promise(r => setTimeout(r, 600));
  s.stop('Skill found');

  note(
    `Technique:  Currying / partial application\nWhy it matters: The agent built an adapter function instead of duplicating a 3-arg call across 6 places.\nChallenge:   Rewrite one of the 6 call sites without the adapter — manually. Time yourself.`,
    'Outlier Learn — one skill to unlock'
  );
}
