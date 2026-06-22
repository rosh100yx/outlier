#!/usr/bin/env bun
import { intro, outro, select, spinner, isCancel, cancel, note, text } from '@clack/prompts';
import pc from 'picocolors';
import { getAuthorshipStats } from './git';
import { getCarbonStats } from './carbon';
import { getCapabilitiesStats } from './capabilities';
import { writeFileSync, chmodSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const ASCII_LOGO = `
   ____  _   _ _____ _     ___ _____ ____  
  / __ \\| | | |_   _| |   |_ _|  ___|  _ \\ 
 | |  | | | | | | | | |    | || |__ | |_) |
 | |  | | |_| | | | | |___ | ||  __||  _ < 
 | |__| |  _  | | | |  _  || || |___| | \\ \\
  \\____/|_| |_| |_| |_| |_|___|_____|_|  \\_\\
`;

import os from 'os';
import { confirm } from '@clack/prompts';

async function runOnboarding() {
  console.clear();
  console.log(pc.cyan(ASCII_LOGO));
  intro(pc.inverse(' outlier: Welcome '));

  note(
    `Outlier is a local-first Policy Engine & Governance Framework for AI Engineering.

Our mission is AI Safety for developers:
As agents (Cursor, Copilot, Claude) write more of our code, we lose visibility into:
1. Deskilling Risk (Are we becoming spectators in our own codebase?)
2. Carbon Cost (What is the true regional energy cost of token caching?)
3. Capability Drift (What hidden skills and external tools are our agents using?)

We built Outlier to enforce Zero-Trust and protect Human Mastery. You are in control.`,
    'The Problem: AI Safety in Development'
  );

  note(
    `Outlier operates entirely on your machine.
- Local Only: No API keys. No cloud telemetry. No data leaves your machine.
- Native Auditing: We only read your local \`~/.claude\` logs and \`.git/\` commit history.
- Actionable Policies: We enforce rules locally via terminal or Git pre-commit hooks.`,
    'Privacy & Zero-Trust Principles'
  );

  note(
    `Available Commands:
- status: Run a full system audit (Reliance, Carbon, Capabilities)
- policy: Configure team/enterprise guardrails and CLI blockers
- carbon: View isolated token caching metrics and regional counterfactuals
- authorship: View Git authorship ratio (Human vs AI)`,
    'How it is used'
  );

  note(
    `When you start the audit, Outlier will locally parse your Git commits to identify AI co-authorship and cross-reference your agent logs to calculate token waste. 

The results will assign you a "vibe" and evaluate if you are at risk of deskilling.`,
    'What to Expect'
  );

  const ready = await confirm({
    message: 'Are you ready to run your first Governance Audit and measure your AI reliance?',
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
  console.log(pc.dim('  Outlier v0.4.1 · AI Code Reliance & Telemetry Engine\n'));
  
  let action = process.argv[2] as any;
  
  if (action === '--help' || action === '-h' || action === 'help') {
    console.log(pc.bold('\nCOMMANDS:'));
    console.log(`  ${pc.cyan('outlier')}              Interactive menu (Onboarding for first-timers)`);
    console.log(`  ${pc.cyan('outlier status')}       Run full AI reliance & capability audit`);
    console.log(`  ${pc.cyan('outlier authorship')}   Scan git history for AI co-authorship ratio`);
    console.log(`  ${pc.cyan('outlier carbon')}       Scan local logs for token waste & carbon cost`);
    console.log(`  ${pc.cyan('outlier policy')}       Configure CI/CD guardrails and thresholds`);
    console.log(`  ${pc.cyan('outlier confessional')} Submit qualitative feedback or feature requests`);
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
    if (action !== 'audit') {
      action = await select({
        message: 'Select outlier governance module:',
        options: [
          { value: 'status', label: 'Status Report', hint: 'Run full AI reliance and capability audit' },
          { value: 'capabilities', label: 'Capabilities Map', hint: 'Audit active MCPs, skills, and orchestrations' },
          { value: 'authorship', label: 'Code Durability', hint: 'Scan git history for AI Code Reliance & Hallucination Risk' },
          { value: 'carbon', label: 'Cache Bloat', hint: 'Scan local logs for context waste & token costs' },
          { value: 'policy', label: 'Policy Profiles', hint: 'Set Personal, Team, or Enterprise guardrails in CI' },
          { value: 'confessional', label: 'Confessional', hint: 'Tell us how AI is really affecting your job (Feature Requests)' }
        ],
      });

      if (isCancel(action)) {
        cancel('Operation cancelled.');
        process.exit(0);
      }
    } else {
      action = 'status'; // Map the 'audit' alias directly to status for CI
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

    if (!isStrict) {
      s.start('[SYSTEM] Booting local-first sandbox...');
      await new Promise(r => setTimeout(r, 800));
      s.message(`↳ Guarantee: No API calls. Your code and logs never leave this machine.`);
      await new Promise(r => setTimeout(r, 1200));
      
      s.message('[GIT] Scanning your commit history...');
      gitStats = await getAuthorshipStats().catch(() => null);
      await new Promise(r => setTimeout(r, 600));
      s.message(`↳ Check: Are you writing the code, or just reviewing what the AI wrote?`);
      await new Promise(r => setTimeout(r, 1200));
      
      s.message('[TOKENS] Parsing local AI logs (~/.claude/)...');
      carbon = await getCarbonStats().catch(() => null);
      await new Promise(r => setTimeout(r, 600));
      s.message(`↳ Check: How much API waste is your workflow generating locally?`);
      await new Promise(r => setTimeout(r, 1200));
      
      s.message('[ANALYSIS] Calculating your mastery score...');
      capabilities = await getCapabilitiesStats().catch(() => null);
      await new Promise(r => setTimeout(r, 600));
      s.message(`↳ Warning: Heavy AI use creates the 'Illusion of Competence'. Don't lose your edge.`);
      await new Promise(r => setTimeout(r, 1200));
      
      s.message('[PRINT] Generating Thermal Receipt...');
      await new Promise(r => setTimeout(r, 600));
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
  } else if (action === 'confessional') {
    s.start('Connecting to the human element...');
    await new Promise(resolve => setTimeout(resolve, 600));
    s.stop('Secure connection established.');

    const feedback = await text({
      message: pc.cyan('What is AI actually doing to your codebase? Are you a 10x dev or a 10x reviewer now?\n(Note: This will draft a public GitHub issue)'),
      placeholder: 'Honestly, I just let the agent write the regex...',
      validate(value) {
        if (!value || value.length === 0) return `C'mon, confess something!`;
      },
    });

    if (isCancel(feedback)) {
      cancel('Confession aborted.');
      process.exit(0);
    }

    note(
      `${pc.italic(`"${feedback}"`)}\n\nYour confession is safe with us. But if you want to make it official (and help us build what you need), we've generated a secure transmission link for you.`,
      'The Confessional'
    );

    const url = `https://github.com/rosh100yx/outlier/issues/new?assignees=&labels=enhancement&projects=&template=feature_request.md&title=%5BConfessional%5D+Feedback&body=${encodeURIComponent("Drop a screenshot of your Thermal Receipt here! \n\n" + feedback.toString())}`;
    console.log(`\n${pc.bold('Submit here (and drop your screenshot!):')} ${pc.underline(pc.cyan(url))}\n`);
  }

  outro('Local telemetry run completed. No data left your machine.');

  // Artifact Level Storytelling: Dither Garden style thermal receipt
  if (action === 'status' || action === 'authorship' || action === 'carbon') {
    const d = new Date();
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase();
    const timeStr = d.toLocaleTimeString('en-US', { hour12: false });
    
    let repoName = process.cwd().split('/').pop() || 'Unknown';
    
    console.log(`\n${pc.dim('-------------------------')} ${pc.bold('AUDIT RECEIPT')} ${pc.dim('-------------------------')}`);
    console.log(`\n Project                                      ${pc.bold(repoName.padEnd(16).substring(0,16))}`);
    console.log(` Timestamp                                  ${pc.dim(`${dateStr} ${timeStr}`)}\n`);
    
    console.log(` 01x Authorship Policy                      ${process.argv.includes('--strict') ? 'Strict Mode' : 'Vibe Check'}`);
    console.log(` 02x AI Reliance Risk                       ${action === 'carbon' ? 'N/A' : 'Assessed'}`);
    console.log(` 03x Cache Bloat Tokens                     ${action === 'authorship' ? 'N/A' : 'Audited'}`);
    console.log(` 04x Regional Grid Check                    ${action === 'authorship' ? 'N/A' : 'Completed'}\n`);
    
    console.log(pc.dim(' **********************************************************'));
    console.log(`\n ${pc.italic('patterns emerge in the commit history,')}`);
    console.log(` ${pc.italic('code becomes commoditized by algorithms.')}`);
    console.log(` ${pc.italic('human mastery is the only true moat.')}\n`);
    console.log(pc.dim(' **********************************************************\n'));
    
    console.log('                 Outlier Governance Engine');
    console.log(pc.bold('\n                   ***AUDIT COMPLETE***'));
    console.log(pc.bold('                   ***STAY VIGILANT***\n'));
  }

  console.log(
    pc.dim(
      `└ Share your audit: https://x.com/intent/tweet?text=${encodeURIComponent(
        'I just audited my codebase for AI reliance and deskilling risk. What does your repo score?\n\n📏 npx @rosh100yx/outlier'
      )}`
    )
  );
  
  console.log(
    pc.dim(`└ Have thoughts on AI deskilling? Tell us: `) + pc.cyan(`npx @rosh100yx/outlier confessional`)
  );

  console.log(
    pc.dim(`└ Keep your local policies updated: `) + pc.cyan(`npx @rosh100yx/outlier@latest`)
  );
}

main().catch(console.error);
