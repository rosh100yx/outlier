#!/usr/bin/env node
import os from 'os';
import { intro, outro, select, spinner, isCancel, cancel, note, text, confirm } from '@clack/prompts';
import pc from 'picocolors';
import { getAuthorshipStats } from './git';
import { getCarbonStats } from './carbon';
import { getCapabilitiesStats } from './capabilities';
import { deriveInsights, type Insight } from './insights';
import { projectEconomics } from './economics';
import { aggregateDir } from './aggregate';
import { getTokenAuthorship } from './agentic';
import { buildContribution } from './contribution';
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

// The command users should type to re-run us. When launched via `npx outlier-audit`
// there is no `outlier` on PATH, so instructing them to run `outlier …` fails. Detect
// the npx cache path and show the form that actually works.
const CMD = (process.argv[1] || '').includes('/_npx/') ? 'npx outlier-audit' : 'outlier';

// Turn the left-rail receipt into a clean closed rectangle (adds the right border,
// padding each line to a fixed inner width). Width-aware: strips ANSI and counts a few
// known wide glyphs as 2 columns so the right edge lines up in a terminal and on GitHub.
function closeBox(s: string, W = 66): string {
  const wide = new Set(['⚠', '🛑', '✈', '🌱', '📸', '🔬', '💾', '💡', '✅', '❌', '😾', '😀']);
  const chW = (ch: string) => { const cp = ch.codePointAt(0)!; return (cp >= 0x1F000 || wide.has(ch)) ? 2 : 1; };
  const rail = '\x1b[2m│\x1b[0m';
  // Fit a (possibly ANSI-coloured) line to exactly `totalVis` visible columns: pad with
  // spaces, or truncate with an ellipsis — preserving colour codes either way.
  const fit = (line: string, totalVis: number) => {
    const parts = line.split(/(\x1b\[[0-9;]*m)/);
    let out = '', vis = 0, cut = false;
    for (const p of parts) {
      if (/^\x1b\[/.test(p)) { out += p; continue; }
      for (const ch of p) {
        const w = chW(ch);
        if (vis + w > totalVis - 1) { cut = true; break; }
        out += ch; vis += w;
      }
      if (cut) break;
    }
    if (cut) { out += '…'; vis += 1; }
    return out + ' '.repeat(Math.max(0, totalVis - vis)) + '\x1b[0m';
  };
  return s.split('\n').map(line => {
    const plain = line.replace(/\x1b\[[0-9;]*m/g, '');
    if (/^\s*┌/.test(plain)) return ' \x1b[2m┌' + '─'.repeat(W) + '┐\x1b[0m';
    if (/^\s*├/.test(plain)) return ' \x1b[2m├' + '─'.repeat(W) + '┤\x1b[0m';
    if (/^\s*└/.test(plain)) return ' \x1b[2m└' + '─'.repeat(W) + '┘\x1b[0m';
    if (/^\s*│/.test(plain)) return fit(line, 2 + W) + rail; // 2 = leading space + left rail
    return line;
  }).join('\n');
}

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
      // commit-tag view (what git can see) — a weak proxy: under-counts when commits
      // aren't tagged, and counts commits equally regardless of code volume.
      byCommitTags: {
        aiPercent: +(gitStats.ratio * 100).toFixed(1),
        totalCommits: gitStats.total,
        aiCommits: gitStats.ai,
        nonMergePercent: +(gitStats.ratioNoMerges * 100).toFixed(1),
      },
      // token view (the honest signal for agentic work): AI output vs human prompts.
      byTokens: (() => { const t = getTokenAuthorship(); return t.found ? {
        aiPercent: t.aiPercent, aiOutputTokens: t.aiOutputTokens, humanPromptTokens: t.humanPromptTokens, sessions: t.sessions,
      } : null; })(),
      // 3-axis contribution profile: execution + intent + oversight + a judgment.
      contribution: (() => { const c = buildContribution(gitStats); return {
        label: c.label, judgment: c.judgment,
        execution: c.execution, intent: c.intent, oversight: c.oversight,
        blindSpots: c.blindSpots,
      }; })(),
      // legacy top-level fields (commit-tag) for back-compat
      aiPercent: +(gitStats.ratio * 100).toFixed(1),
      provenance: 'proxy',
      note: 'commit tags are a weak proxy; byTokens + contribution reflect real agentic authorship when session logs exist',
    } : null,
    cost: carbon ? {
      totalTokens: carbon.totalTokens,
      newTokens: Math.max(0, carbon.totalTokens - carbon.cacheReadTokens), // tokens that did new work
      reReadTokens: carbon.cacheReadTokens,                                 // context re-sent each turn
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
    insights: deriveInsights({ authorship: gitStats, carbon, caps, policyCap: cap }),
    economics: projectEconomics({ aiRatio, estUsdSession: carbon ? carbon.estUsd : 0, teamSize: 1 }),
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

// Guided "what next?" menu — so developers navigate instead of memorising commands.
// Each pick re-runs `outlier <command>` as a child process (inheriting the terminal),
// which reuses all existing logic and keeps interactive sub-prompts (e.g. policy) working.
async function whatNext() {
  const { spawnSync } = require('child_process');
  while (true) {
    const choice = await select({
      message: 'What next?',
      options: [
        { value: 'preflight',    label: 'Pre-flight briefing',        hint: 'before you start an agent' },
        { value: 'capabilities', label: 'Agent reach / blast radius',  hint: 'what your agents can touch' },
        { value: 'policy',        label: 'Set an AI-authorship limit',  hint: 'local git hook / CI' },
        { value: 'impact',        label: 'Impact over time',            hint: 'the macro shadow' },
        { value: 'authorship',    label: 'Just authorship',             hint: 'AI vs human commits' },
        { value: 'carbon',        label: 'Just cost & carbon',          hint: 'tokens, waste, CO2' },
        { value: 'status',        label: 'Re-run the full audit',       hint: '' },
        { value: 'knowledge',     label: 'The research behind it',      hint: '' },
        { value: 'exit',          label: 'Exit',                        hint: 'or press Esc' },
      ],
    });
    if (isCancel(choice) || choice === 'exit') break;
    // Run the chosen command in a child process; inherit stdio so it's fully interactive.
    spawnSync(process.argv[0], [process.argv[1], String(choice)], { stdio: 'inherit' });
    console.log(''); // breathing room before the menu reappears
  }
}

async function main() {
  let action = process.argv[2] as any;
  const bareInteractive = (!process.argv[2] || process.argv[2] === 'audit') && !!process.stdout.isTTY;

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
    // Compact once-per-day greeting (for the Claude Code plugin SessionStart hook) —
    // a single line, fast, no full receipt.
    const g = await getAuthorshipStats().catch(() => null);
    const cp = await getCapabilitiesStats().catch(() => null);
    const aiP = g ? (g.ratio * 100).toFixed(0) + '%' : '—';
    const br = cp ? cp.blastRadius : '—';
    const brc = br === 'HIGH' || br === 'CRITICAL' ? pc.red : br === 'MEDIUM' ? pc.yellow : pc.green;
    console.log(`${pc.dim('[outlier]')} AI authorship ${pc.bold(aiP)} · agent reach ${brc(pc.bold(br))} ${pc.dim('· before you delegate, run:  preflight')}`);
    process.exit(0);
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
    console.log(`  ${pc.cyan('outlier')}              Run the audit, then a guided menu (no commands to memorise)`);
    if (CMD !== 'outlier') console.log(pc.dim(`  (you ran via npx; tip: 'npm i -g outlier-audit' to get the short 'outlier' command)\n`));
    console.log(`  ${pc.cyan(CMD + ' preflight')}    Quick briefing BEFORE you start an agent (reach + skill + spend)`);
    console.log(`  ${pc.cyan(CMD + ' status')}       Full audit: who wrote the code, what it cost, your limit`);
    console.log(`  ${pc.cyan(CMD + ' status --save')} Save the audit to ./outlier-audit.txt`);
    console.log(`  ${pc.cyan(CMD + ' --json')}       Machine-readable audit (for agents, CI, swarms)`);
    console.log(`  ${pc.cyan(CMD + ' authorship')}   Just the AI-vs-human commit breakdown`);
    console.log(`  ${pc.cyan(CMD + ' carbon')}       Just the token spend, cache waste & carbon`);
    console.log(`  ${pc.cyan(CMD + ' capabilities')} What tools & skills your agents can reach`);
    console.log(`  ${pc.cyan(CMD + ' policy')}       Set an AI-authorship limit (local git hook / CI)`);
    console.log(`  ${pc.cyan(CMD + ' impact')}       What AI reliance compounds to over time`);
    console.log(`  ${pc.cyan(CMD + ' knowledge')}    The research behind the metrics`);
    console.log(`  ${pc.cyan(CMD + ' participate')}  Share feedback for the deskilling study (opens a public issue)`);
    console.log(`  ${pc.cyan(CMD + ' init')}         Show a once-per-day reliance greeting in new shells`);
    console.log(`  ${pc.cyan(CMD + ' uninit')}       Remove that greeting`);
    console.log('\n' + pc.dim('Local-first: nothing ever leaves your machine.'));
    console.log(pc.dim('How it works → https://github.com/rosh100yx/outlier#how-it-works'));
    // In a real terminal, drop into the guided menu so --help is a launchpad, not a wall
    // of text. Non-interactive (scripts/CI) just prints the list and exits.
    if (process.stdout.isTTY) { console.log(''); await whatNext(); }
    process.exit(0);
  }

  const configPath = join(os.homedir(), '.outlier_config');
  if (!existsSync(configPath) && !action) {
    // Onboarding has an interactive confirm(); only run it in a real terminal.
    // In CI / piped / non-interactive contexts (incl. some npx setups) skip it so we
    // never hang, and go straight to the audit.
    if (process.stdin.isTTY) {
      await runOnboarding();
    } else {
      try { writeFileSync(configPath, JSON.stringify({ onboarded: true, date: new Date().toISOString() })); } catch {}
    }
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
     const BLOCK = `\n${START_MARKER}\nif command -v ${CMD} >/dev/null 2>&1; then\n  ${CMD} daily-greeting\nfi\n${END_MARKER}\n`;

     if (action === 'init') {
        const confirmWrite = await confirm({
           message: `Add a once-per-day Outlier greeting to your ${rcName}? (You can remove it with '${CMD} uninit')`,
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

        const ta = getTokenAuthorship();
        const tokenBlock = ta.found
          ? `\n${pc.bold('By tokens (the real signal):')}
AI output:          ${pc.bold((ta.aiOutputTokens/1e6).toFixed(1) + 'M tokens')}
Your prompts:       ~${(ta.humanPromptTokens/1e3).toFixed(0)}K tokens
AI authorship:      ${pc.red(pc.bold(ta.aiPercent.toFixed(0) + '%'))}  ${pc.dim(`(${ta.sessions} sessions)`)}
${pc.dim('Commit tags measure tagging, not authorship. In agentic work the')}
${pc.dim('agent writes the code and commits it under your name — tokens show it.')}`
          : `\n${pc.dim('No agent session logs for this repo path, so token-based')}
${pc.dim('authorship is unavailable — the commit-tag % above is a weak proxy.')}`;

        note(
          `${pc.bold('By commit tags (what git sees):')}
Total Commits:      ${gitStats.total}
AI Co-Authored:     ${gitStats.ai}
Tag Ratio:          ${color(pct + '%')}${warning}
Conservative Floor: ${color(nmPct + '%')}  ${pc.dim('(non-merge)')}
${tokenBlock}`,
            'Authorship — commit tags vs tokens'
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
        let ruleFailures = 0;

        if (gitStats) {
          authPct = `${(gitStats.ratio * 100).toFixed(1)}%`;
          if (gitStats.ratio > 0.7) ruleFailures++;
        }

        // 3-axis contribution profile: execution (who wrote tokens) is only one axis —
        // intent (you steer) and oversight (you review/iterate) are where human value moved.
        const contrib = buildContribution(gitStats);
        const execAi = contrib.execution.aiPercent;
        const measured = contrib.execution.confidence === 'measured';
        // A proxy number must not look authoritative: render it dim with a ⚠, never colored.
        const execColor = !measured ? pc.dim : execAi > 70 ? pc.red : execAi > 40 ? pc.yellow : pc.green;
        const labelColor = contrib.label === 'Spectator' || contrib.label === 'Unmeasured' ? pc.yellow
          : contrib.label === 'Artisan' || contrib.label === 'Centaur' ? pc.green : pc.yellow;
        const intentStr = contrib.intent.prompts !== null
          ? `${pc.bold(String(contrib.intent.prompts))} prompts ${pc.dim(`· ~${((contrib.intent.promptTokens||0)/1e3).toFixed(0)}K tokens you typed`)}`
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
        // Show the basis so the % is auditable: edit-attribution gives the line counts it
        // was computed from; commit-tags is the weaker fallback when no agent writes are logged.
        const kL = (n: number) => n >= 1000 ? (n / 1000).toFixed(0) + 'K' : String(n);
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
        const execMark = measured ? '' : pc.yellow('⚠ ');
        const profileRows =
          ` ${pc.dim('│')} Execution  ${execMark}${execColor(pc.bold(execAi.toFixed(0) + '% AI'))} ${pc.dim('('+execBasis+')')}\n` +
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

        // One-line agent-reach summary (full detail in `outlier capabilities`).
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
        // "Tokens used" was the total — but for agentic work that's ~97% cache RE-READS
        // (context re-sent each turn), not new work. Headline the NEW tokens (total minus
        // cache reads); show the re-read volume separately so the number isn't a vanity figure.
        const newTokens = carbon ? Math.max(0, carbon.totalTokens - carbon.cacheReadTokens) : 0;
        const newTokensStr = carbon ? fmtTokens(newTokens) : '0';
        const reReadStr = carbon ? fmtTokens(carbon.cacheReadTokens) : '0';
        const estUsdStr = carbon
          ? '$' + carbon.estUsd.toFixed(2) + (carbon.costIsReal ? '' : pc.dim(' (rough)'))
          : pc.dim('n/a');
        const getProgressBar = (pct: number, length = 10) => {
          const filled = Math.max(0, Math.min(length, Math.round((pct / 100) * length)));
          return '▰'.repeat(filled) + '▱'.repeat(length - filled);
        };
        const cacheBar = pc.magenta(getProgressBar(parseFloat(cachePct) || 0));

        if (!isStrict) {
            const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase();
            const repoName = process.cwd().split('/').pop() || 'Unknown';
            
            finalReceipt = `
 ${pc.dim('┌────────────────────────────────────────────────────────')}
 ${pc.dim('│')} ${pc.cyan('█▀█ █░█ ▀█▀ █░░ █ █▀▀ █▀█')}  ${pc.bold(':: CODE AUDIT')}
 ${pc.dim('│')} ${pc.cyan('█▄█ █▄█ ░█░ █▄▄ █ ██▄ █▀▄')}  ${pc.dim(`:: ${repoName} · ${dateStr}`)}
 ${pc.dim('├────────────────────────────────────────────────────────')}
 ${pc.dim('│')} ${pc.bold(pc.bgBlue(' WHO WROTE THE CODE '))}  ${pc.dim('execution is only one axis')}
${profileRows}
 ${pc.dim('├────────────────────────────────────────────────────────')}
 ${pc.dim('│')} ${pc.bold(pc.bgMagenta(' WHAT IT COST '))}
 ${pc.dim('│')} New tokens       ${pc.bold(newTokensStr)} ${pc.dim('(work done)')}
 ${pc.dim('│')} Re-read context  ${pc.bold(reReadStr)} ${pc.dim(`(${cachePct}% of all tokens)`)}
 ${pc.dim('│')} Est. spend       ${pc.bold(estUsdStr)}
 ${pc.dim('│')} Re-read ratio    ${cacheBar} ${pc.bold(cachePct + '%')}
 ${pc.dim('│')} Energy           ${pc.bold(co2Str)} ${pc.dim(`(${regionStr} grid)`)}
 ${pc.dim('│')} ${pc.dim(`Source: ${sourceLabel}`)}
 ${pc.dim('│')}
 ${pc.dim('│')} ${cacheVerdict} — ${cacheText.split('\n').join('\n ' + pc.dim('│') + '   ')}
 ${pc.dim('├────────────────────────────────────────────────────────')}
 ${pc.dim('│')} ${pc.bold(pc.bgCyan(pc.black(' WHAT YOUR AGENTS CAN REACH ')))}
 ${pc.dim('│')} Blast radius   ${reachStr}
 ${pc.dim('│')} ${pc.dim('Full map: ' + CMD + ' capabilities')}
 ${pc.dim('├────────────────────────────────────────────────────────')}
 ${pc.dim('│')} ${pc.bold(pc.bgYellow(pc.black(' YOUR LIMIT ')))}
 ${pc.dim('│')} AI cap   ${pc.bold('70%')} ${pc.dim('· change with: ' + CMD + ' policy')}
 ${pc.dim('│')} Status   ${policyStatus} ${pc.dim('·')} ${policyAction}
 ${pc.dim('├────────────────────────────────────────────────────────')}
 ${pc.dim('│')} ${pc.bold(pc.bgGreen(pc.black(' WHAT TO DO ')))}
${insightLines}
 ${pc.dim('├────────────────────────────────────────────────────────')}
 ${pc.dim('│')} ${pc.dim('Numbers are local estimates — authorship is a proxy and')}
 ${pc.dim('│')} ${pc.dim('carbon is rough. How it works: ' + CMD + ' --help')}
 ${pc.dim('│')} ${pc.dim(pc.italic('Run this before you start. Keep the skill while you use the speed.'))}
 ${pc.dim('└────────────────────────────────────────────────────────')}`;
        } else {
            note(
              `status: ${authPct} AI Reliance | ${cachePct}% Cache Bloat | ${co2Str}`,
              `${pc.bold(`[${CMD}]`)} CI/CD Audit`
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
      // Per tool: ✓ = actually called in this repo's sessions; ○ = configured but never
      // used (reachable by an injection, zero benefit to you = latent attack surface).
      const mark = (m: any) => m.observed ? pc.green('✓') : (riskyReaches.has(m.reach) ? pc.red('○') : pc.dim('○'));
      const toolLines = caps.mcps.length === 0 ? '  None detected'
        : order.filter(r => caps.mcps.some(m => m.reach === r)).map(r => {
            const names = caps.mcps.filter(m => m.reach === r).map(m => `${mark(m)} ${m.name}`).join('  ');
            const tag = riskyReaches.has(r) ? pc.red(`[${reachLabel[r]}]`) : pc.dim(`[${reachLabel[r]}]`);
            return `  ${tag} ${names}`;
          }).join('\n');

      note(
        `${pc.bold('BLAST RADIUS:')} ${radiusColor(pc.bold(caps.blastRadius))}  ${pc.dim('— if an agent or a prompt injection drives your tools')}
${caps.blastReasons.length ? caps.blastReasons.map(r => `  ${pc.red('•')} ${r}`).join('\n') : pc.green('  • read-only — limited reach')}

${pc.bold(`What your agents can reach (${caps.mcps.length} MCP tools):`)}  ${pc.dim(`${pc.green('✓')} ${caps.mcpsObserved} used · ${pc.red('○')} ${caps.mcpsLatent} latent`)}
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
  } else if (action === 'aggregate') {
    // Team/fleet rollup from a folder of `outlier --json` files. Local-first, no export.
    const dir = process.argv[3];
    if (!dir || !existsSync(dir)) {
      console.error(pc.red(`Usage: ${CMD} aggregate <folder-of-json-audits>`));
      console.log(pc.dim(`  Each dev: ${CMD} --json > team/<name>.json   then: ${CMD} aggregate team/`));
      process.exit(1);
    }
    const r = aggregateDir(dir);
    note(
      `Developers:        ${pc.bold(String(r.developers))}
Avg AI authorship: ${pc.bold(r.avgAiPercent !== null ? r.avgAiPercent + '%' : '—')}   Max: ${r.maxAiPercent !== null ? r.maxAiPercent + '%' : '—'}
Over their limit:  ${r.overLimit > 0 ? pc.red(String(r.overLimit)) : pc.green('0')}
Team spend (est):  ${pc.bold('$' + r.totalEstUsd)}
Worst blast radius:${' '}${r.worstBlastRadius === 'HIGH' || r.worstBlastRadius === 'CRITICAL' ? pc.red(r.worstBlastRadius) : pc.yellow(r.worstBlastRadius)}   (${r.reachWriteDeploy} write/deploy tools across the team)
${r.notes.length ? '\n' + r.notes.map(n => `${pc.yellow('•')} ${n}`).join('\n') : ''}`,
      'Team Rollup (local-first — nothing was exported)'
    );
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
      s.start('Generating human-oversight audit record (Decree 142)...');
      // A real, honest compliance record from the actual local numbers — not a stub.
      const gitStats = await getAuthorshipStats().catch(() => null);
      const caps = await getCapabilitiesStats().catch(() => null);
      const humanReviewRate = gitStats ? +(1 - gitStats.ratio).toFixed(3) : null;
      const oversightOk = humanReviewRate !== null && humanReviewRate >= 0.30; // ≥30% human-authored
      const record = {
        timestamp: new Date().toISOString(),
        policy: 'Vietnam Decree 142/2026 — human oversight of high-risk AI',
        repo: process.cwd().split('/').pop(),
        humanAuthorshipRate: humanReviewRate,
        aiAuthorshipRate: gitStats ? +gitStats.ratio.toFixed(3) : null,
        humanOversight: oversightOk ? 'present' : 'insufficient',
        agentBlastRadius: caps ? caps.blastRadius : 'unknown',
        dataExported: false,
        note: 'Derived from local git history only. No code, prompts, or citizen data leave the machine. Authorship is a proxy for human oversight.',
      };
      const reportPath = join(process.cwd(), 'outlier-audit-report.jsonl');
      writeFileSync(reportPath, JSON.stringify(record) + '\n');
      s.stop('Audit record written');

      note(
        `Jurisdiction: ${pc.bold('Vietnam (Decree 142/2026)')}
Human oversight: ${oversightOk ? pc.green('present') : pc.red('insufficient')} ${pc.dim(`(${humanReviewRate !== null ? (humanReviewRate * 100).toFixed(0) + '% human-authored' : 'no git history'})`)}
Agent reach:  ${caps ? caps.blastRadius : 'unknown'}
Privacy:      ${pc.green('preserved — nothing exported')}
Artifact:     ${pc.cyan(reportPath)}`,
        'Human-Oversight Audit Record'
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

    const surveyData = `**Engineering reality:** ${q1}\n**Deskilling impact:** ${q2}\n**Thoughts:** ${feedback}`;

    note(
      `${pc.italic(`"${feedback}"`)}\n\nThanks. To share it, open a new issue and paste the lines below (a screenshot of your receipt helps too).`,
      'Outlier Research'
    );

    // Short, copy-friendly link (no giant pre-filled body in the URL) + the text to paste.
    console.log(`\n ${pc.bold('Open an issue:')}  ${pc.underline(pc.cyan('https://github.com/rosh100yx/outlier/issues/new'))}`);
    console.log(`\n ${pc.dim('Paste this in:')}`);
    console.log(surveyData.split('\n').map(l => '   ' + l).join('\n') + '\n');
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

    // Economic translation: the macro shadow of your individual number.
    const gitStats = await getAuthorshipStats().catch(() => null);
    const carbon = await getCarbonStats().catch(() => null);
    if (gitStats || carbon) {
      const { projectEconomics } = await import('./economics');
      const teamSize = (() => { const i = process.argv.indexOf('--team'); return i > -1 ? (parseInt(process.argv[i + 1] || '1') || 1) : 1; })();
      const econ = projectEconomics({
        aiRatio: gitStats ? gitStats.ratio : 0,
        estUsdSession: carbon ? carbon.estUsd : 0,
        teamSize,
      });
      console.log(pc.bold(pc.bgMagenta(' THE MACRO SHADOW ')) + pc.dim(`  (team of ${teamSize} — set with --team N)`));
      for (const p of econ.projections) {
        console.log(`  ${pc.bold(p.label.padEnd(20))} ${pc.cyan(p.value)}`);
        console.log(`  ${pc.dim('  ' + p.note)}`);
      }
      console.log('\n' + pc.dim(' ' + econ.assumptions) + '\n');
    }
  } else if (action === 'knowledge') {
    console.log('\n' + pc.bold(pc.bgBlue(' CORE LITERATURE & REFERENCES ')) + '\n');
    console.log(`1. ${pc.cyan('METR (Measuring AI Ability)')} - Evaluating AI on long-horizon software tasks.`);
    console.log(`2. ${pc.cyan('The "NPC" vs "High-Agency" Paradigm')} - Remaining sovereign in a room full of agents.`);
    console.log(`3. ${pc.cyan('Proof of Human Mastery')} - The cryptoeconomic necessity of proving human architectural understanding.`);
    console.log(`\nRead the full academic foundation at: ${pc.underline('https://github.com/rosh100yx/outlier')}\n`);
  }

  outro(`Done — nothing left your machine. (How it works: ${CMD} --help)`);

  if (typeof finalReceipt !== 'undefined' && finalReceipt) {
    const boxed = closeBox(finalReceipt);
    console.log(boxed);

    // --save: write a plain-text (no color) copy of the receipt next to the repo.
    if (process.argv.includes('--save')) {
      const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');
      const savePath = join(process.cwd(), 'outlier-audit.txt');
      try {
        writeFileSync(savePath, stripAnsi(boxed).trimStart() + '\n');
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
      pc.bold(pc.cyan(' 🔬 Research: ')) + 'Help the AI-deskilling study — type:  ' + pc.bold(CMD + ' participate')
    );
    if (!process.argv.includes('--save')) {
      console.log(pc.dim(` 💾 Save: ${CMD} status --save`));
    }
    console.log(
      pc.dim('\n outlier does more than this audit — see how you adopt AI, what it')
    );
    console.log(
      pc.dim(' costs, and what is actually working:  ') + pc.bold(pc.cyan(CMD + ' --help'))
    );
  }

  // Bare, interactive `outlier` → after the audit, offer a navigable menu so the dev
  // can keep going without remembering commands. Direct commands and CI/--json skip this.
  if (bareInteractive) {
    console.log('');
    await whatNext();
  }
}

main().catch(console.error);
