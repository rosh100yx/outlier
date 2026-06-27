// Cursor AI-code tracking parser.
//
// Cursor writes to ~/.cursor/ai-tracking/ai-code-tracking.db (SQLite).
// Tables of interest:
//   conversation_summaries — one row per conversation; has model and updatedAt
//   tracked_file_content   — AI-generated file snapshots; content.length ÷ 4 ≈ output tokens
//   ai_code_hashes         — hashes of individual AI-written lines (count = proxy lines)
//
// None of these carry actual API token counts, so provenance = proxy.

import { homedir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import type { ParseResult } from './types';

function dbPath(baseDir: string): string {
  return join(baseDir, '.cursor', 'ai-tracking', 'ai-code-tracking.db');
}

export class CursorLogParser {
  private baseDir: string;
  constructor(baseDir = homedir()) { this.baseDir = baseDir; }

  async parse(): Promise<ParseResult> {
    const p = dbPath(this.baseDir);
    if (!existsSync(p)) return empty();

    try {
      const { Database } = await import('bun:sqlite');
      const db = new Database(p, { readonly: true });

      const sessionsResult = db.query('SELECT COUNT(*) AS n FROM conversation_summaries').get() as any;
      const sessions = sessionsResult?.n ?? 0;

      const outputByModel: Record<string, number> = {};
      let outputTokens = 0;

      // Sum content length from tracked_file_content as proxy for output tokens.
      // Each AI-written character ≈ 0.25 tokens (4 chars/token).
      const contents = db.query('SELECT content, model FROM tracked_file_content').all() as any[];
      for (const row of contents) {
        const chars = (row.content || '').length;
        const tokens = Math.round(chars / 4);
        const model = normalizeModel(row.model || 'cursor');
        outputByModel[model] = (outputByModel[model] || 0) + tokens;
        outputTokens += tokens;
      }

      // Also count AI code hash lines if tracked_file_content is empty.
      if (outputTokens === 0) {
        const hashCount = (db.query('SELECT COUNT(*) AS n FROM ai_code_hashes').get() as any)?.n ?? 0;
        // Each hash is one substantive line ≈ 15 chars ≈ 4 tokens of output.
        const proxyTokens = hashCount * 4;
        const modelRows = db.query('SELECT model, COUNT(*) AS n FROM ai_code_hashes GROUP BY model').all() as any[];
        for (const r of modelRows) {
          const m = normalizeModel(r.model || 'cursor');
          const t = r.n * 4;
          outputByModel[m] = (outputByModel[m] || 0) + t;
        }
        outputTokens = proxyTokens;
      }

      db.close();

      // Rough total: output tokens × 3 (typical input:output ratio for coding agents).
      const total = outputTokens * 3;
      return { total, output: outputTokens, cache: 0, sessions, cost: 0, outputByModel };
    } catch {
      return empty();
    }
  }
}

function empty(): ParseResult {
  return { total: 0, output: 0, cache: 0, sessions: 0, cost: 0, outputByModel: {} };
}

function normalizeModel(raw: string): string {
  const m = (raw || '').toLowerCase();
  if (m.includes('claude')) return m;
  if (m.includes('gpt-4o')) return 'gpt-4o';
  if (m.includes('gpt-4')) return 'gpt-4';
  if (m.includes('gemini')) return 'gemini';
  return 'cursor';
}
