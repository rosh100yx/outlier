#!/usr/bin/env node

const cyan = (text) => `\x1b[36m${text}\x1b[0m`;
const dim = (text) => `\x1b[2m${text}\x1b[0m`;
const bold = (text) => `\x1b[1m${text}\x1b[0m`;

console.log('\n' + bold('Welcome to Outlier') + ' - AI Code Governance for the Terminal');
console.log(dim('────────────────────────────────────────────────────────────'));
console.log('To start the interactive wizard and audit your codebase, type:\n');
console.log(`  ${cyan('outlier')}\n`);
console.log('Available Commands:');
console.log(`  ${cyan('outlier status')}        Print your Thermal Audit Receipt`);
console.log(`  ${cyan('outlier impact')}        See the compounding horizon of AI Deskilling (What you lose/gain)`);
console.log(`  ${cyan('outlier knowledge')}     Explore core literature and METR references`);
console.log(`  ${cyan('outlier participate')}   Help build the literature on AI deskilling`);
console.log(`  ${cyan('outlier help')}          See all available commands`);
console.log(dim('────────────────────────────────────────────────────────────\n'));
