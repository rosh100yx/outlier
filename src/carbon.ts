import { file } from 'bun';
import { homedir } from 'os';
import { join } from 'path';
import gridFactors from '../data/grid-factors.json';

export interface CarbonStats {
  totalTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  energyKwh: number;
  co2KgVietnam: number;
  co2KgFrance: number;
  sessions: number;
}

export interface TokenLogParser {
  parse(): Promise<{ total: number, output: number, cache: number, sessions: number }>;
}

export class ClaudeLogParser implements TokenLogParser {
  private baseDir: string;
  constructor(baseDir = homedir()) {
    this.baseDir = baseDir;
  }
  async parse() {
    const logPath = join(this.baseDir, '.claude', 'tokenomics-log.jsonl');
    const logFile = file(logPath);
    if (!(await logFile.exists())) return { total: 0, output: 0, cache: 0, sessions: 0 };

    const text = await logFile.text();
    const lines = text.trim().split('\n').filter(l => l.length > 0);
    
    let total = 0, output = 0, cache = 0;
    const sessions = new Set<string>();

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        total += data.total_tokens || 0;
        output += data.output_tokens || 0;
        cache += data.cache_read || 0;
        if (data.session_id) sessions.add(data.session_id);
      } catch (e) {}
    }
    return { total, output, cache, sessions: sessions.size };
  }
}

class CursorLogParser implements TokenLogParser {
  async parse() {
    // Stub for future Cursor sqlite/json parsing
    return { total: 0, output: 0, cache: 0, sessions: 0 };
  }
}

export async function getCarbonStats(): Promise<CarbonStats> {
  const parsers: TokenLogParser[] = [new ClaudeLogParser(), new CursorLogParser()];
  
  let totalTokens = 0, outputTokens = 0, cacheReadTokens = 0, sessions = 0;

  for (const parser of parsers) {
    const stats = await parser.parse();
    totalTokens += stats.total;
    outputTokens += stats.output;
    cacheReadTokens += stats.cache;
    sessions += stats.sessions;
  }

  const energyKwh = (outputTokens / 1_000_000) * 0.662;

  return {
    totalTokens,
    outputTokens,
    cacheReadTokens,
    energyKwh,
    co2KgVietnam: (energyKwh * gridFactors.vietnam) / 1000,
    co2KgFrance: (energyKwh * gridFactors.france) / 1000,
    sessions
  };
}
