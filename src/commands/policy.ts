import { select, spinner, isCancel, cancel, note } from '@clack/prompts';
import pc from 'picocolors';
import { writeFileSync, existsSync, copyFileSync, chmodSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { getAuthorshipStats } from '../git';
import { getCapabilitiesStats } from '../capabilities';

export interface PolicyInstallResult {
  hookPath: string;
  capPath: string;
  hookContent: string;
  capValue: number;
}

export function installPolicyHook(cwd: string, maxAuthorship: number): PolicyInstallResult {
  const gitDir = join(cwd, '.git');
  if (!existsSync(gitDir)) throw new Error('Must be run inside a git repository');

  const hookPath = join(gitDir, 'hooks', 'pre-commit');
  if (existsSync(hookPath)) copyFileSync(hookPath, `${hookPath}.backup`);

  writeFileSync(join(gitDir, 'outlier-cap'), String(maxAuthorship) + '\n');

  // Resolve the outlier.js binary path at install-time so the generated shell hook can use it.
  // require.main.filename is the running entry point (bin/outlier.js); go up two dirs to project root.
  // Bun polyfills __dirname in ESM so the fallback works in dev. Empty string → shell [ -x "" ] is
  // false, so the hook falls through to `outlier` CLI or `npx outlier-audit` gracefully.
  const mainFile = (typeof require !== 'undefined' && require.main?.filename) || (typeof __dirname !== 'undefined' ? __dirname : '');
  const resolvedBin = mainFile ? join(dirname(dirname(mainFile)), 'bin', 'outlier.js') : '';
  const hookContent = `#!/bin/sh
# outlier Pre-Commit Governance Hook
# Calls the CLI's own hook command so the check uses the measured signal (edits.ts).

OUTLIER_CMD=""
if [ -x "${resolvedBin}" ]; then
  OUTLIER_CMD="node \"${resolvedBin}\""
elif command -v outlier >/dev/null 2>&1; then
  OUTLIER_CMD="outlier"
else
  OUTLIER_CMD="npx outlier-audit"
fi

exec "$OUTLIER_CMD" hook --pre-commit
`;

  writeFileSync(hookPath, hookContent);
  try { chmodSync(hookPath, 0o755); } catch {}

  return { hookPath, capPath: join(gitDir, 'outlier-cap'), hookContent, capValue: maxAuthorship };
}

export async function runPolicyCommand(_args: string[]): Promise<void> {
  const tier = await select({
    message: 'Select the governance tier to configure:',
    options: [
      { value: 'personal', label: 'Personal (Self-imposed)', hint: 'Set your own limits for skill retention' },
      { value: 'team', label: 'Team Guardrails', hint: 'Engineering lead sets thresholds for human review' },
      { value: 'enterprise', label: 'Enterprise Compliance', hint: 'Production thresholds (e.g., max 60% AI authorship)' },
      { value: 'regulatory', label: 'Regulatory Audit', hint: 'Decree 142 human-oversight logging' },
    ],
  });

  if (isCancel(tier)) { cancel('Policy configuration cancelled.'); process.exit(0); }

  if (tier === 'personal' || tier === 'team' || tier === 'enterprise') {
    const maxAuthorship = await select({
      message: `Set the maximum allowed AI Authorship Share for ${tier} profile:`,
      options: [
        { value: '50', label: '50% (Strict Human-Majority)' },
        { value: '70', label: '70% (Standard Hybrid)' },
        { value: '85', label: '85% (High Velocity)' },
        { value: '100', label: '100% (Unrestricted)' },
      ],
    });

    if (isCancel(maxAuthorship)) { cancel('Policy configuration cancelled.'); process.exit(0); }

    const s = spinner();
    s.start(`Applying ${tier} policy guardrails...`);

    const result = installPolicyHook(process.cwd(), parseInt(String(maxAuthorship), 10));

    await new Promise(resolve => setTimeout(resolve, 400));
    s.stop('Policy Applied');

    note(
      `Tier:         ${pc.bold(tier.toString().toUpperCase())}
Rule 1:       ${pc.green(`AI Authorship must not exceed ${maxAuthorship}%`)}
Rule 2:       ${pc.green('Require human review on consecutive high-AI sprints')}
Enforcement:  ${pc.cyan('Local pre-commit hook installed (backup created)')}`,
      'Active Governance Policy'
    );
  } else if (tier === 'regulatory') {
    const gitStats = await getAuthorshipStats().catch(() => null);
    const caps = await getCapabilitiesStats().catch(() => null);
    const humanReviewRate = gitStats ? +(1 - gitStats.ratio).toFixed(3) : null;
    const oversightOk = humanReviewRate !== null && humanReviewRate >= 0.30;
    const record = {
      timestamp: new Date().toISOString(),
      policy: 'Vietnam Decree 142/2026 — human oversight of high-risk AI',
      repo: process.cwd().split('/').pop(),
      humanAuthorshipRate: humanReviewRate,
      aiAuthorshipRate: gitStats ? +gitStats.ratio.toFixed(3) : null,
      humanOversight: oversightOk ? 'present' : 'insufficient',
      agentBlastRadius: caps ? caps.blastRadius : 'unknown',
      dataExported: false,
      note: 'Derived from local git history only. No code, prompts, or citizen data leave the machine. Authorship is a proxy for human oversight.',
    };
    const reportPath = join(process.cwd(), 'outlier-audit-report.jsonl');
    writeFileSync(reportPath, JSON.stringify(record) + '\n');

    note(
      `Jurisdiction: ${pc.bold('Vietnam (Decree 142/2026)')}
Human oversight: ${oversightOk ? pc.green('present') : pc.red('insufficient')} ${pc.dim(`(${humanReviewRate !== null ? (humanReviewRate * 100).toFixed(0) + '% human-authored' : 'no git history'})`)}
Agent reach:  ${caps ? caps.blastRadius : 'unknown'}
Privacy:      ${pc.green('preserved — nothing exported')}
Artifact:     ${pc.cyan(reportPath)}`,
      'Human-Oversight Audit Record'
    );
  }
}
