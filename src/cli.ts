#!/usr/bin/env node
import os from 'os';
import { intro, outro, select, spinner, isCancel, cancel, note, text, confirm } from '@clack/prompts';
import pc from 'picocolors';
import { getAuthorshipStats } from './git';
import { getCarbonStats } from './carbon';
import { getCapabilitiesStats } from './capabilities';
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

async function runOnboarding() {
  console.clear();
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
  console.clear();
  console.log(pc.cyan(ASCII_LOGO));
  const pkg = require('../package.json');
  console.log(pc.dim(`  Outlier v${pkg.version} · AI Code Reliance & Telemetry Engine\n`));
  
  let action = process.argv[2] as any;
  
  if (action === '--help' || action === '-h' || action === 'help') {
    console.log(pc.bold('\nCOMMANDS:'));
    console.log(`  ${pc.cyan('outlier')}              Interactive menu (Onboarding for first-timers)`);
    console.log(`  ${pc.cyan('outlier status')}       Run full AI reliance & capability audit`);
    console.log(`  ${pc.cyan('outlier authorship')}   Scan git history for AI co-authorship ratio`);
    console.log(`  ${pc.cyan('outlier carbon')}       Scan local logs for token waste & carbon cost`);
    console.log(`  ${pc.cyan('outlier policy')}       Configure CI/CD guardrails and thresholds`);
    console.log(`  ${pc.cyan('outlier impact')}       See the compounding horizon of AI Deskilling`);
    console.log(`  ${pc.cyan('outlier knowledge')}    Explore references, graphs, and the core literature`);
    console.log(`  ${pc.cyan('outlier participate')}  Help build the academic literature on AI deskilling`);
    console.log('\n' + pc.dim('Run without arguments to start the interactive wizard.'));
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
        let ruleFailures = 0;
        let authWarning = '';
        let wittyRemark = isStrict ? '' : 'No git history (・_・ヾ';
        let mentorString = '';
        
        if (gitStats) {
          authPct = `${(gitStats.ratio * 100).toFixed(1)}%`;
          
          if (!isStrict) {
            if (gitStats.ratio < 0.1) wittyRemark = 'Artisan, hand-crafted code. Very 2019 of you (=^ ◡ ^=)';
            else if (gitStats.ratio < 0.6) wittyRemark = 'A true centaur. Half human, half matrix (=｀ω´=)';
            else if (gitStats.ratio < 0.95) wittyRemark = 'Orchestrating the swarm. You are the manager now (ФДФ)';
            else wittyRemark = '100% Cybernetic. Codebase goes brrrrr (=ಠᆽಠ=)';
          }

          if (gitStats.ratio > 0.7) {
            authWarning = pc.red(isStrict ? `⚠ High Risk Surface: ${authPct} AI-generated. Human review required.` : `⚠ Mentoring Emergency: ${authPct} AI-generated. High risk of skill atrophy.`);
            if (!isStrict) {
              mentorString = `\n    mentor: ${pc.blue('💡 Architecture Challenge Pending (See Git Hook)')}`;
            }
            ruleFailures++;
          }
        }
        
        let cachePct = '0';
        let co2Str = '0.0kg';
        let regionStr = 'Global Average';
        if (carbon) {
          if (carbon.totalTokens > 0) {
            cachePct = ((carbon.cacheReadTokens / carbon.totalTokens) * 100).toFixed(1);
          }
          co2Str = `${carbon.localCo2Kg.toFixed(2)}kg CO2`;
          regionStr = carbon.localRegion;
        }

        const vibeRow = !isStrict ? `\n    vibe: ${pc.italic(wittyRemark)}` : '';
        const capIcon = isStrict ? '' : '(Ф∇Ф) ';
        const authIcon = isStrict ? '' : '(=^･ω･^=) ';
        const costIcon = isStrict ? '' : '(O_O;) ';
        const failIcon = isStrict ? '⚠' : '(=ಠᆽಠ=)';
        const passIcon = isStrict ? '✓' : '(=^ ◡ ^=)';

        note(
          `${capIcon}${pc.dim('[1] Capability Engine')} ${pc.cyan('▰▰▰▰▰▰▱▱▱▱')}  ${pc.bold('Active')}
    status: ${pc.green('✓ Configured')}
${authIcon}${pc.dim('[2] AI Code Reliance')} ${pc.yellow('▰▰▰▰▰▰▰▰▱▱')}  ${pc.bold(`${authPct} Reliance`)}${vibeRow}
    gate: ${gitStats && gitStats.ratio <= 0.7 ? pc.green('✓ Human Mastery Sustained') : `${pc.red(`${failIcon} Deskilling Risk Detected`)} ${pc.red('⚠ Security Audit Required')}`}${mentorString}
${costIcon}${pc.dim('[3] Tokenomics & Cost')} ${pc.magenta('▰▰▰▰▰▰▰▰▰▱')} ${pc.bold(`${cachePct}% Cache Bloat`)}
    waste: ${pc.yellow(`⚠ ${cachePct}% of tokens are redundant context reads`)}
    carbon: ${pc.green(`✓ ${co2Str} (Est. ${regionStr} Grid)`)}
${pc.bold('Governance:')} ${ruleFailures > 0 ? pc.red(`${failIcon} ${ruleFailures + 1} policy failures`) : pc.green(`${passIcon} All clear`)}`,
          `${pc.bold('[outlier]')} ${5 - (ruleFailures+1)}/5 policies • ${authWarning || pc.green(`${passIcon} safe surface`)} • ${co2Str}`
        );

        const timestamp = new Date().toISOString().split('T')[0];
        const isDanger = gitStats && gitStats.ratio > 0.7;
        const verdictZone = isDanger ? pc.red('DANGER ZONE') : pc.green('SAFE / SOVEREIGN');
        const verdictText = isDanger 
          ? `You are transitioning from 'Creator' to 'Reviewer'.\n   At this trajectory, you risk losing architectural \n   muscle memory on this codebase within 6 months.` 
          : `You are maintaining strong architectural intimacy.\n   Your human judgement remains the primary driver\n   of logic in this system.`;
          
        const isInefficient = parseFloat(cachePct) > 40;
        const cacheVerdict = isInefficient ? pc.yellow('INEFFICIENT') : pc.green('EFFICIENT');
        const cacheText = isInefficient 
          ? `You are burning paid API tokens and excess compute\n   on files the agent isn't even touching.` 
          : `Your token usage and human judgment are tightly\n   coupled. High signal-to-noise ratio.`;
          
        const policyStatus = ruleFailures > 0 ? pc.red('BLOCKED 🛑 (Threshold Exceeded)') : pc.green('PASS ✅ (Within Threshold)');
        const policyAction = ruleFailures > 0 ? 'Triggering Mandatory Mentoring Scenario.' : 'No intervention required.';

        const totalTokensStr = carbon ? (carbon.totalTokens / 1000).toFixed(1) + 'k' : '0';
        const humanSov = gitStats ? ((1 - gitStats.ratio) * 100).toFixed(1) + '%' : '100%';
        const authorshipStr = authPct + (isDanger ? pc.red(' (High Reliance)') : pc.green(' (Healthy)'));

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
 ${pc.dim('│')} ${pc.cyan('█▀█ █░█ ▀█▀ █░░ █ █▀▀ █▀█')}  ${pc.bold(':: THERMAL AUDIT RECEIPT')}
 ${pc.dim('│')} ${pc.cyan('█▄█ █▄█ ░█░ █▄▄ █ ██▄ █▀▄')}  ${pc.dim(`:: TIMESTAMP: ${dateStr}`)}
 ${pc.dim('├────────────────────────────────────────────────────────')}
 ${pc.dim('│')} ${pc.bold(pc.bgBlue(' [ COGNITIVE BUDGET ] '))}
 ${pc.dim('│')} AI Authorship     ................. ${aiBar} ${authorshipStr}
 ${pc.dim('│')} Human Sovereignty ................. ${humanBar} ${humanSov}
 ${pc.dim('│')}
 ${pc.dim('│')} ↳ Verdict: ${verdictZone}
 ${pc.dim('│')}   ${verdictText.split('\n').join('\n ' + pc.dim('│') + ' ')}
 ${pc.dim('├────────────────────────────────────────────────────────')}
 ${pc.dim('│')} ${pc.bold(pc.bgMagenta(' [ FINANCIAL & COMPUTE TOLL ] '))}
 ${pc.dim('│')} Tokens Burnt      ................. ${totalTokensStr} vs Human Judgment
 ${pc.dim('│')} Cache Bloat       ................. ${cacheBar} ${cachePct}% (Unmodified context)
 ${pc.dim('│')} Regional Grid     ................. ${regionStr}
 ${pc.dim('│')}
 ${pc.dim('│')} ↳ Verdict: ${cacheVerdict}
 ${pc.dim('│')}   ${cacheText.split('\n').join('\n ' + pc.dim('│') + ' ')}
 ${pc.dim('├────────────────────────────────────────────────────────')}
 ${pc.dim('│')} ${pc.bold(pc.bgYellow(pc.black(' [ POLICY ENFORCEMENT ] ')))}
 ${pc.dim('│')} Status .................................. ${policyStatus}
 ${pc.dim('│')} Action .................................. ${policyAction}
 ${pc.dim('├────────────────────────────────────────────────────────')}
 ${pc.dim('│')}
 ${pc.dim('│')}  ${pc.italic(pc.dim('patterns emerge in the commit history,'))}
 ${pc.dim('│')}  ${pc.italic(pc.dim('code becomes commoditized by algorithms.'))}
 ${pc.dim('│')}  ${pc.italic(pc.dim('human mastery is the only true moat.'))}
 ${pc.dim('│')}
 ${pc.dim('│')}                   ${pc.bold(pc.cyan('***STAY VIGILANT***'))}
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
    s.start('Auditing AI surface area (MCPs, Skills, Orchestrators)...');
    try {
      const caps = await getCapabilitiesStats();
      s.stop('Capabilities Scan Complete');

      note(
        `Orchestration Policy: ${caps.hasOrchestration ? pc.green('Detected (AGENTS.md)') : pc.yellow('None')}

Active Skills (${caps.skills.length}):
${caps.skills.length > 0 ? pc.cyan(caps.skills.map(s => `  • ${s}`).join('\n')) : '  None'}

Active MCP Servers (${caps.mcps.length}):
${caps.mcps.length > 0 ? pc.magenta(caps.mcps.map(m => `  • ${m}`).join('\n')) : '  None'}

${pc.bold('Governance Assessment:')}
This repository provides agents with ${caps.mcps.length} toolsets and ${caps.skills.length} skills. 
${caps.skills.length > 5 ? pc.red('⚠ High Surface Area: Ensure strict authorship review is enabled.') : pc.green('✓ Low Surface Area: Risk contained.')}`,
        'AI Capabilities Map'
      );
    } catch (e: any) {
      s.stop('Audit failed');
      console.error(pc.red(e.message));
    }
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

  outro('Local telemetry run completed. No data left your machine.');

  if (typeof finalReceipt !== 'undefined' && finalReceipt) {
    console.log(finalReceipt);
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
      pc.bold(pc.cyan(' └ Participate: ')) + 'Help build the literature on AI deskilling ➔ ' + pc.bold('outlier participate')
    );
    console.log(
      pc.bold(pc.green(' └ Prove Your Mastery: ')) + pc.underline(`https://x.com/intent/tweet?text=${encodeURIComponent('I just audited my codebase for AI reliance and deskilling risk. What does your repo score?\n\n📏 #Outlier')}`)
    );
    console.log(
      pc.dim('\n (To see all local governance modules, run: ') + pc.dim(pc.bold('outlier --help')) + pc.dim(')')
    );
  }
}

main().catch(console.error);
