import { getCapabilitiesStats } from '../capabilities';
import { getAuthorshipStats } from '../git';
import { detectAgent } from '../agent';
import pc from 'picocolors';

export async function runPreflightCommand(_args: string[]): Promise<void> {
  const agent = detectAgent();
  const caps = await getCapabilitiesStats().catch(() => null);
  const gitStats = await getAuthorshipStats().catch(() => null);

  let aiPct = '—';
  if (gitStats) aiPct = (gitStats.ratio * 100).toFixed(0) + '%';

  let br = '—';
  if (caps) {
    br = caps.blastRadius;
    const col = br === 'HIGH' || br === 'CRITICAL' ? pcRed : br === 'MEDIUM' ? pcYellow : pcGreen;
    console.log(`\nAgent reach: ${col(pc.bold(br))} · ${caps.mcps.length} tools, ${caps.mcps.filter(m => ['money','exec','deploy'].includes(m.reach)).length} can write/deploy`);
    if (caps.mcpsLatent > 0) console.log(`${pc.dim(` · ${caps.mcpsLatent} unused (latent)`)}`);
  }

  console.log(``);
  console.log(`Before you delegate:`);
  console.log(`Skill       AI wrote ${aiPct} · you own the rest`);
  console.log(`Reach       ${br}`);
  console.log(``);
  console.log(`Start your session:  ${agent || 'your AI agent'}`);
  console.log(``);
}

function pcRed(s: string) { return '\x1b[31m' + s + '\x1b[0m'; }
function pcYellow(s: string) { return '\x1b[33m' + s + '\x1b[0m'; }
function pcGreen(s: string) { return '\x1b[32m' + s + '\x1b[0m'; }
function pcDim(s: string) { return '\x1b[2m' + s + '\x1b[0m'; }
