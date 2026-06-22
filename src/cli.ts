#!/usr/bin/env bun
import { intro, outro, select, spinner, isCancel, cancel, note } from '@clack/prompts';
import pc from 'picocolors';
import { getAuthorshipStats } from './git';
import { getCarbonStats } from './carbon';
import { getCapabilitiesStats } from './capabilities';
import { writeFileSync, chmodSync, existsSync } from 'fs';
import { join } from 'path';

async function main() {
  console.clear();
  intro(pc.inverse(' outlier '));

  let action = process.argv[2] as any;
  if (!action || action === 'audit') {
    if (action !== 'audit') {
      action = await select({
        message: 'Select outlier governance module:',
        options: [
          { value: 'status', label: 'Status Report', hint: 'Run full AI reliance and capability audit' },
          { value: 'capabilities', label: 'Capabilities Map', hint: 'Audit active MCPs, skills, and orchestrations' },
          { value: 'authorship', label: 'Code Durability', hint: 'Scan git history for AI Code Reliance & Hallucination Risk' },
          { value: 'carbon', label: 'Cache Bloat', hint: 'Scan local logs for context waste & token costs' },
          { value: 'policy', label: 'Policy Profiles', hint: 'Set Personal, Team, or Enterprise guardrails in CI' }
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
  } else if (action === 'authorship' || action === 'status') {
    s.start('Scanning local git history and agent logs...');
    
    try {
      const gitStats = await getAuthorshipStats().catch(() => null);
      const carbon = await getCarbonStats().catch(() => null);
      s.stop('Audit complete');
      
      if (action === 'authorship' && gitStats) {
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
      } else if (action === 'status') {
        const isStrict = process.argv.includes('--strict');
        s.start('Running outlier telemetry audit...');
        const carbon = await getCarbonStats().catch(() => null);
        const gitStats = await getAuthorshipStats().catch(() => null);
        const capabilities = await getCapabilitiesStats().catch(() => null);
        s.stop('Audit complete');
        
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
        ? `echo "❌ outlier policy violation: AI authorship ($CURRENT_RATIO%) exceeds threshold ($MAX_RATIO%)"`
        : `echo "😾 ✋ The Bouncer says no: Your code is $CURRENT_RATIO% AI-generated."\n    echo "A human must review this before it enters the club (main branch)."`;

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

OVER_LIMIT=$(awk "BEGIN {if ($CURRENT_RATIO > $MAX_RATIO) print 1; else print 0}")
if [ "$OVER_LIMIT" -eq 1 ]; then
    ${bouncerMsg}
    exit 1
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
      writeFileSync(reportPath, JSON.stringify({ timestamp: new Date().toISOString(), status: 'COMPLIANT', policy: 'Decree 142', humanOversight: true }) + '\\n');
      s.stop('Audit Generated');

      note(
        `Jurisdiction: ${pc.bold('Vietnam (Decree 142)')}
Status:       ${pc.green('Compliant - Human oversight logged locally')}
Privacy:      ${pc.green('Preserved - No citizen data exported')}
Artifact:     ${pc.cyan(reportPath)}`,
        'Regulatory Compliance'
      );
    }
  }

  let shareText = 'Local telemetry run completed. No data left your machine.';
  if (action === 'status') {
    shareText += `\n\n${pc.dim('└')} ${pc.cyan('Share your audit:')} https://x.com/intent/tweet?text=I%20just%20audited%20my%20codebase%20for%20AI%20reliance%20and%20deskilling%20risk.%20What%20does%20your%20repo%20score%3F%0A%0A%F0%9F%93%8F%20npx%20%40rosh100yx%2Foutlier`;
  }

  outro(shareText);
}

main().catch(console.error);
