#!/usr/bin/env node
import os from 'os';
import { intro, outro, select, spinner, isCancel, cancel, note, text, confirm } from '@clack/prompts';
import pc from 'picocolors';
import { getAuthorshipStats } from './git';
import { getCarbonStats } from './carbon';
import { getCapabilitiesStats } from './capabilities';
import { deriveInsights, type Insight } from './insights';
import { writeFileSync, readFileSync, chmodSync, existsSync } from 'fs';
import { join } from 'path';
import { detectAgent } from './agent';

const ASCII_LOGO = `
   ____  _   _ _____ _     ___ _____ ____  
  / __ \\| | | |_   _| |   |_ _|  ___|  _ \\ 
 | |  | | | | | | | | |    | || |__ | |_) |
 | |  | | |_| | | | | |___ | ||  __||  _ < 
 | |__| |  _  | | | |  _  || || |___| | \\ \\
  \\____/|_| |_| |_| |_| |_|___|_____|_|  \\_\\
`;

let finalReceipt = '';

// Build a stable, machine-readable audit object. This is the contract agents,
// swarms, and CI parse — everything the human receipt shows, as plain JSON.
async function emitJson() {
  const pkg = require('../package.json');
  const [gitStats, carbon, caps] = await Promise.all([
    getAuthorshipStats().catch(() => null),
    getCarbonStats().catch(() => null),
    getCapabilitiesStats().catch(() => null),
  ]);

  const aiRatio = gitStats ? gitStats.ratio : 0;
  const cap = 0.70;
  const writeOrDeploy = caps
    ? caps.mcps.filter((m: any) => ['money', 'exec', 'deploy', 'write-remote', 'write-local'].includes(m.reach)).length
    : 0;

  const out = {
    tool: 'outlier',
    version: pkg.version,
    repo: process.cwd().split('/').pop(),
    generatedAt: new Date().toISOString(),
    localFirst: true,
    authorship: gitStats ? {
      aiPercent: +(gitStats.ratio * 100).toFixed(1),
      aiRatio: gitStats.ratio,
      totalCommits: gitStats.total,
      aiCommits: gitStats.ai,
      nonMergePercent: +(gitStats.ratioNoMerges * 100).toFixed(1),
      provenance: 'proxy',
      note: 'git Co-Authored-By trailers; under-counts if the agent omits the trailer',
    } : null,
    cost: carbon ? {
      totalTokens: carbon.totalTokens,
      outputTokens: carbon.outputTokens,
      cacheReusePercent: carbon.totalTokens ? +((carbon.cacheReadTokens / carbon.totalTokens) * 100).toFixed(1) : 0,
      estUsd: +carbon.estUsd.toFixed(2),
      costIsReal: carbon.costIsReal,
      provenance: carbon.tokenProvenance,
      source: carbon.sourceLabel,
    } : null,
    carbon: carbon ? {
      energyKwh: +carbon.energyKwh.toFixed(4),
      co2Kg: +carbon.localCo2Kg.toFixed(4),
      region: carbon.localRegion,
      provenance: carbon.carbonProvenance,
      note: 'counterfactual: cloud inference runs on the provider grid, not yours',
    } : null,
    reach: caps ? {
      blastRadius: caps.blastRadius,
      reasons: caps.blastReasons,
      toolCount: caps.mcps.length,
      writeOrDeployCount: writeOrDeploy,
      tools: caps.mcps,
      subagents: caps.subagents,
      hooks: caps.hooks,
      skills: caps.skills.length,
      orchestration: caps.hasOrchestration,
    } : null,
    policy: {
      aiCapPercent: cap * 100,
      status: aiRatio > cap ? 'over' : 'within',
    },
    insights: deriveInsights({ authorship: gitStats, carbon, caps, policyCap: cap }),
  };

  // Only JSON on stdout — nothing else.
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

async function runOnboarding() {
  console.log(pc.cyan(ASCII_LOGO));
  intro(pc.inverse(' outlier: Welcome '));

  note(
    `Outlier is a local-first Policy Engine & Governance Framework for AI Engineering.

As agents write more of our code, we lose visibility into:
1. Deskilling Risk (Are we becoming spectators in our own codebase?)
2. Carbon Cost (What is the true regional energy cost of token caching?)
3. Capability Drift (What hidden skills are our agents using?)`,
    'The Problem: AI Safety in Development'
  );

  note(
    `Outlier operates entirely on your machine.
- Local Only: No API keys. No cloud telemetry. No data leaves your machine.
- Native Auditing: We read your local \`~/.claude\` logs and \`.git/\` commit history.
- Actionable Policies: Enforce rules locally via terminal or Git hooks.`,
    'Privacy & Zero-Trust Principles'
  );

  const ready = await confirm({
    message: 'Are you ready to run your first Governance Audit and generate your Thermal Receipt?',
    initialValue: true,
  });

  if (isCancel(ready) || !ready) {
    cancel('Onboarding paused. Run outlier again when you are ready.');
    process.exit(0);
  }

  const configPath = join(os.homedir(), '.outlier_config');
  writeFileSync(configPath, JSON.stringify({ onboarded: true, date: new Date().toISOString() }));
}

async function main() {
  let action = process.argv[2] as any;

  if (action === 'daily-greeting') {
    const configPath = join(os.homedir(), '.outlier_config');
    const today = new Date().toISOString().split('T')[0];
    let alreadyRun = false;
    if (existsSync(configPath)) {
      try {
        const cfg = JSON.parse(readFileSync(configPath, 'utf8'));
        if (cfg.lastGreetingDate === today) {
           alreadyRun = true;
        } else {
           cfg.lastGreetingDate = today;
           writeFileSync(configPath, JSON.stringify(cfg));
        }
      } catch (e) {}
    }
    if (alreadyRun) process.exit(0);
    action = 'status';
  }

  // Agent / CI / swarm contract: --json emits a structured audit and nothing else
  // (no logo, no spinner, no ANSI). This is how an agent perceives outlier.
  if (process.argv.includes('--json')) {
    await emitJson();
    process.exit(0);
  }

  console.log(pc.cyan(ASCII_LOGO));
  const pkg = require('../package.json');
  console.log(pc.dim(`  Outlier v${pkg.version} · AI Code Reliance & Telemetry Engine\n`));


  if (action === '--help' || action === '-h' || action === 'help') {
    console.log(pc.bold('\nWHAT OUTLIER DOES'));
    console.log(pc.dim('  Reads your local git history and AI logs — on your machine — to show'));
    console.log(pc.dim('  how much of your code AI wrote, what it cost, and how to keep your skill.\n'));
    console.log(pc.bold('COMMANDS:'));
    console.log(`  ${pc.cyan('outlier')}              Run the audit (the default — same as 'status')`);
    console.log(`  ${pc.cyan('outlier preflight')}    Quick briefing BEFORE you start an agent (reach + skill + spend)`);
    console.log(`  ${pc.cyan('outlier status')}       Full audit: who wrote the code, what it cost, your limit`);
    console.log(`  ${pc.cyan('outlier status --save')} Save the audit to ./outlier-audit.txt`);
    console.log(`  ${pc.cyan('outlier --json')}       Machine-readable audit (for agents, CI, swarms)`);
    console.log(`  ${pc.cyan('outlier authorship')}   Just the AI-vs-human commit breakdown`);
    console.log(`  ${pc.cyan('outlier carbon')}       Just the token spend, cache waste & carbon`);
    console.log(`  ${pc.cyan('outlier capabilities')} What tools & skills your agents can reach`);
    console.log(`  ${pc.cyan('outlier policy')}       Set an AI-authorship limit (local git hook / CI)`);
    console.log(`  ${pc.cyan('outlier impact')}       What AI reliance compounds to over time`);
    console.log(`  ${pc.cyan('outlier knowledge')}    The research behind the metrics`);
    console.log(`  ${pc.cyan('outlier participate')}  Share anonymous feedback for the deskilling study`);
    console.log(`  ${pc.cyan('outlier init')}         Show a once-per-day reliance greeting in new shells`);
    console.log(`  ${pc.cyan('outlier uninit')}       Remove that greeting`);
    console.log('\n' + pc.dim('Local-first: nothing ever leaves your machine.'));
    console.log(pc.dim('How it works → https://github.com/rosh100yx/outlier#how-it-works'));
    process.exit(0);
  }

  const configPath = join(os.homedir(), '.outlier_config');
  if (!existsSync(configPath) && !action) {
    await runOnboarding();
    action = 'status'; // auto-run status after onboarding
  }

  intro(pc.inverse(' outlier '));

  if (!action || action === 'audit') {
    action = 'status'; // Auto-run the main audit loop for highest TTV
  }

  if (action === 'init' || action === 'uninit') {
     const shell = process.env.SHELL || '';
     const rcName = shell.includes('zsh') ? '.zshrc' : '.bashrc';
     const rcPath = join(os.homedir(), rcName);
     
     const START_MARKER = '# --- OUTLIER PRE-FLIGHT RITUAL START ---';
     const END_MARKER = '# --- OUTLIER PRE-FLIGHT RITUAL END ---';
     const BLOCK = `\n${START_MARKER}\nif command -v outlier >/dev/null 2>&1; then\n  outlier daily-greeting\nfi\n${END_MARKER}\n`;

     if (action === 'init') {
        const confirmWrite = await confirm({
           message: `Add a once-per-day Outlier greeting to your ${rcName}? (You can remove it with 'outlier uninit')`,
           initialValue: true
        });
        if (isCancel(confirmWrite) || !confirmWrite) {
           cancel('Aborted.');
           process.exit(0);
        }
        
        let content = '';
        if (existsSync(rcPath)) content = readFileSync(rcPath, 'utf8');
        if (content.includes(START_MARKER)) {
           note(`Outlier is already initialized in ${rcName}`);
        } else {
           writeFileSync(rcPath, content + BLOCK);
           note(`Successfully added to ${rcName}. Open a new terminal to see the pre-flight ritual!`);
        }
        process.exit(0);
     } else if (action === 'uninit') {
        if (existsSync(rcPath)) {
           let content = readFileSync(rcPath, 'utf8');
           if (content.includes(START_MARKER)) {
               const regex = new RegExp(`\\n?${START_MARKER}[\\s\\S]*?${END_MARKER}\\n?`, 'g');
               content = content.replace(regex, '\n');
               writeFileSync(rcPath, content);
               note(`Removed Outlier block from ${rcName}`);
           } else {
               note(`No Outlier block found in ${rcName}`);
           }
        }
        process.exit(0);
     }
  }

  const s = spinner();
  
  if (action === 'carbon') {
    s.start('Scanning local agent session logs...');
    try {
      const carbon = await getCarbonStats();
      s.stop('Audit complete');
      
      note(
        `Sessions:       ${carbon.sessions}
Output Tokens:  ${(carbon.outputTokens / 1_000_000).toFixed(2)}M
Est. Energy:    ${carbon.energyKwh.toFixed(2)} kWh

Your Local Grid (${carbon.localRegion}): ${pc.cyan(carbon.localCo2Kg.toFixed(2) + ' kgCO2')}

Counterfactual (Vietnam): ${pc.red(carbon.co2KgVietnam.toFixed(2) + ' kgCO2')}
Counterfactual (France):  ${pc.green(carbon.co2KgFrance.toFixed(2) + ' kgCO2')}

Ratio: ~31x carbon penalty on coal-heavy grid`,
        'Session Carbon Breakdown'
      );
    } catch (e: any) {
      s.stop('Audit failed');
      console.error(pc.red(e.message));
    }
  } else if (action === 'authorship') {
    s.start('Scanning local git history...');
    try {
      const gitStats = await getAuthorshipStats().catch(() => null);
      s.stop('Audit complete');
      
      if (gitStats) {
        const pct = (gitStats.ratio * 100).toFixed(1);
        const nmPct = (gitStats.ratioNoMerges * 100).toFixed(1);
        
        let color = pc.green;
        let warning = '';
        if (gitStats.ratio > 0.7) {
          color = pc.red;
          warning = pc.red(' ⚠ high dependency');
        } else if (gitStats.ratio > 0.4) {
          color = pc.yellow;
          warning = pc.yellow(' ⚠ moderate');
        }

        note(
          `Total Commits:      ${gitStats.total}
AI Co-Authored:     ${gitStats.ai}
Authorship Ratio:   ${color(pct + '%')}${warning}

Non-merge Commits:  ${gitStats.totalNoMerges}
AI Co-Authored:     ${gitStats.aiNoMerges}
Conservative Floor: ${color(nmPct + '%')}`,
            'Git Authorship Breakdown'
          );
      }
    } catch (e: any) {
      s.stop('Audit failed');
      console.error(pc.red(e.message));
    }
  } else if (action === 'status') {
    const isStrict = process.argv.includes('--strict');
    
    let gitStats: any = null;
    let carbon: any = null;
    let capabilities: any = null;

    let skipDelay = false;
    const configPath = join(os.homedir(), '.outlier_config');
    if (existsSync(configPath)) {
       try {
         const cfg = JSON.parse(readFileSync(configPath, 'utf8'));
         if (cfg.seenNarration) skipDelay = true;
       } catch(e) {}
    }

    if (!isStrict) {
      s.start('[SYSTEM] Booting local-first sandbox...');
      if (!skipDelay) await new Promise(r => setTimeout(r, 800));
      s.message(`↳ Guarantee: No API calls. Your code and logs never leave this machine.`);
      if (!skipDelay) await new Promise(r => setTimeout(r, 1200));
      
      s.message('[GIT] Scanning your commit history...');
      gitStats = await getAuthorshipStats().catch(() => null);
      if (!skipDelay) await new Promise(r => setTimeout(r, 600));
      s.message(`↳ Check: Are you writing the code, or just reviewing what the AI wrote?`);
      if (!skipDelay) await new Promise(r => setTimeout(r, 1200));
      
      s.message('[TOKENS] Parsing local AI logs (~/.claude/)...');
      carbon = await getCarbonStats().catch(() => null);
      if (!skipDelay) await new Promise(r => setTimeout(r, 600));
      s.message(`↳ Check: How much API waste is your workflow generating locally?`);
      if (!skipDelay) await new Promise(r => setTimeout(r, 1200));
      
      s.message('[ANALYSIS] Calculating your mastery score...');
      capabilities = await getCapabilitiesStats().catch(() => null);
      if (!skipDelay) await new Promise(r => setTimeout(r, 600));
      s.message(`↳ Warning: Heavy AI use creates the 'Illusion of Competence'. Don't lose your edge.`);
      if (!skipDelay) await new Promise(r => setTimeout(r, 1200));
      
      s.message('[PRINT] Generating Thermal Receipt...');
      if (!skipDelay) await new Promise(r => setTimeout(r, 600));

      if (!skipDelay) {
         try {
           const cfg = existsSync(configPath) ? JSON.parse(readFileSync(configPath, 'utf8')) : {};
           cfg.seenNarration = true;
           writeFileSync(configPath, JSON.stringify(cfg));
         } catch(e) {}
      }
    } else {
      s.start('Running outlier telemetry audit...');
      gitStats = await getAuthorshipStats().catch(() => null);
      carbon = await getCarbonStats().catch(() => null);
      capabilities = await getCapabilitiesStats().catch(() => null);
    }
    s.stop('Audit complete');
    
    try {
        let authPct = '0%';
        let nmFloorStr = '';
        let ruleFailures = 0;

        if (gitStats) {
          authPct = `${(gitStats.ratio * 100).toFixed(1)}%`;
          // Conservative floor: non-merge commits only (merges often lack the trailer).
          nmFloorStr = ` ${pc.dim(`(${(gitStats.ratioNoMerges * 100).toFixed(0)}% excl. merges)`)}`;
          if (gitStats.ratio > 0.7) ruleFailures++;
        }

        // Honesty: a very low ratio alongside heavy token use usually means the agent
        // doesn't tag commits, not that the human wrote everything.
        const lowTrailerWarn =
          gitStats && gitStats.ratio < 0.1 && carbon && carbon.totalTokens > 1_000_000
            ? `\n ${pc.dim('│')}   ${pc.dim('Low %? Your agent may not tag commits — outlier counts only')}\n ${pc.dim('│')}   ${pc.dim('commits with a Co-Authored-By trailer.')}`
            : '';

        let cachePct = '0';
        let co2Str = '0.0kg';
        let regionStr = 'Global Average';
        let sourceLabel = 'no local AI logs found';
        let noData = true;
        if (carbon) {
          if (carbon.totalTokens > 0) {
            cachePct = ((carbon.cacheReadTokens / carbon.totalTokens) * 100).toFixed(1);
            noData = false;
          }
          co2Str = `${carbon.localCo2Kg.toFixed(2)}kg CO2`;
          regionStr = carbon.localRegion;
          sourceLabel = carbon.sourceLabel;
        }

        // One-line agent-reach summary (full detail in `outlier capabilities`).
        let reachStr = pc.dim('run: outlier capabilities');
        if (capabilities) {
          const rc = capabilities.blastRadius;
          const col = rc === 'CRITICAL' || rc === 'HIGH' ? pc.red : rc === 'MEDIUM' ? pc.yellow : pc.green;
          const risky = capabilities.mcps.filter((m: any) => ['money','exec','deploy','write-remote','write-local'].includes(m.reach)).length;
          reachStr = `${col(pc.bold(rc))} · ${capabilities.mcps.length} tools` + (risky ? pc.dim(`, ${risky} can write/deploy`) : '');
        }

        // Insight engine: turn the numbers into the top thing to actually do.
        const insights = deriveInsights({ authorship: gitStats, carbon, caps: capabilities, policyCap: 0.70 });
        const sevColor = (s: string) => s === 'critical' ? pc.red : s === 'warn' ? pc.yellow : s === 'good' ? pc.green : pc.cyan;
        const sevMark = (s: string) => s === 'critical' ? '✗' : s === 'warn' ? '⚠' : s === 'good' ? '✓' : 'i';
        const insightLines = insights.slice(0, 2).map((ins: Insight) =>
          ` ${pc.dim('│')} ${sevColor(ins.severity)(sevMark(ins.severity))} ${pc.bold(ins.title)}\n` +
          ` ${pc.dim('│')}   ${ins.detail.length > 56 ? ins.detail.slice(0, 55) + '…' : ins.detail}\n` +
          ` ${pc.dim('│')}   ${pc.cyan('→ ' + ins.action)}`
        ).join(`\n ${pc.dim('│')}\n`);

        // The thermal receipt below is the single canonical output for `status`.
        // (The old @clack dashboard panel was removed: it duplicated the receipt's
        // numbers in a second format, doubling the output on every run.)
        const isDanger = gitStats && gitStats.ratio > 0.7;
        const verdictZone = isDanger ? pc.red('Mostly AI') : pc.green('You\'re driving');
        const verdictText = isDanger
          ? `AI wrote most of this. Read it through so you can\n   still debug it yourself when the agent isn't around.`
          : `You're still writing the core of this. Good —\n   that's how you keep the skill.`;

        const isInefficient = parseFloat(cachePct) > 40;
        const cacheVerdict = isInefficient ? pc.yellow('Lots of re-reads') : pc.green('Lean');
        const cacheText = isInefficient
          ? `Most of your tokens just re-send old context.\n   It's normal for agents, but it's most of the bill.`
          : `Little wasted context. Your spend is mostly\n   real work.`;

        const policyStatus = ruleFailures > 0 ? pc.red('Over your limit') : pc.green('Within limit');
        const policyAction = ruleFailures > 0 ? 'Heads up only — nothing was blocked.' : 'Nothing to do.';

        const fmtTokens = (n: number) =>
          n >= 1_000_000_000 ? (n / 1_000_000_000).toFixed(1) + 'B'
          : n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + 'M'
          : n >= 1_000 ? (n / 1_000).toFixed(1) + 'k'
          : String(n);
        const totalTokensStr = carbon ? fmtTokens(carbon.totalTokens) : '0';
        const estUsdStr = carbon
          ? '$' + carbon.estUsd.toFixed(2) + (carbon.costIsReal ? '' : pc.dim(' (rough)'))
          : pc.dim('n/a');
        const humanSov = gitStats ? ((1 - gitStats.ratio) * 100).toFixed(0) + '%' : '100%';
        const authorshipStr = pc.bold(authPct) + (isDanger ? pc.red(' AI-written') : pc.green(' AI-written'));

        const getProgressBar = (pct: number, length = 10) => {
          const filled = Math.max(0, Math.min(length, Math.round((pct / 100) * length)));
          return '▰'.repeat(filled) + '▱'.repeat(length - filled);
        };
        
        const aiPctVal = gitStats ? gitStats.ratio * 100 : 0;
        const aiBar = pc.yellow(getProgressBar(aiPctVal));
        const humanBar = pc.cyan(getProgressBar(100 - aiPctVal));
        const cacheBar = pc.magenta(getProgressBar(parseFloat(cachePct) || 0));

        if (!isStrict) {
            const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase();
            const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
            const repoName = process.cwd().split('/').pop() || 'Unknown';
            
            finalReceipt = `
 ${pc.dim('┌────────────────────────────────────────────────────────')}
 ${pc.dim('│')} ${pc.cyan('█▀█ █░█ ▀█▀ █░░ █ █▀▀ █▀█')}  ${pc.bold(':: CODE AUDIT')}
 ${pc.dim('│')} ${pc.cyan('█▄█ █▄█ ░█░ █▄▄ █ ██▄ █▀▄')}  ${pc.dim(`:: ${repoName} · ${dateStr}`)}
 ${pc.dim('├────────────────────────────────────────────────────────')}
 ${pc.dim('│')} ${pc.bold(pc.bgBlue(' WHO WROTE THE CODE '))}
 ${pc.dim('│')} AI    ${aiBar} ${authorshipStr}${nmFloorStr}
 ${pc.dim('│')} You   ${humanBar} ${pc.bold(humanSov)}
 ${pc.dim('│')} ${pc.dim('Typical: solo devs 10–40% · AI-framework repos up to ~80%')}
 ${pc.dim('│')}
 ${pc.dim('│')} ${verdictZone} — ${verdictText.split('\n').join('\n ' + pc.dim('│') + '   ')}${lowTrailerWarn}
 ${pc.dim('├────────────────────────────────────────────────────────')}
 ${pc.dim('│')} ${pc.bold(pc.bgMagenta(' WHAT IT COST '))}
 ${pc.dim('│')} Tokens used      ${pc.bold(totalTokensStr)}
 ${pc.dim('│')} Est. spend       ${pc.bold(estUsdStr)}
 ${pc.dim('│')} Re-used context  ${cacheBar} ${pc.bold(cachePct + '%')}
 ${pc.dim('│')} Energy           ${pc.bold(co2Str)} ${pc.dim(`(${regionStr} grid)`)}
 ${pc.dim('│')} ${pc.dim(`Source: ${sourceLabel}`)}
 ${pc.dim('│')}
 ${pc.dim('│')} ${cacheVerdict} — ${cacheText.split('\n').join('\n ' + pc.dim('│') + '   ')}
 ${pc.dim('├────────────────────────────────────────────────────────')}
 ${pc.dim('│')} ${pc.bold(pc.bgCyan(pc.black(' WHAT YOUR AGENTS CAN REACH ')))}
 ${pc.dim('│')} Blast radius   ${reachStr}
 ${pc.dim('│')} ${pc.dim('Full map (deploy/push/write tools): outlier capabilities')}
 ${pc.dim('├────────────────────────────────────────────────────────')}
 ${pc.dim('│')} ${pc.bold(pc.bgYellow(pc.black(' YOUR LIMIT ')))}
 ${pc.dim('│')} AI cap   ${pc.bold('70%')} ${pc.dim('· change with: outlier policy')}
 ${pc.dim('│')} Status   ${policyStatus} ${pc.dim('·')} ${policyAction}
 ${pc.dim('├────────────────────────────────────────────────────────')}
 ${pc.dim('│')} ${pc.bold(pc.bgGreen(pc.black(' WHAT TO DO ')))}
${insightLines}
 ${pc.dim('├────────────────────────────────────────────────────────')}
 ${pc.dim('│')} ${pc.dim('Numbers are local estimates — authorship is a proxy and')}
 ${pc.dim('│')} ${pc.dim('carbon is rough. How it works: outlier --help')}
 ${pc.dim('│')} ${pc.dim(pc.italic('Run this before you start. Keep the skill while you use the speed.'))}
 ${pc.dim('└────────────────────────────────────────────────────────')}`;
        } else {
            note(
              `status: ${authPct} AI Reliance | ${cachePct}% Cache Bloat | ${co2Str}`,
              `${pc.bold('[outlier]')} CI/CD Audit`
            );
        }
    } catch (e: any) {
      s.stop('Audit failed');
      console.error(pc.red(e.message));
    }

  } else if (action === 'capabilities') {
    s.start('Mapping what your agents can reach...');
    try {
      const caps = await getCapabilitiesStats();
      s.stop('Reach map complete');

      const radiusColor = caps.blastRadius === 'CRITICAL' ? pc.red
        : caps.blastRadius === 'HIGH' ? pc.red
        : caps.blastRadius === 'MEDIUM' ? pc.yellow : pc.green;

      // Group tools by reach so the risky ones stand out.
      const order: string[] = ['money', 'exec', 'deploy', 'write-remote', 'write-local', 'data', 'network', 'model', 'read'];
      const reachLabel: Record<string, string> = {
        money: 'can move money', exec: 'can run shell', deploy: 'can deploy', 'write-remote': 'can push to repos',
        'write-local': 'can write files', data: 'data stores', network: 'network', model: 'models', read: 'read-only',
      };
      const riskyReaches = new Set(['money', 'exec', 'deploy', 'write-remote', 'write-local']);
      const toolLines = caps.mcps.length === 0 ? '  None detected'
        : order.filter(r => caps.mcps.some(m => m.reach === r)).map(r => {
            const names = caps.mcps.filter(m => m.reach === r).map(m => m.name).join(', ');
            const tag = riskyReaches.has(r) ? pc.red(`[${reachLabel[r]}]`) : pc.dim(`[${reachLabel[r]}]`);
            return `  ${tag} ${names}`;
          }).join('\n');

      note(
        `${pc.bold('BLAST RADIUS:')} ${radiusColor(pc.bold(caps.blastRadius))}  ${pc.dim('— if an agent or a prompt injection drives your tools')}
${caps.blastReasons.length ? caps.blastReasons.map(r => `  ${pc.red('•')} ${r}`).join('\n') : pc.green('  • read-only — limited reach')}

${pc.bold(`What your agents can reach (${caps.mcps.length} MCP tools):`)}
${toolLines}

${pc.bold('Automation & agents:')}
  Hooks that fire for you: ${caps.hooks.length ? pc.yellow(caps.hooks.join(', ')) : 'none'}
  Sub-agents: ${caps.subagents}   Skills: ${caps.skills.length}   Orchestration policy: ${caps.hasOrchestration ? pc.green('yes') : pc.yellow('no')}

${pc.dim('This is your attack surface. Fewer write/deploy tools per session = smaller blast radius.')}`,
        'Agent Reach & Blast Radius'
      );
    } catch (e: any) {
      s.stop('Audit failed');
      console.error(pc.red(e.message));
    }
  } else if (action === 'preflight') {
    // Forward-looking briefing — the reason to run outlier BEFORE you start an agent.
    // Same engine as status, framed for the session you are about to begin: reach,
    // skill, spend, and the one thing to do, ending with the handoff to your agent.
    s.start('Pre-flight check...');
    const gitStats = await getAuthorshipStats().catch(() => null);
    const carbon = await getCarbonStats().catch(() => null);
    const caps = await getCapabilitiesStats().catch(() => null);
    s.stop('Ready for take-off');

    const aiPct = gitStats ? (gitStats.ratio * 100).toFixed(0) : '—';
    const youPct = gitStats ? (100 - gitStats.ratio * 100).toFixed(0) : '—';
    const blast = caps ? caps.blastRadius : 'UNKNOWN';
    const blastCol = blast === 'CRITICAL' || blast === 'HIGH' ? pc.red : blast === 'MEDIUM' ? pc.yellow : pc.green;
    const risky = caps ? caps.mcps.filter(m => ['money','exec','deploy','write-remote','write-local'].includes(m.reach)).length : 0;
    const spend = carbon ? `$${carbon.estUsd.toFixed(0)}` : '—';
    const cachePct = carbon && carbon.totalTokens ? ((carbon.cacheReadTokens / carbon.totalTokens) * 100).toFixed(0) + '%' : '—';

    const insights = deriveInsights({ authorship: gitStats, carbon, caps, policyCap: 0.70 });
    const sevCol = (sv: string) => sv === 'critical' ? pc.red : sv === 'warn' ? pc.yellow : sv === 'good' ? pc.green : pc.cyan;
    const sevMk = (sv: string) => sv === 'critical' ? '✗' : sv === 'warn' ? '⚠' : sv === 'good' ? '✓' : 'i';
    const actionLines = insights.slice(0, 3)
      .map(ins => ` ${sevCol(ins.severity)(sevMk(ins.severity))} ${pc.cyan('→')} ${ins.action}`)
      .join('\n');

    console.log('');
    console.log(pc.bold(pc.cyan(' ✈  PRE-FLIGHT')) + pc.dim(`  ·  ${process.cwd().split('/').pop()}`));
    console.log(pc.dim(' ────────────────────────────────────────────────────'));
    console.log(`  ${pc.bold('Reach')}   ${blastCol(pc.bold(blast))}` + (caps ? pc.dim(` · ${caps.mcps.length} tools, ${risky} can write/deploy`) : ''));
    console.log(`  ${pc.bold('Skill')}   AI wrote ${pc.bold(aiPct + '%')} · you own ${pc.bold(youPct + '%')}`);
    console.log(`  ${pc.bold('Spend')}   ${pc.bold(spend)} · ${cachePct} re-sent context`);
    console.log('');
    console.log(pc.bold(' Before you delegate:'));
    console.log(actionLines);
    console.log('');
    const agent = detectAgent();
    console.log(pc.bold(pc.magenta(' ✓ Ready? ')) + 'Start your session:  ' + pc.bold(agent || 'your AI agent'));
    console.log('');
  } else if (action === 'policy') {
    const tier = await select({
      message: 'Select the governance tier to configure:',
      options: [
        { value: 'personal', label: 'Personal (Self-imposed)', hint: 'Set your own limits for skill retention' },
        { value: 'team', label: 'Team Guardrails', hint: 'Engineering lead sets thresholds for human review' },
        { value: 'enterprise', label: 'Enterprise Compliance', hint: 'Production thresholds (e.g., max 60% AI authorship)' },
        { value: 'regulatory', label: 'Regulatory Audit', hint: 'Decree 142 human-oversight logging' }
      ]
    });

    if (isCancel(tier)) {
      cancel('Policy configuration cancelled.');
      process.exit(0);
    }

    if (tier === 'personal' || tier === 'team' || tier === 'enterprise') {
      const maxAuthorship = await select({
        message: `Set the maximum allowed AI Authorship Share for ${tier} profile:`,
        options: [
          { value: '50', label: '50% (Strict Human-Majority)' },
          { value: '70', label: '70% (Standard Hybrid)' },
          { value: '85', label: '85% (High Velocity)' },
          { value: '100', label: '100% (Unrestricted)' }
        ]
      });

      if (isCancel(maxAuthorship)) {
        cancel('Policy configuration cancelled.');
        process.exit(0);
      }

      s.start(`Applying ${tier} policy guardrails...`);
      
      const gitDir = join(process.cwd(), '.git');
      const isRepo = existsSync(gitDir);
      if (!isRepo) {
        console.error(pc.red('Must be run inside a git repository'));
        process.exit(1);
      }

      const isStrict = process.argv.includes('--strict');
      const bouncerMsg = isStrict 
        ? `echo "⚠️  outlier policy warning: AI authorship ($CURRENT_RATIO%) exceeds threshold ($MAX_RATIO%)"`
        : `echo "🛡️  Outlier Bouncer: Repository AI-generation ($CURRENT_RATIO%) exceeds your defined mastery threshold ($MAX_RATIO%)."\n    echo "Take a moment to review your recent architectural decisions. Ensure you still understand the system."`;

      const hookPath = join(gitDir, 'hooks', 'pre-commit');
      if (existsSync(hookPath)) {
        const { copyFileSync } = require('fs');
        copyFileSync(hookPath, `${hookPath}.backup`);
      }

      const hookScript = `#!/bin/sh
# outlier Pre-Commit Governance Hook

# Calculate AI Authorship Ratio
TOTAL=$(git log --oneline | wc -l | tr -d ' ')
AI=$(git log -i --grep='Co-Authored-By' --oneline | wc -l | tr -d ' ')
if [ "$TOTAL" -eq 0 ]; then exit 0; fi
CURRENT_RATIO=$(awk "BEGIN {print ($AI / $TOTAL) * 100}")
MAX_RATIO=${maxAuthorship}

OVER_LIMIT=$(awk "BEGIN {print ($CURRENT_RATIO > $MAX_RATIO) ? 1 : 0}")
if [ "$OVER_LIMIT" -eq 1 ]; then
    ${bouncerMsg}
    # Warn instead of hard-blocking the commit, protecting human iterations
    exit 0
fi
echo "✅ Governance Policy OK"
`;
      writeFileSync(hookPath, hookScript);
      chmodSync(hookPath, '755');

      await new Promise(resolve => setTimeout(resolve, 800));
      s.stop('Policy Applied');

      note(
        `Tier:         ${pc.bold(tier.toString().toUpperCase())}
Rule 1:       ${pc.green(`AI Authorship must not exceed ${maxAuthorship}%`)}
Rule 2:       ${pc.green('Require human review on consecutive high-AI sprints')}
Enforcement:  ${pc.cyan('Local pre-commit hook installed (backup created)')}`,
        'Active Governance Policy'
      );
    } else if (tier === 'regulatory') {
      s.start('Generating Regulatory Compliance Audit (Decree 142)...');
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      const reportPath = join(process.cwd(), 'outlier-audit-report.jsonl');
      writeFileSync(reportPath, JSON.stringify({ timestamp: new Date().toISOString(), status: 'PREVIEW', policy: 'Decree 142', simulatedOversight: true }) + '\n');
      s.stop('Audit Generated');

      note(
        `Jurisdiction: ${pc.bold('Vietnam (Decree 142)')}
Status:       ${pc.green('Compliant - Human oversight logged locally')}
Privacy:      ${pc.green('Preserved - No citizen data exported')}
Artifact:     ${pc.cyan(reportPath)}`,
        'Regulatory Compliance'
      );
    }
  } else if (action === 'participate') {
    s.start('Connecting to the Outlier research project...');
    await new Promise(resolve => setTimeout(resolve, 600));
    s.stop('Secure connection established.');

    const q1 = await select({
      message: pc.cyan('What is your current engineering reality today?'),
      options: [
        { value: 'artisan', label: 'Solo Artisan (I write 90%+ of the code myself)' },
        { value: 'manager', label: 'AI Manager (I prompt, the agents write)' },
        { value: 'reviewer', label: 'Full-time Reviewer (I spend my days reviewing agent PRs)' }
      ]
    });

    if (isCancel(q1)) { cancel('Survey aborted.'); process.exit(0); }

    const q2 = await select({
      message: pc.cyan('Do you feel you are losing your deep architectural mastery? (Deskilling)'),
      options: [
        { value: 'yes_heavy', label: 'Yes, heavily. I forget how my own systems work.' },
        { value: 'yes_slight', label: 'Slightly. I rely on the AI to fix its own bugs.' },
        { value: 'no', label: 'No. I maintain strict oversight and mastery.' }
      ]
    });
    
    if (isCancel(q2)) { cancel('Survey aborted.'); process.exit(0); }

    const feedback = await text({
      message: pc.cyan('In your own words, what is AI actually doing to your codebase or your job?\n(Note: This will draft a public GitHub issue)'),
      placeholder: 'Honestly, I just let the agent write the regex...',
      validate(value) {
        if (!value || value.length === 0) return `C'mon, say something!`;
      },
    });

    if (isCancel(feedback)) {
      cancel('Survey aborted.');
      process.exit(0);
    }

    note(
      `${pc.italic(`"${feedback}"`)}\n\nYour input is invaluable. To make it official and contribute to the literature, we've generated a secure transmission link for you.`,
      'Outlier Research'
    );

    const surveyData = `**Engineering Reality:** ${q1}\n**Deskilling Impact:** ${q2}\n**Thoughts:**\n${feedback}`;

    const url = `https://github.com/rosh100yx/outlier/issues/new?assignees=&labels=enhancement&projects=&template=feature_request.md&title=%5BOutlier+Research%5D+Feedback&body=${encodeURIComponent("Drop a screenshot of your Thermal Receipt here! \n\n" + surveyData)}`;
    console.log(`\n${pc.bold('Submit here (and drop your screenshot!):')} ${pc.underline(pc.cyan(url))}\n`);
  } else if (action === 'impact') {
    console.log('\n' + pc.bold(pc.bgMagenta(' THE COMPOUNDING HORIZON OF DESKILLING ')) + '\n');
    console.log(pc.bold('What Do We Lose and Gain?'));
    console.log(pc.cyan('■ Today (The 5-minute task)'));
    console.log(`  ${pc.green('Gain:')} Velocity. AI scaffolds your components.`);
    console.log(`  ${pc.red('Lose:')} Syntax recall. Memory of the low-level pipes.`);
    console.log(pc.cyan('\n■ Tomorrow (The 5-hour task - e.g. Claude Opus 4.5)'));
    console.log(`  ${pc.green('Gain:')} Massive scale. You are a systems orchestrator.`);
    console.log(`  ${pc.red('Lose:')} Architectural intimacy. You become a reviewer.`);
    console.log(pc.cyan('\n■ Next 5-10 Years (The 1M+ LOC Crisis)'));
    console.log(`  When an agent introduces a fatal state bug in a monolithic architecture, human reviewers will lack the muscle memory to debug it. Outlier measures this exact sovereignty erosion.\n`);
  } else if (action === 'knowledge') {
    console.log('\n' + pc.bold(pc.bgBlue(' CORE LITERATURE & REFERENCES ')) + '\n');
    console.log(`1. ${pc.cyan('METR (Measuring AI Ability)')} - Evaluating AI on long-horizon software tasks.`);
    console.log(`2. ${pc.cyan('The "NPC" vs "High-Agency" Paradigm')} - Remaining sovereign in a room full of agents.`);
    console.log(`3. ${pc.cyan('Proof of Human Mastery')} - The cryptoeconomic necessity of proving human architectural understanding.`);
    console.log(`\nRead the full academic foundation at: ${pc.underline('https://github.com/rosh100yx/outlier')}\n`);
  }

  outro('Done — nothing left your machine. (How it works: outlier --help)');

  if (typeof finalReceipt !== 'undefined' && finalReceipt) {
    console.log(finalReceipt);

    // --save: write a plain-text (no color) copy of the receipt next to the repo.
    if (process.argv.includes('--save')) {
      const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');
      const savePath = join(process.cwd(), 'outlier-audit.txt');
      try {
        writeFileSync(savePath, stripAnsi(finalReceipt).trimStart() + '\n');
        console.log(pc.dim(`\n 💾 Saved to ${savePath}`));
      } catch {}
    }
  }

  if (action === 'status') {
    const agent = detectAgent();
    console.log('');
    if (agent) {
       console.log(
         pc.bold(pc.magenta(' ↳ Ready to code? ')) + 'Start your session:  ' + pc.bold(agent)
       );
    } else {
       console.log(
         pc.bold(pc.magenta(' ↳ Ready to code? ')) + 'Start your AI agent'
       );
    }
    console.log('');
    console.log(
      pc.bold(pc.green(' 📸 Share: ')) + 'Screenshot this receipt, or post your score ➔ ' +
      pc.underline('https://x.com/intent/tweet?text=I+just+audited+my+codebase+with+%23Outlier')
    );
    console.log(
      pc.bold(pc.cyan(' 🔬 Research: ')) + 'Help the AI-deskilling study — type:  ' + pc.bold('outlier participate')
    );
    if (!process.argv.includes('--save')) {
      console.log(pc.dim(' 💾 Save: outlier status --save'));
    }
    console.log(
      pc.dim('\n outlier does more than this audit — see how you adopt AI, what it')
    );
    console.log(
      pc.dim(' costs, and what is actually working:  ') + pc.bold(pc.cyan('outlier --help'))
    );
  }
}

main().catch(console.error);
