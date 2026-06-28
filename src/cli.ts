#!/usr/bin/env node
import os from 'os';
import { intro, outro, select, spinner, isCancel, cancel, note, text, confirm } from '@clack/prompts';
import pc from 'picocolors';
import { getAuthorshipStats } from './git';
import { getCarbonStats } from './carbon';
import { getCapabilitiesStats } from './capabilities';
import { runWrap, runStart, runStop, watchStatus } from './observe';
import { writeFileSync, readFileSync, chmodSync, existsSync } from 'fs';
import { join } from 'path';
import { CMD, readConfig, writeConfig, configuredCap } from './shared';
import { COMMANDS } from './registry';

const ASCII_LOGO = `
   ____  _   _ _____ _     ___ _____ ____
  / __ \| | | |_   _| |   |_ _|  ___|  _ \\
 | |  | | | | | | | | |    | || |__ | |_) |
 | |  | | |_| | | | | |___ | ||  __||  _ <
 | |__| |  _  | | | |  _  || || |___| | \\ \\
  \____/|_| |_| |_| |_| |_|___|_____|_|  \\_\\
`;

async function emitJson(sinceRef?: string): Promise<void> {
  const pkg = require('../package.json');
  const [gitStats, carbon, caps] = await Promise.all([
    getAuthorshipStats().catch(() => null),
    getCarbonStats().catch(() => null),
    getCapabilitiesStats().catch(() => null),
  ]);

  const aiRatio = gitStats ? gitStats.ratio : 0;
  const cap = configuredCap() / 100;
  const tok = require('./agentic').getTokenAuthorship(process.cwd());
  const contrib = require('./contribution').buildContribution(gitStats, process.cwd(), sinceRef);
  const writeOrDeploy = caps ? caps.mcps.filter((m: any) => m.reach === 'write' || m.reach === 'deploy').length : 0;

  const out: any = {
    tool: 'outlier',
    version: pkg.version,
    localFirst: true,
    timestamp: new Date().toISOString(),
    repo: process.cwd().split('/').pop(),
    authorship: gitStats ? {
      byTokens: tok.found ? {
        aiPercent: tok.aiPercent,
        aiOutputTokens: tok.aiOutputTokens,
        humanPromptTokens: tok.humanPromptTokens,
        sessions: tok.sessions,
      } : null,
      contribution: {
        label: contrib.label,
        judgment: contrib.judgment,
        execution: contrib.execution,
        intent: contrib.intent,
        oversight: contrib.oversight,
        blindSpots: contrib.blindSpots,
      },
      aiPercent: +(gitStats.ratio * 100).toFixed(1),
      provenance: 'proxy',
      note: 'commit tags are a weak proxy; byTokens + contribution reflect real agentic authorship when session logs exist',
    } : null,
    cost: carbon ? {
      totalTokens: carbon.totalTokens,
      newTokens: Math.max(0, carbon.totalTokens - carbon.cacheReadTokens),
      reReadTokens: carbon.cacheReadTokens,
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
      toolsUsed: caps.mcpsObserved,
      toolsLatent: caps.mcpsLatent,
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
    insights: require('./insights').deriveInsights({ authorship: gitStats, carbon, caps, policyCap: cap }),
    economics: require('./economics').projectEconomics({ aiRatio, estUsdSession: carbon ? carbon.estUsd : 0, teamSize: 1 }),
  };

  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

async function runOnboarding(): Promise<void> {
  console.log(pc.cyan(ASCII_LOGO));
  intro(pc.inverse(' outlier: Welcome '));

  note(
    `${pc.bold('The human stays the author of their own judgment.')}
Agents are leverage, not a replacement for understanding. Speed is welcome;
losing the ability to debug what you ship is not.

  ${pc.cyan('1.')} Keep the skill while you use the speed.
  ${pc.cyan('2.')} Measure honestly — abstain when blind, never fake a number.
  ${pc.cyan('3.')} Your machine, your data — governance is local, not surveillance.`,
    'What Outlier stands for'
  );

  note(
    `As agents write more of our code, we lose visibility into:
1. Deskilling Risk (Are we becoming spectators in our own codebase?)
2. Carbon Cost (What is the true regional energy cost of token caching?)
3. Capability Drift (What hidden tools & skills can our agents reach?)`,
    'The Problem: AI Safety in Development'
  );

  note(
    `Outlier operates entirely on your machine.
- Local Only: No API keys. No cloud telemetry. No data leaves your machine.
- Native Auditing: We read your local \`~/.claude\` logs and \`.git/\` commit history.
- Actionable Policies: Enforce rules locally via terminal or Git hooks.`,
    'Privacy & Zero-Trust Principles'
  );

  const tier = await select({
    message: 'Set your governance framework. Who is this cap for?',
    options: [
      { value: 'personal',   label: 'Personal',   hint: 'self-imposed limit for skill retention' },
      { value: 'team',       label: 'Team',       hint: 'a lead sets the human-review threshold' },
      { value: 'enterprise', label: 'Enterprise', hint: 'production compliance threshold' },
    ],
  });
  if (isCancel(tier)) { cancel('Onboarding paused. Run outlier again when you are ready.'); process.exit(0); }

  const cap = await select({
    message: 'Maximum AI-authorship share you want to allow before outlier flags a review:',
    options: [
      { value: '50',  label: '50% — Strict human-majority' },
      { value: '70',  label: '70% — Standard hybrid (recommended)', hint: 'balanced' },
      { value: '85',  label: '85% — High velocity' },
      { value: '100', label: '100% — Unrestricted (measure only)' },
    ],
    initialValue: '70',
  });
  if (isCancel(cap)) { cancel('Onboarding paused. Run outlier again when you are ready.'); process.exit(0); }

  writeConfig({
    onboarded: true,
    date: new Date().toISOString(),
    governance: { tier: String(tier), capPercent: parseInt(String(cap), 10) },
  });

  note(
    `Framework set: ${pc.bold(String(tier))} · cap ${pc.bold(cap + '%')} AI authorship.\noutlier will flag (never block) when you cross it. Change it anytime: ${pc.cyan(CMD + ' policy')}.`,
    'Governance framework saved'
  );

  const ready = await confirm({
    message: 'Run your first Governance Audit and generate your Thermal Receipt now?',
    initialValue: true,
  });
  if (isCancel(ready) || !ready) {
    cancel('Onboarding paused. Run outlier again when you are ready.');
    process.exit(0);
  }
}

async function main() {
  let action = process.argv[2] as string | undefined;

  // 1. Daily greeting (Claude Code SessionStart hook)
  if (action === 'daily-greeting') {
    const configPath = join(os.homedir(), '.outlier_config');
    const today = new Date().toISOString().split('T')[0];
    let alreadyRun = false;
    if (existsSync(configPath)) {
      try {
        const cfg = JSON.parse(readFileSync(configPath, 'utf8'));
        if (cfg.lastGreetingDate === today) alreadyRun = true;
        else { cfg.lastGreetingDate = today; writeFileSync(configPath, JSON.stringify(cfg)); }
      } catch (e) {}
    }
    if (alreadyRun) process.exit(0);
    const g = await getAuthorshipStats().catch(() => null);
    const cp = await getCapabilitiesStats().catch(() => null);
    const aiP = g ? (g.ratio * 100).toFixed(0) + '%' : '—';
    const br = cp ? cp.blastRadius : '—';
    const brc = br === 'HIGH' || br === 'CRITICAL' ? pc.red : br === 'MEDIUM' ? pc.yellow : pc.green;
    console.log(`${pc.dim('[outlier]')} AI authorship ${pc.bold(aiP)} · agent reach ${brc(pc.bold(br))} ${pc.dim('· before you delegate, run:  preflight')}`);
    process.exit(0);
  }

  // 2. Watch wrap mode (spawns agent as child)
  if (action === 'watch') {
    const dd = process.argv.indexOf('--');
    if (dd !== -1 && process.argv.length > dd + 1) {
      const cmd = process.argv.slice(dd + 1);
      console.log(pc.dim(`[outlier] observing this session — running: ${cmd.join(' ')}\n`));
      const r = runWrap(cmd);
      console.log(pc.green(`\n[outlier] ✓ observed ${pc.bold(String(r.added))} lines your agent (${r.tool}) wrote across ${r.files} file${r.files === 1 ? '' : 's'}.`));
      console.log(pc.dim(`Now run  ${CMD} status  — execution counts this session, no Claude logs needed.`));
      process.exit(0);
    }
  }

  // 3. JSON contract for CI / agents / swarms
  if (process.argv.includes('--json')) {
    const sinceIdx = process.argv.indexOf('--since');
    const sinceRef = sinceIdx !== -1 ? process.argv[sinceIdx + 1] : undefined;
    await emitJson(sinceRef);
    process.exit(0);
  }

  // 4. Help
  if (action === '--help' || action === '-h' || action === 'help') {
    console.log(pc.bold('\nWHAT OUTLIER DOES'));
    console.log(pc.dim('  Reads your local git history and AI logs — on your machine — to show'));
    console.log(pc.dim('  how much of your code AI wrote, what it cost, and how to keep your skill.\n'));
    console.log(pc.bold('COMMANDS:'));
    console.log(`  ${pc.cyan(CMD)}              Run the audit, then a guided menu`);
    if (CMD !== 'outlier') console.log(pc.dim(`  (you ran via npx; tip: 'npm i -g outlier-audit' to get the short 'outlier' command)\n`));
    console.log(`  ${pc.cyan(CMD + ' preflight')}    Quick briefing BEFORE you start an agent`);
    console.log(`  ${pc.cyan(CMD + ' status')}       Full audit: who wrote the code, what it cost`);
    console.log(`  ${pc.cyan(CMD + ' status --save')} Save the audit to ./outlier-audit.txt`);
    console.log(`  ${pc.cyan(CMD + ' --json')}       Machine-readable audit (for agents, CI)`);
    console.log(`  ${pc.cyan(CMD + ' authorship')}   Just the AI-vs-human commit breakdown`);
    console.log(`  ${pc.cyan(CMD + ' carbon')}       Just the token spend, cache waste & carbon`);
    console.log(`  ${pc.cyan(CMD + ' contributors')} Non-code contribution points (docs/research)`);
    console.log(`  ${pc.cyan(CMD + ' capabilities')} What tools & skills your agents can reach`);
    console.log(`  ${pc.cyan(CMD + ' learn')}        Turn what the AI wrote into a skill you understand`);
    console.log(`  ${pc.cyan(CMD + ' watch -- <cmd>')} Observe any agent by its file changes`);
    console.log(`  ${pc.cyan(CMD + ' policy')}       Set an AI-authorship limit (local git hook)`);
    console.log(`  ${pc.cyan(CMD + ' impact')}       What AI reliance compounds to over time`);
    console.log(`  ${pc.cyan(CMD + ' participate')}  Share feedback for the study`);
    console.log(`  ${pc.cyan(CMD + ' init')}         Add a once-per-day greeting to your shell rc`);
    console.log(`  ${pc.cyan(CMD + ' uninit')}       Remove that greeting`);
    console.log('\n' + pc.dim('Local-first: nothing ever leaves your machine.'));
    console.log(pc.dim('How it works → https://github.com/rosh100yx/outlier#how-it-works'));
    if (process.stdout.isTTY) {
      console.log('');
      const { select } = require('@clack/prompts');
      while (true) {
        const choice = await select({
          message: 'What next?',
          options: [
            { value: 'status', label: 'Run full audit', hint: '' },
            { value: 'preflight', label: 'Pre-flight briefing', hint: '' },
            { value: 'capabilities', label: 'Agent reach', hint: '' },
            { value: 'policy', label: 'Set a limit', hint: '' },
            { value: 'learn', label: 'Learn a skill', hint: '' },
            { value: 'impact', label: 'Impact over time', hint: '' },
            { value: 'exit', label: 'Exit', hint: '' },
          ],
        });
        if (typeof choice === 'symbol' || choice === 'exit') break;
        const { spawnSync } = require('child_process');
        spawnSync(process.argv[0], [process.argv[1], String(choice)], { stdio: 'inherit' });
        console.log('');
      }
    }
    process.exit(0);
  }

  // 5. Onboarding (first run, no config)
  const configPath = join(os.homedir(), '.outlier_config');
  if (!existsSync(configPath) && !action) {
    if (process.stdin.isTTY) {
      await runOnboarding();
    } else {
      try { writeFileSync(configPath, JSON.stringify({ onboarded: true, date: new Date().toISOString() })); } catch {}
    }
    action = 'status';
  }

  // 6. Default bare interactive → status
  if (!action) {
    action = 'status';
  }

  // 7. Registry dispatch
  const fn = COMMANDS[action];
  if (fn) {
    await fn(process.argv.slice(2));
  } else {
    console.log(pc.red(`Unknown command: ${action}`));
    console.log(pc.dim(`Run  ${CMD} --help  for available commands.`));
    process.exit(1);
  }
}

main().catch(e => {
  console.error(pc.red('Fatal: ' + (e instanceof Error ? e.message : String(e))));
  process.exit(1);
});
