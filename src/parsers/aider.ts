// Aider parser.
//
// Aider writes .aider.chat.history.md in the project root.
// Format: markdown with fenced sections:
//   # aider chat started at <timestamp>  ← session boundary
//   #### <user message>
//   > ... (aider output / tool calls)
//
// No token counts are stored locally. We estimate:
//   prompt tokens  ≈ total user-section chars / 4
//   output tokens  ≈ total aider-response chars / 4
// Provenance: proxy.

import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import type { ParseResult } from './types';

export class AiderLogParser {
  private cwd: string;
  constructor(cwd = process.cwd()) { this.cwd = cwd; }

  async parse(): Promise<ParseResult> {
    // Aider writes to the project directory where it was invoked.
    const histPath = join(this.cwd, '.aider.chat.history.md');
    if (!existsSync(histPath)) return empty();

    let text = '';
    try { text = readFileSync(histPath, 'utf-8'); } catch { return empty(); }
    if (!text.trim()) return empty();

    let sessions = 0;
    let userChars = 0;
    let aiderChars = 0;
    let inUserTurn = false;
    let inAiderResponse = false;

    for (const line of text.split('\n')) {
      if (line.startsWith('# aider chat started at')) {
        sessions++;
        inUserTurn = false;
        inAiderResponse = false;
        continue;
      }
      // User message: markdown h4 (####)
      if (line.startsWith('#### ')) {
        inUserTurn = true;
        inAiderResponse = false;
        userChars += line.slice(5).length;
        continue;
      }
      // Aider output: blockquote lines (>) or lines after a user turn until next h4/session
      if (line.startsWith('>') || line.startsWith('>>>>>>')) {
        inAiderResponse = true;
        inUserTurn = false;
        aiderChars += line.length;
        continue;
      }
      if (inUserTurn) { userChars += line.length; }
      else if (inAiderResponse) { aiderChars += line.length; }
    }

    if (sessions === 0) return empty();

    const promptTokens = Math.round(userChars / 4);
    const outputTokens = Math.round(aiderChars / 4);
    const total = promptTokens + outputTokens;
    const outputByModel: Record<string, number> = { aider: outputTokens };

    return { total, output: outputTokens, cache: 0, sessions, cost: 0, outputByModel };
  }
}

function empty(): ParseResult {
  return { total: 0, output: 0, cache: 0, sessions: 0, cost: 0, outputByModel: {} };
}
