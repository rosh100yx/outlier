import pc from 'picocolors';

export async function runImpactCommand(_args: string[]): Promise<void> {
  const CMD = 'outlier';
  console.log('\n' + pc.bold(pc.bgMagenta(' THE GAP BETWEEN SHIP AND UNDERSTAND ')) + '\n');
  console.log(pc.dim('Agents take on longer tasks every quarter (METR). As they do, the gap between'));
  console.log(pc.dim('what you can ship and what you actually understand widens. The move is to close'));
  console.log(pc.dim('it on purpose — not to panic, not to stop using the speed.\n'));
  console.log(pc.cyan('■ Now — minute-scale tasks'));
  console.log(`  ${pc.green('Keep:')} velocity — let agents scaffold.   ${pc.cyan('Close the gap:')} read what ships; ${CMD} learn.`);
  console.log(`  ${pc.green('Watch:')} oversight rate. High AI + low review = authorship erosion.`);
  console.log('');
  console.log(pc.cyan('■ Next — hour-scale tasks'));
  console.log(`  ${pc.green('Keep:')} blast radius in check.   ${pc.cyan('Close the gap:')} audit before merge; ${CMD} capabilities.`);
  console.log(`  ${pc.red('Risk:')} agent writes 100% of a subsystem. Human reviews but cannot explain it.`);
  console.log('');
  console.log(pc.cyan('■ Horizon — day-scale tasks (METR 2026)'));
  console.log(`  ${pc.red('Deskilling becomes structural.')} You delegate the creative act, not just the typing.`);
  console.log(`  ${pc.green('Counter-move:')} the ${CMD} status receipt + ${CMD} learn challenges keep the skill alive.`);
  console.log('');
  console.log(pc.dim('The framework is: measure at the delegation point, coach after the receipt.'));
}
