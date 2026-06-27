#!/usr/bin/env node

const cyan = (t) => `\x1b[36m${t}\x1b[0m`;
const dim = (t) => `\x1b[2m${t}\x1b[0m`;
const bold = (t) => `\x1b[1m${t}\x1b[0m`;
const green = (t) => `\x1b[32m${t}\x1b[0m`;

console.log('\n' + bold('  Outlier installed') + dim(' · AI code governance for the terminal'));
console.log(dim('  ──────────────────────────────────────────────────────────'));
console.log('  Run it before you start coding. It reads your local git history');
console.log('  and AI logs — ' + green('on your machine') + ' — and shows you:');
console.log('    • how much of your code AI wrote');
console.log('    • what it cost (tokens, $, wasted context, carbon)');
console.log('    • whether you are keeping the skill while you use the speed');
console.log('');
console.log('  Start your first audit:');
console.log(`      ${cyan('outlier')}`);
console.log('');
console.log('  Other commands:  ' + dim('outlier --help'));
console.log(dim('  ──────────────────────────────────────────────────────────'));
console.log('  ' + green('Local-first:') + ' nothing ever leaves your machine.\n');

try {
  const { execSync } = require('child_process');
  const { existsSync } = require('fs');
  const path = require('path');
  const scriptPath = path.join(__dirname, '..', 'scripts', 'build-proxy.sh');
  if (existsSync(scriptPath)) {
    console.log(dim('  [Optional] Attempting to build high-performance Rust proxy...'));
    execSync(`bash "${scriptPath}"`, { stdio: 'ignore' });
  }
} catch (e) {
  // Silent fail, it's optional
}
