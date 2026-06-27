// Gemini / Antigravity CLI parser.
//
// The Gemini CLI (antigravity) writes its readable artifacts here:
//   ~/.gemini/antigravity-cli/brain/<conversation-id>/.system_generated/logs/transcript.jsonl
//
// We derive a proxy from the 'content' length of the JSONL logs:
//   prompt tokens  ≈ USER_INPUT length / 4
//   output tokens  ≈ PLANNER_RESPONSE length / 4
// Provenance: proxy.

import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import type { ParseResult } from './types';

function geminiDir(baseDir: string): string {
  return join(baseDir, '.gemini', 'antigravity-cli');
}

export class GeminiLogParser {
  private baseDir: string;
  private cwd: string;
  constructor(baseDir = homedir(), cwd = process.cwd()) {
    this.baseDir = baseDir;
    this.cwd = cwd;
  }

  async parse(): Promise<ParseResult> {
    const sessions = new Set<string>();
    let promptChars = 0;
    let outputChars = 0;
    let turnCount = 0;

    const tools = ['antigravity-cli', 'antigravity-ide'];
    for (const tool of tools) {
      const brainDir = join(this.baseDir, '.gemini', tool, 'brain');
      if (!existsSync(brainDir)) continue;

      let convDirs: string[] = [];
      try { convDirs = readdirSync(brainDir); } catch { continue; }

      for (const convId of convDirs) {
        const convPath = join(brainDir, convId);
        try { if (!statSync(convPath).isDirectory()) continue; } catch { continue; }

        const transcriptPath = join(convPath, '.system_generated', 'logs', 'transcript.jsonl');
        if (!existsSync(transcriptPath)) continue;

        let text = '';
        try { text = readFileSync(transcriptPath, 'utf-8'); } catch { continue; }

        let sessionTurnCount = 0;
        for (const line of text.split('\n')) {
          if (!line.trim()) continue;
          try {
            const entry = JSON.parse(line);
            const type = entry.type;
            const content = entry.content || '';
            
            if (type === 'USER_INPUT') {
              promptChars += content.length;
              sessionTurnCount++;
            } else if (type === 'PLANNER_RESPONSE') {
              outputChars += content.length;
            }
          } catch {}
        }
        
        if (sessionTurnCount > 0) {
          turnCount += sessionTurnCount;
          sessions.add(convId);
        }
      }
    }

    if (turnCount === 0) return empty();

    const promptTokens = Math.round(promptChars / 4);
    const outputTokens = Math.round(outputChars / 4);
    const total = promptTokens + outputTokens;

    // For simplicity, just attribute it to 'gemini' 
    const outputByModel: Record<string, number> = { 'gemini': outputTokens };

    return { total, output: outputTokens, cache: 0, sessions: sessions.size, cost: 0, outputByModel };
  }
}

function empty(): ParseResult {
  return { total: 0, output: 0, cache: 0, sessions: 0, cost: 0, outputByModel: {} };
}
