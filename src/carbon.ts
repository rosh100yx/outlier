import { file } from 'bun';
import { homedir } from 'os';
import { join } from 'path';

export interface CarbonStats {
  totalTokens: number;
  outputTokens: number;
  energyKwh: number;
  co2KgVietnam: number;
  co2KgFrance: number;
  sessions: number;
}

export async function getCarbonStats(): Promise<CarbonStats> {
  const logPath = join(homedir(), '.claude', 'tokenomics-log.jsonl');
  const logFile = file(logPath);
  
  if (!(await logFile.exists())) {
    throw new Error(`No tokenomics log found at ${logPath}`);
  }

  const text = await logFile.text();
  const lines = text.trim().split('\n').filter(l => l.length > 0);
  
  let totalTokens = 0;
  let outputTokens = 0;
  const sessions = new Set<string>();

  for (const line of lines) {
    try {
      const data = JSON.parse(line);
      totalTokens += data.total_tokens || 0;
      outputTokens += data.output_tokens || 0;
      if (data.session_id) {
        sessions.add(data.session_id);
      }
    } catch (e) {
      // skip invalid lines
    }
  }

  // Energy estimate: 10 kWh per 15.1M output tokens (from paper)
  // ≈ 0.662 kWh per million output tokens
  const energyKwh = (outputTokens / 1_000_000) * 0.662;

  // Grid intensities
  const VIETNAM_GRID_G_KWH = 681;
  const FRANCE_GRID_G_KWH = 21.7;

  return {
    totalTokens,
    outputTokens,
    energyKwh,
    co2KgVietnam: (energyKwh * VIETNAM_GRID_G_KWH) / 1000,
    co2KgFrance: (energyKwh * FRANCE_GRID_G_KWH) / 1000,
    sessions: sessions.size
  };
}
