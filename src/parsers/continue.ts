// Continue.dev parser.
//
// Continue writes session history to ~/.continue/sessions/ as JSON files.
// Each file: { sessionId, title, history: [{message: {role, content, tokens?}}] }

import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readdirSync, readFileSync } from 'fs';
import type { ParseResult } from './types';

export class ContinueLogParser {
  private baseDir: string;
  constructor(baseDir = homedir()) { this.baseDir = baseDir; }

  async parse(): Promise<ParseResult> {
    const sessionDir = join(this.baseDir, '.continue', 'sessions');
    if (!existsSync(sessionDir)) return empty();

    let files: string[] = [];
    try { files = readdirSync(sessionDir).filter(f => f.endsWith('.json')); } catch { return empty(); }
    if (files.length === 0) return empty();

    let total = 0, output = 0, sessions = 0, cost = 0;
    const outputByModel: Record<string, number> = {};

    for (const f of files) {
      let data: any;
      try { data = JSON.parse(readFileSync(join(sessionDir, f), 'utf-8')); } catch { continue; }
      const history = data?.history || data?.messages || [];
      if (history.length === 0) continue;
      sessions++;

      for (const entry of history) {
        const msg = entry?.message || entry;
        const role: string = msg?.role || '';
        const content = typeof msg?.content === 'string' ? msg.content : JSON.stringify(msg?.content || '');

        if (msg?.tokens) {
          const inp = msg.tokens.input || msg.tokens.promptTokens || 0;
          const out = msg.tokens.output || msg.tokens.completionTokens || 0;
          total += inp + out;
          if (role === 'assistant') {
            output += out;
            const model = msg.model || data.model || 'continue';
            outputByModel[model] = (outputByModel[model] || 0) + out;
          }
        } else {
          const tokens = Math.round(content.length / 4);
          total += tokens;
          if (role === 'assistant') {
            output += tokens;
            const model = msg.model || data.model || 'continue';
            outputByModel[model] = (outputByModel[model] || 0) + tokens;
          }
        }
      }
    }

    return { total, output, cache: 0, sessions, cost, outputByModel };
  }
}

function empty(): ParseResult {
  return { total: 0, output: 0, cache: 0, sessions: 0, cost: 0, outputByModel: {} };
}
