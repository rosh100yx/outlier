import { homedir } from 'os';
import { join } from 'path';
import gridFactors from '../data/grid-factors.json';
import { energyKwhByModel } from './emissions';
import { detectSources, provLabel, type Provenance } from './sources';
import {
  ClaudeLogParser, CursorLogParser, GeminiLogParser,
  AiderLogParser, OpenCodeLogParser, ContinueLogParser,
  type TokenLogParser,
} from './parsers/index';

export type { TokenLogParser };

export { ClaudeLogParser };

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

// Rough blended token pricing (USD per 1M tokens) for when the log has no cost field.
function estimateUsd(output: number, cacheRead: number, total: number): number {
  const otherInput = Math.max(0, total - output - cacheRead);
  return (output / 1e6) * 9 + (cacheRead / 1e6) * 0.3 + (otherInput / 1e6) * 3;
}

// #6 CodeCarbon: if the developer runs CodeCarbon, it writes a real MEASURED
// emissions.csv (hardware energy, not a token estimate). Read the latest run.
function readCodeCarbon(cwd: string, home: string): { energyKwh: number; co2Kg: number } | null {
  const { readFileSync, existsSync } = require('fs');
  const { join } = require('path');
  for (const p of [join(cwd, 'emissions.csv'), join(home, '.codecarbon', 'emissions.csv')]) {
    try {
      if (!existsSync(p)) continue;
      const lines = readFileSync(p, 'utf-8').trim().split('\n');
      if (lines.length < 2) continue;
      const header = lines[0].split(',');
      const iEm = header.indexOf('emissions');
      const iEn = header.indexOf('energy_consumed');
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
  } catch {}
  return { region: 'Global Average', factor: gridFactors.global_average };
}

export async function getCarbonStats(): Promise<CarbonStats> {
  const home = homedir();
  const cwd = process.cwd();

  const parsers: TokenLogParser[] = [
    new ClaudeLogParser(home, cwd),
    new CursorLogParser(home),
    new GeminiLogParser(home, cwd),
    new AiderLogParser(cwd),
    new OpenCodeLogParser(home),
    new ContinueLogParser(home),
  ];

  let totalTokens = 0, outputTokens = 0, cacheReadTokens = 0, sessions = 0, loggedCost = 0;
  const outputByModel: Record<string, number> = {};

  for (const parser of parsers) {
    try {
      const stats = await parser.parse();
      totalTokens += stats.total;
      outputTokens += stats.output;
      cacheReadTokens += stats.cache;
      sessions += stats.sessions;
      loggedCost += stats.cost;
      for (const [m, out] of Object.entries(stats.outputByModel)) {
        outputByModel[m] = (outputByModel[m] || 0) + out;
      }
    } catch {}
  }

  const localGrid = getLocalGridFactor();
  const measured = readCodeCarbon(cwd, home);
  const energyKwh = measured ? measured.energyKwh : energyKwhByModel(outputByModel);
  const measuredCo2 = measured ? measured.co2Kg : null;

  const sources = detectSources(cwd);

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
    sourceLabel: sources.tokenSources
      .filter(s => s.provenance !== 'none')
      .map(s => provLabel(s))
      .join(', ') || 'no local data'
  };
}
