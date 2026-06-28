// Thin router: maps argv action → command module.
// cli.ts imports this and dispatches. Each command module imports from shared.ts
// and the domain modules directly (git, carbon, edits, etc.) — no circular deps.

import { runHookCommand } from './commands/hook';
import { runWatchCommand } from './commands/watch';
import { runPolicyCommand } from './commands/policy';
import { runCarbonCommand } from './commands/carbon';
import { runContributorsCommand } from './commands/contributors';
import { runAuthorshipCommand } from './commands/authorship';
import { runCapabilitiesCommand } from './commands/capabilities';
import { runAuditCommand } from './commands/audit';
import { runPreflightCommand } from './commands/preflight';
import { runLearnCommand } from './commands/learn';
import { runParticipateCommand } from './commands/participate';
import { runImpactCommand } from './commands/impact';
import { runInitCommand } from './commands/init';

export type CommandFn = (args: string[]) => Promise<any>;

export const COMMANDS: Record<string, CommandFn> = {
  hook: runHookCommand,
  watch: runWatchCommand,
  policy: runPolicyCommand,
  carbon: runCarbonCommand,
  contributors: runContributorsCommand,
  authorship: runAuthorshipCommand,
  capabilities: runCapabilitiesCommand,
  audit: runAuditCommand,
  status: runAuditCommand,
  preflight: runPreflightCommand,
  learn: runLearnCommand,
  participate: runParticipateCommand,
  impact: runImpactCommand,
  init: runInitCommand,
  uninit: runInitCommand,
};
