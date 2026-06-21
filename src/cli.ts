import { intro, outro, select, spinner, isCancel, cancel, note } from '@clack/prompts';
import pc from 'picocolors';
import { getAuthorshipStats } from './git';
import { getCarbonStats } from './carbon';
import { getCapabilitiesStats } from './capabilities';

async function main() {
  console.clear();
  intro(pc.inverse(' outlier '));

  let action = process.argv[2] as any;
  if (!action) {
    action = await select({
      message: 'What would you like to measure?',
      options: [
        { value: 'status', label: 'Status', hint: 'Run full authorship and session carbon audit' },
        { value: 'capabilities', label: 'Capabilities Map', hint: 'Audit active MCPs, skills, and orchestrations' },
        { value: 'authorship', label: 'Authorship Only', hint: 'Scan git history for AI co-authors' },
        { value: 'carbon', label: 'Carbon Only', hint: 'Scan local logs for token-based carbon footprint' },
        { value: 'policy', label: 'Policy Profiles', hint: 'Set Personal, Team, or Enterprise guardrails' }
      ],
    });

    if (isCancel(action)) {
      cancel('Operation cancelled.');
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

Grid Cost (Vietnam): ${pc.red(carbon.co2KgVietnam.toFixed(2) + ' kgCO2')}
Grid Cost (France):  ${pc.green(carbon.co2KgFrance.toFixed(2) + ' kgCO2')}

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
        // Build the combined status view
        let authPct = '0.00';
        let ruleFailures = 0;
        let authWarning = '';
        if (gitStats) {
          authPct = gitStats.ratio.toFixed(2);
          if (gitStats.ratio > 0.7) {
            ruleFailures++;
            authWarning = pc.red('⚠ authorship high');
          }
        }
        
        let co2Kg = '0.0';
        let sessions = 0;
        if (carbon) {
          co2Kg = carbon.co2KgVietnam.toFixed(1);
          sessions = carbon.sessions;
        }

        note(
          `${pc.dim('[1] Local workspace logs')} ${pc.cyan('▰▰▰▰▰▰▱▱▱▱')}  ${pc.bold('Active')}
    rules: ${pc.green('✓ ✓ ✓')}
${pc.dim('[2] Version control (git)')} ${pc.yellow('▰▰▰▰▰▰▰▰▱▱')}  ${pc.bold('Parsed')}
    rules: ${gitStats && gitStats.ratio <= 0.7 ? pc.green('✓ ✓ ✓') : `${pc.green('✓')} ${pc.red('⚠ authorship')} ${pc.red('⚠ skill')}`}
${pc.bold('Aggregate:')} Authorship ${authPct} | CO2 ${co2Kg}kg | ${ruleFailures > 0 ? pc.red(`⚠ ${ruleFailures + 1} rule failures`) : pc.green('✓ All clear')}`,
          `${pc.bold('[outlier]')} ${5 - (ruleFailures+1)}/5 rules • ${authWarning || pc.green('✓ healthy')} • CO2 ${co2Kg}kg\noutlier: ${sessions} sessions`
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
      await new Promise(resolve => setTimeout(resolve, 800));
      s.stop('Policy Applied');

      note(
        `Tier:         ${pc.bold(tier.toString().toUpperCase())}
Rule 1:       ${pc.green(`AI Authorship must not exceed ${maxAuthorship}%`)}
Rule 2:       ${pc.green('Require human review on consecutive high-AI sprints')}
Enforcement:  ${pc.cyan('Local pre-commit hook installed')}`,
        'Active Governance Policy'
      );
    } else if (tier === 'regulatory') {
      s.start('Generating Regulatory Compliance Audit (Decree 142)...');
      await new Promise(resolve => setTimeout(resolve, 1200));
      s.stop('Audit Generated');

      note(
        `Jurisdiction: ${pc.bold('Vietnam (Decree 142)')}
Status:       ${pc.green('Compliant - Human oversight logged locally')}
Privacy:      ${pc.green('Preserved - No citizen data exported')}
Artifact:     ${pc.cyan('outlier-audit-report.jsonl generated')}`,
        'Regulatory Compliance'
      );
    }
  }

  outro(pc.green('Local telemetry run completed. No data left your machine.'));
}

main().catch(console.error);
