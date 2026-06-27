// Insight rules engine — turns the raw metrics into meaning + one action.
//
// The numbers (75% AI, $63, blast radius HIGH) are data. Insights are what they MEAN
// together: high AI authorship is only alarming if your agents can also deploy; a low
// AI% next to heavy token use usually means missing trailers, not human authorship.
// Each rule combines signals and returns a plain message + a concrete next step.

import type { AuthorshipStats } from './git';
import type { CarbonStats } from './carbon';
import type { CapabilitiesStats } from './capabilities';

export type Severity = 'critical' | 'warn' | 'info' | 'good';

export interface Insight {
  severity: Severity;
  title: string;   // short headline
  detail: string;  // one plain sentence of why
  action: string;  // the one thing to do
}

const RANK: Record<Severity, number> = { critical: 0, warn: 1, info: 2, good: 3 };

export interface InsightInput {
  authorship: AuthorshipStats | null;
  carbon: CarbonStats | null;
  caps: CapabilitiesStats | null;
  policyCap?: number; // 0..1, default 0.70
}

export function deriveInsights({ authorship, carbon, caps, policyCap = 0.70 }: InsightInput): Insight[] {
  const out: Insight[] = [];
  const ai = authorship ? authorship.ratio : null;
  const cachePct = carbon && carbon.totalTokens ? (carbon.cacheReadTokens / carbon.totalTokens) * 100 : null;
  const blast = caps ? caps.blastRadius : null;
  const writeOrDeploy = caps ? caps.mcps.filter(m => ['money', 'exec', 'deploy', 'write-remote', 'write-local'].includes(m.reach)).length : 0;
  const heavyTokens = carbon ? carbon.totalTokens > 1_000_000 : false;

  // 1. The compound one: high reliance AND high reach = you may not own code that can ship.
  if (ai !== null && ai > 0.7 && (blast === 'HIGH' || blast === 'CRITICAL')) {
    out.push({
      severity: 'critical',
      title: 'High reliance + high reach',
      detail: `AI wrote ${(ai * 100).toFixed(0)}% here and your agents can ${writeOrDeploy ? 'write/deploy' : 'reach external services'}. You may not own code that can ship to prod.`,
      action: 'Review the core paths yourself before delegating more this session.',
    });
  } else if (ai !== null && ai > 0.7) {
    // 2. High reliance alone.
    out.push({
      severity: 'warn',
      title: 'You are mostly reviewing, not writing',
      detail: `AI wrote ${(ai * 100).toFixed(0)}% of recent commits — you risk losing the skill to debug it unaided.`,
      action: 'Read the AI-written code through, or hand-write the next core change.',
    });
  }

  // 3. Honesty rule: low AI% next to heavy token use = missing trailers, not human authorship.
  if (ai !== null && ai < 0.1 && heavyTokens) {
    out.push({
      severity: 'info',
      title: 'Low AI% may be misleading',
      detail: 'Heavy token use but few AI-tagged commits — your agent probably is not writing Co-Authored-By trailers.',
      action: 'Treat the authorship number as a floor, not the truth, until trailers are on.',
    });
  }

  // 4. Reach / blast radius, independent of authorship.
  if (caps && (blast === 'CRITICAL' || blast === 'HIGH')) {
    out.push({
      severity: blast === 'CRITICAL' ? 'critical' : 'warn',
      title: `Blast radius ${blast}`,
      detail: `If an agent (or a prompt injection) drives your tools, it ${caps.blastReasons.slice(0, 2).join(' and ') || 'has broad reach'}.`,
      action: 'Disable the write/deploy MCP tools you do not need this session.',
    });
  }

  // 5. Cache waste = where the money goes.
  if (cachePct !== null && cachePct > 80) {
    const costStr = carbon && carbon.estCacheUsd > 0 ? ` (~$${carbon.estCacheUsd.toFixed(2)})` : '';
    out.push({
      severity: 'warn',
      title: 'Context Tax is burning money',
      detail: `${cachePct.toFixed(0)}% of your tokens just re-read old context${costStr} — that is most of the bill, not new work.`,
      action: 'Start fresh sessions for new tasks; keep context tight.',
    });
  }

  // 6. Over the policy limit.
  if (ai !== null && ai > policyCap) {
    out.push({
      severity: 'warn',
      title: 'Over your AI-authorship limit',
      detail: `AI authorship is ${(ai * 100).toFixed(0)}%, over your ${(policyCap * 100).toFixed(0)}% limit.`,
      action: 'Either raise the cap deliberately, or write the next change yourself.',
    });
  }

  // 7. Nothing wrong — say so (don't manufacture alarm).
  if (out.length === 0) {
    out.push({
      severity: 'good',
      title: 'Low risk',
      detail: ai !== null
        ? `You wrote most of this (${(100 - ai * 100).toFixed(0)}%) and your agents have limited reach.`
        : 'No AI logs or git history found to flag.',
      action: 'Carry on — re-run before your next big delegation.',
    });
  }

  return out.sort((a, b) => RANK[a.severity] - RANK[b.severity]);
}
