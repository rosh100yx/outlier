import { getCapabilitiesStats } from '../capabilities';
import pc from 'picocolors';

export async function runCapabilitiesCommand(_args: string[]): Promise<void> {
  const caps = await getCapabilitiesStats().catch(() => null);
  if (!caps) {
    console.log('No agent configuration found.');
    return;
  }

  const rc = caps.blastRadius;
  const col = rc === 'CRITICAL' || rc === 'HIGH' ? pc.red : rc === 'MEDIUM' ? pc.yellow : pc.green;
  const risky = caps.mcps.filter(m => ['money','exec','deploy','write-remote','write-local'].includes(m.reach)).length;
  const latent = caps.mcpsLatent;

  console.log(`\nBlast Radius: ${col(rc)}`);
  console.log(`Tools configured: ${caps.mcps.length}`);
  if (risky) console.log(`Risky: ${risky} can write/deploy`);
  if (latent) console.log(`${pc.dim(`${latent} unused (configured but never called)`)}`);
  console.log(`\nConfigured tools:`);
  for (const m of caps.mcps) {
    const marker = m.observed ? '  ' : pc.dim('  (latent) ');
    console.log(`${marker}${m.name} → ${m.reach}`);
  }
  if (caps.skills && caps.skills.length) {
    console.log(`\nSkills: ${caps.skills.length}`);
  }
  if (caps.hasOrchestration) {
    console.log(`Orchestration: detected`);
  }
}
