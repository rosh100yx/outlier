import { spinner } from '@clack/prompts';
import pc from 'picocolors';
import { getAuthorshipStats } from '../git';
import { getCarbonStats } from '../carbon';
import { getCapabilitiesStats } from '../capabilities';
import { getTokenAuthorship } from '../agentic';
import { buildContribution } from '../contribution';
import { deriveInsights, type Insight } from '../insights';
import { projectEconomics } from '../economics';
import { configuredCap, CMD } from '../shared';
import { closeBox } from '../receipt';

export async function runAuditCommand(_args: string[]): Promise<void> {
  const isStrict = process.argv.includes('--strict');
  const sinceIdx = process.argv.indexOf('--since');
  const sinceRef = sinceIdx !== -1 ? process.argv[sinceIdx + 1] : undefined;

  let gitStats: any = null;
  let carbon: any = null;
  let capabilities: any = null;

  let skipDelay = false;
  const configPath = require('os').homedir() + '/.outlier_config';
  if (require('fs').existsSync(configPath)) {
     try {
       const cfg = JSON.parse(require('fs').readFileSync(configPath, 'utf8'));
       if (cfg.seenNarration) skipDelay = true;
     } catch(e) {}
  }

  if (!isStrict) {
    const s = spinner();
    s.start('[SYSTEM] Booting local-first sandbox...');
    if (!skipDelay) await new Promise(r => setTimeout(r, 800));
    s.message(`Governance: No API calls. Your code and logs never leave this machine.`);
    if (!skipDelay) await new Promise(r => setTimeout(r, 1200));

    s.message('[GIT] Scanning your commit history...');
    gitStats = await getAuthorshipStats().catch(() => null);
    if (!skipDelay) await new Promise(r => setTimeout(r, 600));
    if (!skipDelay) await new Promise(r => setTimeout(r, 1200));

    s.message('[TOKENS] Parsing local AI logs (~/.claude/)...');
    carbon = await getCarbonStats().catch(() => null);
    if (!skipDelay) await new Promise(r => setTimeout(r, 600));
    if (!skipDelay) await new Promise(r => setTimeout(r, 1200));

    s.message('[ANALYSIS] Computing mastery score...');
    capabilities = await getCapabilitiesStats().catch(() => null);
    if (!skipDelay) await new Promise(r => setTimeout(r, 600));
    if (!skipDelay) await new Promise(r => setTimeout(r, 1200));

    s.message('[PRINT] Generating Thermal Receipt...');
    if (!skipDelay) await new Promise(r => setTimeout(r, 600));

    if (!skipDelay) {
       try {
         const cfg = require('fs').existsSync(configPath) ? JSON.parse(require('fs').readFileSync(configPath, 'utf8')) : {};
         cfg.seenNarration = true;
         require('fs').writeFileSync(configPath, JSON.stringify(cfg));
       } catch(e) {}
    }
    s.stop('Audit complete');
  } else {
    const s = spinner();
    s.start('Running outlier telemetry audit...');
    gitStats = await getAuthorshipStats().catch(() => null);
    carbon = await getCarbonStats().catch(() => null);
    capabilities = await getCapabilitiesStats().catch(() => null);
    s.stop('Audit complete');
  }

  let authPct = '0%';
  let ruleFailures = 0;
  const aiCap = configuredCap();

  if (gitStats) {
    authPct = `${(gitStats.ratio * 100).toFixed(1)}%`;
    if (gitStats.ratio > aiCap / 100) ruleFailures++;
  }

  const contrib = buildContribution(gitStats, process.cwd(), sinceRef);
  const execAi = contrib.execution.aiPercent;
  const measured = contrib.execution.confidence === 'measured';
  const execColor = !measured ? pc.dim : execAi > 70 ? pc.red : execAi > 40 ? pc.yellow : pc.green;
  const labelColor = contrib.label === 'Spectator' || contrib.label === 'Unmeasured' ? pc.yellow
    : contrib.label === 'Artisan' || contrib.label === 'Centaur' ? pc.green : pc.yellow;
  const intentStr = contrib.intent.prompts !== null
    ? `${pc.bold(String(contrib.intent.prompts))} prompts ${pc.dim('· ~' + ((contrib.intent.promptTokens||0)/1e3).toFixed(0) + 'K tokens you typed')}`
    : pc.dim('no session logs for this repo');
  const ov = contrib.oversight;
  let ovStr: string;
  if (ov.totalCommits > 0 || ov.sessionEdits > 0) {
    const parts: string[] = [];
    if (ov.totalCommits > 0) parts.push(`${ov.iterationCommits}/${ov.totalCommits} rework commits`);
    if (ov.sessionEdits > 0) parts.push(`${ov.sessionRevisions}/${ov.sessionEdits} in-session revisions`);
    ovStr = `${pc.bold((ov.iterationRate * 100).toFixed(0) + '%')} ${pc.dim(parts.join(' · '))}`;
  } else {
    ovStr = pc.dim('—');
  }
  const kL = (n: number) => n >= 1000 ? (n/1000).toFixed(0) + 'K' : String(n);
  let execBasis: string;
  if (contrib.execution.source === 'edits') {
    const ex = contrib.execution;
    const counts = `${kL(ex.aiLines || 0)} of ${kL(ex.totalLines || 0)}`;
    if (ex.shared && ex.scopedToUser) {
      execBasis = `blame · your slice · ${counts} · ${ex.contributors} contributors`;
    } else if (ex.shared) {
      execBasis = `blame · ⚠ whole repo, ${ex.contributors} authors · slice not computed`;
    } else {
      execBasis = `blame · ${counts} live lines`;
    }
  } else {
    execBasis = contrib.execution.source === 'commit-tags' ? 'commit tags · weak signal' : 'no signal';
  }
  const execMark = measured ? '' : '⚠ ';
  const profileRows =
    ` ${pc.dim('│')} Execution  ${execColor(pc.bold(execAi.toFixed(0) + '% AI'))} ${pc.dim('('+execBasis+')')}\n` +
    ` ${pc.dim('│')} Intent     ${intentStr}\n` +
    ` ${pc.dim('│')} Oversight  ${ovStr}\n` +
    ` ${pc.dim('│')}\n` +
    ` ${pc.dim('│')} ${labelColor(pc.bold(contrib.label))} — ${contrib.judgment.length > 52 ? contrib.judgment.slice(0,51)+'…' : contrib.judgment}\n` +
    ` ${pc.dim('│')} ${pc.dim('Blind: copy-paste from chat is invisible; prompt quality unmeasured.')}`;

  let cachePct = '0';
  let co2Str = '0.0kg';
  let regionStr = 'Global Average';
  let sourceLabel = 'no local AI logs found';
  if (carbon) {
    if (carbon.totalTokens > 0) {
      cachePct = ((carbon.cacheReadTokens / carbon.totalTokens) * 100).toFixed(1);
    }
    co2Str = `${carbon.localCo2Kg.toFixed(2)}kg CO2`;
    regionStr = carbon.localRegion;
    sourceLabel = carbon.sourceLabel;
  }

  let reachStr = pc.dim('run: ' + CMD + ' capabilities');
  if (capabilities) {
    const rc = capabilities.blastRadius;
    const col = rc === 'CRITICAL' || rc === 'HIGH' ? pc.red : rc === 'MEDIUM' ? pc.yellow : pc.green;
    const risky = capabilities.mcps.filter((m: any) => ['money','exec','deploy','write-remote','write-local'].includes(m.reach)).length;
    const latent = capabilities.mcpsLatent;
    reachStr = `${col(pc.bold(rc))} · ${capabilities.mcps.length} tools` +
      (risky ? pc.dim(`, ${risky} can write/deploy`) : '') +
      (latent ? pc.dim(` · ${latent} unused (latent)`) : '');
  }

  const insights = deriveInsights({ authorship: gitStats, carbon, caps: capabilities, policyCap: configuredCap()/100 });
  const sevColor = (s: string) => s === 'critical' ? pc.red : s === 'warn' ? pc.yellow : s === 'good' ? pc.green : pc.cyan;
  const sevMark = (s: string) => s === 'critical' ? '✗' : s === 'warn' ? '⚠' : s === 'good' ? '✓' : 'i';
  const insightLines = insights.slice(0,2).map((ins: Insight) =>
    ` ${pc.dim('│')} ${sevColor(ins.severity)(sevMark(ins.severity))} ${pc.bold(ins.title)}\n` +
    ` ${pc.dim('│')}   ${ins.detail.length > 56 ? ins.detail.slice(0,55)+'…' : ins.detail}\n` +
    ` ${pc.dim('│')}   ${pc.cyan('→ ' + ins.action)}`
  ).join(`\n ${pc.dim('│')}\n`);

  const isInefficient = parseFloat(cachePct) > 40;
  const cacheVerdict = isInefficient ? pc.yellow('High Context Tax') : pc.green('Lean');
  const cacheCostStr = carbon && carbon.estCacheUsd > 0 ? ` (~$${carbon.estCacheUsd.toFixed(2)})` : '';
  const cacheText = isInefficient
    ? `You are burning money re-sending context${cacheCostStr}.\n   → Start a fresh session to flush the context window.`
    : `Little wasted context. Your spend is mostly\n   real work.`;

  const policyStatus = ruleFailures > 0 ? pc.red('Over your limit') : pc.green('Within limit');
  const policyAction = ruleFailures > 0 ? 'Heads up only — nothing was blocked.' : 'Nothing to do.';

  const fmtTokens = (n: number) =>
    n >= 1_000_000_000 ? (n/1_000_000_000).toFixed(1) + 'B'
    : n >= 1_000_000 ? (n/1_000_000).toFixed(1) + 'M'
    : n >= 1_000 ? (n/1000).toFixed(1) + 'k'
    : String(n);
  const newTokens = carbon ? Math.max(0, carbon.totalTokens - carbon.cacheReadTokens) : 0;
  const newTokensStr = carbon ? fmtTokens(newTokens) : '0';
  const reReadStr = carbon ? fmtTokens(carbon.cacheReadTokens) : '0';
  const estUsdStr = carbon
    ? '$' + carbon.estUsd.toFixed(2) + (carbon.costIsReal ? '' : pc.dim(' (rough)'))
    : pc.dim('n/a');
  const getProgressBar = (pct: number, length = 10) => {
    const filled = Math.max(0, Math.min(length, Math.round((pct/100) * length)));
    return '▰'.repeat(filled) + '▱'.repeat(length - filled);
  };
  const cacheBar = pc.magenta(getProgressBar(parseFloat(cachePct) || 0));

  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase();
  const repoName = process.cwd().split('/').pop() || 'Unknown';

  const finalReceipt = `\n ${pc.dim('┌────────────────────────────────────────────────────────')}
 ${pc.dim('│')} ${pc.cyan('█▀█ █░█ ▀█▀ █░░ █ █▀▀ █▀█')}  ${pc.bold(':: CODE AUDIT')}
 ${pc.dim('│')} ${pc.cyan('█▄█ █▄█ ░█░ █▄▄ █ ██▄ █▀▄')}  ${pc.dim(':: ' + repoName + ' · ' + dateStr)}
 ${pc.dim('├────────────────────────────────────────────────────────')}
 ${pc.dim('│')} ${pc.bold(pc.bgCyan(pc.black(' WHAT YOUR AGENTS CAN REACH ')))}
 ${pc.dim('│')} Blast radius   ${reachStr}
 ${pc.dim('│')} ${pc.dim('Full map: ' + CMD + ' capabilities')}
 ${pc.dim('├────────────────────────────────────────────────────────')}
 ${pc.dim('│')} ${pc.bold(pc.bgMagenta(' WHAT IT COST '))}
 ${pc.dim('│')} New tokens       ${pc.bold(newTokensStr)} ${pc.dim('(work done)')}
 ${pc.dim('│')} Re-read context  ${pc.bold(reReadStr)} ${pc.dim('(' + cachePct + '% of all tokens')}
 ${pc.dim('│')} Est. spend       ${pc.bold(estUsdStr)}
 ${pc.dim('│')} Re-read ratio    ${cacheBar} ${pc.bold(cachePct + '%')}
 ${pc.dim('│')} Energy           ${pc.bold(co2Str)} ${pc.dim('(' + regionStr + ' grid')}
 ${pc.dim('│')} ${pc.dim('Source: ' + sourceLabel)}
 ${pc.dim('│')}
 ${pc.dim('│')} ${cacheVerdict} — ${cacheText.split('\n').join('\n ' + pc.dim('│') + '   ')}
 ${pc.dim('├────────────────────────────────────────────────────────')}
 ${pc.dim('│')} ${pc.bold(pc.bgYellow(pc.black(' YOUR LIMIT ')))}
 ${pc.dim('│')} AI cap   ${pc.bold(aiCap + '%')} ${pc.dim('· change with: ' + CMD + ' policy')}
 ${pc.dim('│')} Status   ${policyStatus} ${pc.dim('·')} ${policyAction}
 ${pc.dim('├────────────────────────────────────────────────────────')}
 ${pc.dim('│')} ${pc.dim('Who wrote the code')} ${pc.dim('· a mirror, not a verdict · ')}${pc.cyan(CMD + ' learn')} ${pc.dim('to level up')}
${profileRows}
 ${pc.dim('├────────────────────────────────────────────────────────')}
 ${pc.dim('│')} ${pc.bold(pc.bgGreen(pc.black(' WHAT TO DO ')))}
${insightLines}
 ${pc.dim('│')}
 ${pc.dim('│')} ${pc.cyan('→')} Learn what the AI wrote: ${pc.bold(CMD + ' learn')} ${pc.dim('— one skill to unlock')}
 ${pc.dim('├────────────────────────────────────────────────────────')}
 ${pc.dim('│')} ${pc.dim('Numbers are local estimates — authorship is a proxy and')}
 ${pc.dim('│')} ${pc.dim('carbon is rough. How it works: ' + CMD + ' --help')}
 ${pc.dim('│')} ${pc.dim(pc.italic('Run this before you start. Keep the skill while you use the speed.'))}
 ${pc.dim('└────────────────────────────────────────────────────────')}`;

  console.log(closeBox(finalReceipt));
}
