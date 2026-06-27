// OpenCode parser.
//
// OpenCode (sst/opencode) writes sessions to ~/.opencode/session/ as JSON files.
// Each file: { id, messages: [{role, content: [{text}], tokens?}] }
// If token counts exist, they're measured; otherwise proxy from text length.

import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readdirSync, readFileSync } from 'fs';
import type { ParseResult } from './types';

export class OpenCodeLogParser {
  private baseDir: string;
  constructor(baseDir = homedir()) { this.baseDir = baseDir; }

  async parse(): Promise<ParseResult> {
    const sessionDir = join(this.baseDir, '.opencode', 'session');
    if (!existsSync(sessionDir)) return empty();

    let files: string[] = [];
    try { files = readdirSync(sessionDir).filter(f => f.endsWith('.json')); } catch { return empty(); }
    if (files.length === 0) return empty();

    let total = 0, output = 0, sessions = 0, cost = 0;
    const outputByModel: Record<string, number> = {};

    for (const f of files) {
      let data: any;
      try { data = JSON.parse(readFileSync(join(sessionDir, f), 'utf-8')); } catch { continue; }
      if (!data?.messages) continue;
      sessions++;

      for (const msg of data.messages) {
        const role: string = msg.role || '';
        const contentText = extractText(msg.content);
        const charLen = contentText.length;

        if (msg.tokens) {
          // OpenCode may expose token counts directly.
          const inp = msg.tokens.input || msg.tokens.prompt || 0;
          const out = msg.tokens.output || msg.tokens.completion || 0;
          total += inp + out;
          if (role === 'assistant') output += out;
          const model = normalizeModel(msg.model || data.model || 'opencode');
          if (role === 'assistant') outputByModel[model] = (outputByModel[model] || 0) + out;
          if (msg.tokens.cost_usd) cost += msg.tokens.cost_usd;
        } else {
          // Proxy: estimate from text length.
          const tokens = Math.round(charLen / 4);
          total += tokens;
          if (role === 'assistant') {
            output += tokens;
            const model = normalizeModel(msg.model || data.model || 'opencode');
            outputByModel[model] = (outputByModel[model] || 0) + tokens;
          }
        }
      }
    }

    return { total, output, cache: 0, sessions, cost, outputByModel };
  }
}

function extractText(content: any): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(c => c?.text || c?.content || '').join('');
  return '';
}

function normalizeModel(raw: string): string {
  const m = (raw || '').toLowerCase();
  if (m.includes('claude')) return m;
  if (m.includes('gpt-4o')) return 'gpt-4o';
  if (m.includes('gpt-4')) return 'gpt-4';
  if (m.includes('gemini')) return 'gemini';
  if (m.includes('o3') || m.includes('o1')) return 'gpt-4';
  return 'opencode';
}

function empty(): ParseResult {
  return { total: 0, output: 0, cache: 0, sessions: 0, cost: 0, outputByModel: {} };
}
