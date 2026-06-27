// Gemini / Antigravity CLI parser.
//
// The Gemini CLI (antigravity) writes two readable artifacts:
//   ~/.gemini/antigravity-cli/history.jsonl  — one JSON line per user turn
//     { display, timestamp, workspace, conversationId? }
//   ~/.gemini/antigravity-cli/settings.json  — contains the chosen model name
//
// Actual token counts are server-side only. We derive a proxy:
//   prompt tokens  ≈ display.length / 4   (chars → tokens)
//   output tokens  ≈ prompt tokens × 2    (responses are ~2× input for coding agents)
// Provenance: proxy (not measured, not estimated from a token log — derived from text length).

import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import type { ParseResult } from './types';

function geminiDir(baseDir: string): string {
  return join(baseDir, '.gemini', 'antigravity-cli');
}

function readSettings(dir: string): { model: string } {
  try {
    const s = JSON.parse(readFileSync(join(dir, 'settings.json'), 'utf-8'));
    return { model: (s.model || 'gemini').toLowerCase() };
  } catch { return { model: 'gemini' }; }
}

// Map Gemini model display names to emission model keys.
function geminiModelKey(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes('flash') || m.includes('mini')) return 'flash';
  if (m.includes('pro') || m.includes('ultra') || m.includes('exp')) return 'gemini';
  return 'gemini';
}

export class GeminiLogParser {
  private baseDir: string;
  private cwd: string;
  constructor(baseDir = homedir(), cwd = process.cwd()) {
    this.baseDir = baseDir;
    this.cwd = cwd;
  }

  async parse(): Promise<ParseResult> {
    const dir = geminiDir(this.baseDir);
    const historyPath = join(dir, 'history.jsonl');
    if (!existsSync(historyPath)) return empty();

    let text = '';
    try { text = readFileSync(historyPath, 'utf-8'); } catch { return empty(); }

    const { model } = readSettings(dir);
    const modelKey = geminiModelKey(model);

    const sessions = new Set<string>();
    let promptChars = 0;
    let turnCount = 0;

    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);
        const display: string = entry.display || '';
        promptChars += display.length;
        turnCount++;
        if (entry.conversationId) {
          sessions.add(entry.conversationId);
        } else {
          // No conversationId: group by timestamp proximity (same session if <1h apart)
          sessions.add(String(Math.floor((entry.timestamp || 0) / 3_600_000)));
        }
      } catch {}
    }

    if (turnCount === 0) return empty();

    const promptTokens = Math.round(promptChars / 4);
    // Coding agent responses tend to be ~2× the prompt for coding tasks.
    const outputTokens = promptTokens * 2;
    const total = promptTokens + outputTokens;

    const outputByModel: Record<string, number> = { [modelKey]: outputTokens };

    return { total, output: outputTokens, cache: 0, sessions: sessions.size, cost: 0, outputByModel };
  }
}

function empty(): ParseResult {
  return { total: 0, output: 0, cache: 0, sessions: 0, cost: 0, outputByModel: {} };
}
