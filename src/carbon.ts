import { homedir } from 'os';
import { join } from 'path';
import { readFile, access, readdir } from 'fs/promises';
import gridFactors from '../data/grid-factors.json';
import { energyKwhByModel } from './emissions';
import { detectSources, provLabel, type Provenance } from './sources';
import { claudeProjectSlug } from './util';

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
  estUsd: number;          // estimated spend in USD
  costIsReal: boolean;     // true if summed from the log's own cost field, false if estimated
  tokenProvenance: Provenance;
  carbonProvenance: Provenance;
  sourceLabel: string;     // e.g. "estimated · Claude Code transcripts"
}

export interface TokenLogParser {
  parse(): Promise<{ total: number, output: number, cache: number, sessions: number, cost: number, outputByModel: Record<string, number> }>;
}

export class ClaudeLogParser implements TokenLogParser {
  private baseDir: string;
  private cwd: string;
  constructor(baseDir = homedir(), cwd = process.cwd()) {
    this.baseDir = baseDir;
    this.cwd = cwd;
  }

  async parse() {
    // Primary source: the standard Claude Code session transcripts for THIS repo.
    // Claude Code stores them at ~/.claude/projects/<cwd-with-slashes-as-dashes>/*.jsonl,
    // one JSON object per line; assistant turns carry `message.usage`.
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
        // Standard transcripts carry no cost field; cost is estimated downstream.
        return { total, output, cache, sessions: sessions.size, cost: 0, outputByModel };
      }
    } catch {}

    // Fallback: the optional tokenomics-log.jsonl (written by a custom Stop hook;
    // carries a real cost_usd field when present).
    const logPath = join(this.baseDir, '.claude', 'tokenomics-log.jsonl');
    try {
      await access(logPath);
    } catch {
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

class CursorLogParser implements TokenLogParser {
  async parse() {
    return { total: 0, output: 0, cache: 0, sessions: 0, cost: 0, outputByModel: {} };
  }
}

// Rough blended token pricing (USD per 1M tokens) for when the log has no cost field.
// Conservative mid-points across current models; labeled "rough" in the UI.
function estimateUsd(output: number, cacheRead: number, total: number): number {
  const otherInput = Math.max(0, total - output - cacheRead);
  return (output / 1e6) * 9 + (cacheRead / 1e6) * 0.3 + (otherInput / 1e6) * 3;
}

// #6 CodeCarbon: if the developer runs CodeCarbon, it writes a real MEASURED
// emissions.csv (hardware energy, not a token estimate). Read the latest run.
// Columns (codecarbon >=2): timestamp,project_name,...,duration,emissions,...,energy_consumed,...
function readCodeCarbon(cwd: string, home: string): { energyKwh: number; co2Kg: number } | null {
  const { readFileSync, existsSync } = require('fs');
  const { join } = require('path');
  for (const p of [join(cwd, 'emissions.csv'), join(home, '.codecarbon', 'emissions.csv')]) {
    try {
      if (!existsSync(p)) continue;
      const lines = readFileSync(p, 'utf-8').trim().split('\n');
      if (lines.length < 2) continue;
      const header = lines[0].split(',');
      const iEm = header.indexOf('emissions');           // kg CO2eq
      const iEn = header.indexOf('energy_consumed');      // kWh
      if (iEm === -1 && iEn === -1) continue;
      let co2 = 0, kwh = 0;
      for (const row of lines.slice(1)) {
        const cols = row.split(',');
        co2 += parseFloat(cols[iEm]) || 0;
        kwh += parseFloat(cols[iEn]) || 0;
      }
      return { energyKwh: kwh, co2Kg: co2 };
    } catch {}
  }
  return null;
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
  return { region: 'Global Average', factor: gridFactors.global_average };
}

export async function getCarbonStats(): Promise<CarbonStats> {
  const parsers: TokenLogParser[] = [new ClaudeLogParser(), new CursorLogParser()];

  let totalTokens = 0, outputTokens = 0, cacheReadTokens = 0, sessions = 0, loggedCost = 0;
  const outputByModel: Record<string, number> = {};

  for (const parser of parsers) {
    const stats = await parser.parse();
    totalTokens += stats.total;
    outputTokens += stats.output;
    cacheReadTokens += stats.cache;
    sessions += stats.sessions;
    loggedCost += stats.cost;
    for (const [m, out] of Object.entries(stats.outputByModel)) {
      outputByModel[m] = (outputByModel[m] || 0) + out;
    }
  }

  // Carbon: prefer CodeCarbon's measured hardware data; else model-aware estimate.
  const localGrid = getLocalGridFactor();
  const measured = readCodeCarbon(process.cwd(), homedir());
  const energyKwh = measured ? measured.energyKwh : energyKwhByModel(outputByModel);
  const measuredCo2 = measured ? measured.co2Kg : null;

  // Source provenance for honest labelling in the UI.
  const sources = detectSources();

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
    localCo2Kg: measuredCo2 !== null ? measuredCo2 : (energyKwh * localGrid.factor) / 1000,
    localRegion: measured ? 'CodeCarbon (measured)' : localGrid.region,
    sessions,
    estUsd,
    costIsReal,
    tokenProvenance: sources.tokenSource.provenance,
    carbonProvenance: sources.carbonSource.provenance,
    sourceLabel: provLabel(sources.tokenSource)
  };
}
