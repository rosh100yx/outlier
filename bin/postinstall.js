#!/usr/bin/env node

const cyan = (text) => `\x1b[36m${text}\x1b[0m`;
const dim = (text) => `\x1b[2m${text}\x1b[0m`;
const bold = (text) => `\x1b[1m${text}\x1b[0m`;

console.log('\n' + bold('Welcome to Outlier') + ' - AI Code Governance for the Terminal');
console.log(dim('────────────────────────────────────────────────────────────'));
console.log('To start the interactive wizard and audit your codebase, type:\n');
console.log(`  ${cyan('outlier')}\n`);
console.log('Available Commands:');
console.log(`  ${cyan('outlier status')}        Run full AI reliance & capability audit`);
console.log(`  ${cyan('outlier authorship')}    Scan git history for AI co-authorship ratio`);
console.log(`  ${cyan('outlier carbon')}        Scan local logs for token waste & carbon cost`);
console.log(`  ${cyan('outlier capabilities')}  Audit active MCPs, skills, and orchestrations`);
console.log(`  ${cyan('outlier policy')}        Configure CI/CD guardrails and thresholds`);
console.log(`  ${cyan('outlier impact')}        See the compounding horizon of AI Deskilling`);
console.log(`  ${cyan('outlier knowledge')}     Explore core literature and METR references`);
console.log(`  ${cyan('outlier participate')}   Help build the literature on AI deskilling`);
console.log(dim('────────────────────────────────────────────────────────────\n'));
