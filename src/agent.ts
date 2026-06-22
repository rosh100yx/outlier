import { spawnSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import os from 'os';

export function detectAgent(): string | null {
  const agents = ['claude', 'cursor', 'aider', 'hermes', 'cody', 'continue', 'opencode', 'gemini'];
  
  try {
    const home = os.homedir();
    const historyFiles = [join(home, '.zsh_history'), join(home, '.bash_history')];
    
    for (const file of historyFiles) {
      if (existsSync(file)) {
        // Read file using robust encoding fallback if needed, but utf8 usually works for matching
        const content = readFileSync(file, 'utf8');
        const lines = content.split('\n').filter(Boolean).slice(-500).reverse();
        for (const line of lines) {
          for (const agent of agents) {
            // Very rudimentary check to see if the command starts with the agent
            if (line.includes(agent)) {
               const result = spawnSync('which', [agent]);
               if (result.status === 0) {
                 return agent;
               }
            }
          }
        }
      }
    }
  } catch (e) {}

  for (const agent of agents) {
    try {
        const result = spawnSync('which', [agent]);
        if (result.status === 0) {
          return agent;
        }
    } catch(e) {}
  }

  return null;
}
