// #8 Light team/fleet aggregation — local-first, no export.
//
// Each developer runs `outlier --json > me.json` and drops it in a shared folder (or CI
// collects them). `outlier aggregate <dir>` merges those JSON files into a team rollup.
// No machine talks to another; it only reads JSON the team already produced. This is the
// honest, minimal version of fleet view — real aggregation without a backend.

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

export interface TeamRollup {
  developers: number;
  avgAiPercent: number | null;
  maxAiPercent: number | null;
  totalEstUsd: number;
  worstBlastRadius: string;
  overLimit: number;        // how many devs are over their AI cap
  reachWriteDeploy: number; // total write/deploy-capable tools across the team
  notes: string[];
}

const BLAST_ORDER = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export function aggregateDir(dir: string): TeamRollup {
  const files = readdirSync(dir).filter(f => f.endsWith('.json'));
  const audits: any[] = [];
  for (const f of files) {
    try {
      const j = JSON.parse(readFileSync(join(dir, f), 'utf-8'));
      if (j?.tool === 'outlier') audits.push(j);
    } catch {}
  }

  const aiPcts = audits.map(a => a.authorship?.aiPercent).filter((x: any) => typeof x === 'number');
  const spends = audits.map(a => a.cost?.estUsd || 0);
  const blasts = audits.map(a => a.reach?.blastRadius).filter(Boolean);
  const overs = audits.filter(a => a.policy?.status === 'over').length;
  const writeDeploy = audits.reduce((s, a) => s + (a.reach?.writeOrDeployCount || 0), 0);

  const worst = blasts.reduce((m: string, b: string) =>
    BLAST_ORDER.indexOf(b) > BLAST_ORDER.indexOf(m) ? b : m, 'LOW');

  const notes: string[] = [];
  if (aiPcts.length && Math.max(...aiPcts) > 70) notes.push('At least one developer is over 70% AI authorship.');
  if (worst === 'HIGH' || worst === 'CRITICAL') notes.push(`Worst-case agent blast radius across the team is ${worst}.`);
  if (overs > 0) notes.push(`${overs} developer(s) over their AI-authorship limit.`);
  if (audits.length === 0) notes.push('No outlier --json files found in this folder.');

  return {
    developers: audits.length,
    avgAiPercent: aiPcts.length ? +(aiPcts.reduce((a: number, b: number) => a + b, 0) / aiPcts.length).toFixed(1) : null,
    maxAiPercent: aiPcts.length ? Math.max(...aiPcts) : null,
    totalEstUsd: +spends.reduce((a: number, b: number) => a + b, 0).toFixed(2),
    worstBlastRadius: worst,
    overLimit: overs,
    reachWriteDeploy: writeDeploy,
    notes,
  };
}
