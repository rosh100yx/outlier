import { homedir } from 'os';
import { join } from 'path';
import { readFile, access } from 'fs/promises';
import gridFactors from '../data/grid-factors.json';

export interface CarbonStats {
  totalTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  energyKwh: number;
  co2KgVietnam: number;
  co2KgFrance: number;
  localCo2Kg: number;
  localRegion: string;
  sessions: number;
  estUsd: number;       // estimated spend in USD
  costIsReal: boolean;  // true if summed from the log's own cost field, false if estimated from tokens
}

export interface TokenLogParser {
  parse(): Promise<{ total: number, output: number, cache: number, sessions: number, cost: number }>;
}

export class ClaudeLogParser implements TokenLogParser {
  private baseDir: string;
  constructor(baseDir = homedir()) {
    this.baseDir = baseDir;
  }
  async parse() {
    const logPath = join(this.baseDir, '.claude', 'tokenomics-log.jsonl');
    
    try {
      await access(logPath);
    } catch {
      return { total: 0, output: 0, cache: 0, sessions: 0, cost: 0 };
    }

    const text = await readFile(logPath, 'utf-8');
    const lines = text.trim().split('\n').filter(l => l.length > 0);

    let total = 0, output = 0, cache = 0, cost = 0;
    const sessions = new Set<string>();

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        total += data.total_tokens || 0;
        output += data.output_tokens || 0;
        cache += data.cache_read || 0;
        cost += data.cost_usd || 0; // present when the log was written with a cost field
        if (data.session_id) sessions.add(data.session_id);
      } catch (e) {}
    }
    return { total, output, cache, sessions: sessions.size, cost };
  }
}

class CursorLogParser implements TokenLogParser {
  async parse() {
    return { total: 0, output: 0, cache: 0, sessions: 0, cost: 0 };
  }
}

// Rough blended token pricing (USD per 1M tokens) for when the log has no cost field.
// Conservative mid-points across current models; labeled "rough" in the UI.
function estimateUsd(output: number, cacheRead: number, total: number): number {
  const otherInput = Math.max(0, total - output - cacheRead);
  return (output / 1e6) * 9 + (cacheRead / 1e6) * 0.3 + (otherInput / 1e6) * 3;
}

function getLocalGridFactor(): { region: string, factor: number } {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz.includes('Ho_Chi_Minh') || tz.includes('Bangkok') || tz.includes('Jakarta') || tz.includes('Asia/Manila')) return { region: 'Vietnam/SEA', factor: gridFactors.vietnam };
    if (tz.includes('Paris') || tz.includes('Europe/')) return { region: 'France/EU', factor: gridFactors.france };
    if (tz.includes('New_York') || tz.includes('America/')) return { region: 'US', factor: gridFactors.us_east };
    if (tz.includes('Singapore')) return { region: 'Singapore', factor: gridFactors.singapore };
    if (tz.includes('Calcutta') || tz.includes('Kolkata') || tz.includes('Asia/Kabul')) return { region: 'India', factor: gridFactors.india_average };
  } catch (e) {}
  return { region: 'Global Average', factor: 450 };
}

export async function getCarbonStats(): Promise<CarbonStats> {
  const parsers: TokenLogParser[] = [new ClaudeLogParser(), new CursorLogParser()];
  
  let totalTokens = 0, outputTokens = 0, cacheReadTokens = 0, sessions = 0, loggedCost = 0;

  for (const parser of parsers) {
    const stats = await parser.parse();
    totalTokens += stats.total;
    outputTokens += stats.output;
    cacheReadTokens += stats.cache;
    sessions += stats.sessions;
    loggedCost += stats.cost;
  }

  const energyKwh = (outputTokens / 1_000_000) * 0.662;
  const localGrid = getLocalGridFactor();

  // Prefer the log's own cost field (accurate); fall back to a rough token estimate.
  const costIsReal = loggedCost > 0;
  const estUsd = costIsReal ? loggedCost : estimateUsd(outputTokens, cacheReadTokens, totalTokens);

  return {
    totalTokens,
    outputTokens,
    cacheReadTokens,
    energyKwh,
    co2KgVietnam: (energyKwh * gridFactors.vietnam) / 1000,
    co2KgFrance: (energyKwh * gridFactors.france) / 1000,
    localCo2Kg: (energyKwh * localGrid.factor) / 1000,
    localRegion: localGrid.region,
    sessions,
    estUsd,
    costIsReal
  };
}
