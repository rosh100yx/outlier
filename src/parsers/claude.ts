import { homedir } from 'os';
import { join } from 'path';
import { readFile, access, readdir } from 'fs/promises';
import { claudeProjectSlug } from '../util';
import type { ParseResult } from './types';

export class ClaudeLogParser {
  private baseDir: string;
  private cwd: string;
  constructor(baseDir = homedir(), cwd = process.cwd()) {
    this.baseDir = baseDir;
    this.cwd = cwd;
  }

  async parse(): Promise<ParseResult> {
    const slug = claudeProjectSlug(this.cwd);
    const projectDir = join(this.baseDir, '.claude', 'projects', slug);
    try {
      const files = (await readdir(projectDir)).filter(f => f.endsWith('.jsonl'));
      if (files.length > 0) {
        let total = 0, output = 0, cache = 0;
        const sessions = new Set<string>();
        const outputByModel: Record<string, number> = {};
        for (const file of files) {
          let text = '';
          try { text = await readFile(join(projectDir, file), 'utf-8'); } catch { continue; }
          for (const line of text.split('\n')) {
            if (!line.trim()) continue;
            try {
              const d = JSON.parse(line);
              const msg = d.message || {};
              const u = msg.usage || d.usage;
              if (u) {
                const inp = u.input_tokens || 0;
                const out = u.output_tokens || 0;
                const cr = u.cache_read_input_tokens || 0;
                const cw = u.cache_creation_input_tokens || 0;
                total += inp + out + cr + cw;
                output += out;
                cache += cr;
                const model = msg.model || 'default';
                outputByModel[model] = (outputByModel[model] || 0) + out;
              }
              if (d.sessionId) sessions.add(d.sessionId);
            } catch {}
          }
        }
        return { total, output, cache, sessions: sessions.size, cost: 0, outputByModel };
      }
    } catch {}

    // Fallback: tokenomics-log.jsonl written by a custom Stop hook (has real cost_usd).
    const logPath = join(this.baseDir, '.claude', 'tokenomics-log.jsonl');
    try { await access(logPath); } catch {
      return { total: 0, output: 0, cache: 0, sessions: 0, cost: 0, outputByModel: {} };
    }
    const text = await readFile(logPath, 'utf-8');
    let total = 0, output = 0, cache = 0, cost = 0;
    const sessions = new Set<string>();
    const outputByModel: Record<string, number> = {};
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        total += data.total_tokens || 0;
        output += data.output_tokens || 0;
        cache += data.cache_read || 0;
        cost += data.cost_usd || 0;
        if (data.session_id) sessions.add(data.session_id);
        const model = data.model || 'default';
        outputByModel[model] = (outputByModel[model] || 0) + (data.output_tokens || 0);
      } catch {}
    }
    return { total, output, cache, sessions: sessions.size, cost, outputByModel };
  }
}
