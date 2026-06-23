import { expect, test, describe } from 'bun:test';
import { aggregateDir } from '../src/aggregate';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const mk = (ai: number, usd: number, blast: string, wd: number, over = false) => JSON.stringify({
  tool: 'outlier',
  authorship: { aiPercent: ai },
  cost: { estUsd: usd },
  reach: { blastRadius: blast, writeOrDeployCount: wd },
  policy: { status: over ? 'over' : 'within' },
});

describe('team aggregation', () => {
  test('rolls up multiple --json audits', () => {
    const dir = mkdtempSync(join(tmpdir(), 'outlier-agg-'));
    writeFileSync(join(dir, 'a.json'), mk(20, 50, 'LOW', 1));
    writeFileSync(join(dir, 'b.json'), mk(80, 100, 'HIGH', 4, true));
    const r = aggregateDir(dir);
    expect(r.developers).toBe(2);
    expect(r.avgAiPercent).toBe(50);
    expect(r.maxAiPercent).toBe(80);
    expect(r.totalEstUsd).toBe(150);
    expect(r.worstBlastRadius).toBe('HIGH');
    expect(r.overLimit).toBe(1);
    expect(r.reachWriteDeploy).toBe(5);
  });

  test('empty folder yields a note, no crash', () => {
    const dir = mkdtempSync(join(tmpdir(), 'outlier-agg-'));
    const r = aggregateDir(dir);
    expect(r.developers).toBe(0);
    expect(r.notes.length).toBeGreaterThan(0);
  });
});
