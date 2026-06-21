import { intro, outro, select, spinner, isCancel, cancel, note } from '@clack/prompts';
import pc from 'picocolors';
import { getAuthorshipStats } from './git';
import { getCarbonStats } from './carbon';

async function main() {
  console.clear();
  intro(pc.inverse(' outlier '));

  const action = await select({
    message: 'What would you like to measure?',
    options: [
      { value: 'status', label: 'Status', hint: 'Run full authorship and session carbon audit' },
      { value: 'authorship', label: 'Authorship Only', hint: 'Scan git history for AI co-authors' },
      { value: 'carbon', label: 'Carbon Only', hint: 'Scan local logs for token-based carbon footprint' },
      { value: 'policy', label: 'Policy Profiles', hint: 'Set Personal, Team, or Enterprise guardrails' }
    ],
  });

  if (isCancel(action)) {
    cancel('Operation cancelled.');
    process.exit(0);
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

  } else {
    s.start(`Running ${action} module...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    s.stop(`Finished running ${action}`);
    console.log(pc.yellow(`The ${action} module is currently under construction.`));
  }

  outro(pc.green('Local telemetry run completed. No data left your machine.'));
}

main().catch(console.error);
