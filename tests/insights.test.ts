import { expect, test, describe } from 'bun:test';
import { deriveInsights } from '../src/insights';

const git = (ratio: number) => ({ total: 100, ai: ratio * 100, ratio, totalNoMerges: 100, aiNoMerges: ratio * 100, ratioNoMerges: ratio } as any);
const carbon = (cachePct: number, tokens = 5_000_000) => ({
  totalTokens: tokens, outputTokens: tokens * 0.05, cacheReadTokens: tokens * (cachePct / 100),
  energyKwh: 1, co2KgVietnam: 1, co2KgFrance: 0.1, localCo2Kg: 0.5, localRegion: 'X',
  sessions: 1, estUsd: 50, costIsReal: false, tokenProvenance: 'estimated', carbonProvenance: 'estimated', sourceLabel: 'x',
} as any);
const caps = (blast: string, reaches: string[] = []) => ({
  mcps: reaches.map(r => ({ name: r, reach: r })), skills: [], subagents: 0, hooks: [],
  hasOrchestration: false, blastRadius: blast, blastReasons: ['can deploy to production'],
} as any);

describe('insight rules engine', () => {
  test('high reliance + high reach is CRITICAL', () => {
    const ins = deriveInsights({ authorship: git(0.85), carbon: carbon(50), caps: caps('HIGH', ['deploy']) });
    expect(ins[0]?.severity).toBe('critical');
  });

  test('low AI% + heavy tokens flags missing trailers', () => {
    const ins = deriveInsights({ authorship: git(0.05), carbon: carbon(50), caps: caps('LOW') });
    expect(ins.some(i => i.title.includes('Low AI%'))).toBe(true);
  });

  test('high cache flags spend on re-sent context', () => {
    const ins = deriveInsights({ authorship: git(0.3), carbon: carbon(90), caps: caps('LOW') });
    expect(ins.some(i => i.title.toLowerCase().includes('re-sent context'))).toBe(true);
  });

  test('clean state yields a single good insight', () => {
    const ins = deriveInsights({ authorship: git(0.2), carbon: carbon(20), caps: caps('LOW') });
    expect(ins.length).toBe(1);
    expect(ins[0]?.severity).toBe('good');
  });

  test('insights are sorted by severity (critical first)', () => {
    const ins = deriveInsights({ authorship: git(0.85), carbon: carbon(90), caps: caps('HIGH', ['deploy']) });
    expect(ins[0]?.severity).toBe('critical');
  });
});
