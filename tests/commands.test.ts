import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { COMMANDS } from '../src/registry';
import { runAuditCommand } from '../src/commands/audit';
import { runCapabilitiesCommand } from '../src/commands/capabilities';
import { runAuthorshipCommand } from '../src/commands/authorship';
import { runCarbonCommand } from '../src/commands/carbon';
import { installPolicyHook } from '../src/commands/policy';
import { join } from 'path';
import { rmSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { spawnSync } from 'bun';

describe('Command module exports', () => {
  test('registry has all expected commands', () => {
    const expected = [
      'hook',
      'watch',
      'policy',
      'carbon',
      'contributors',
      'authorship',
      'capabilities',
      'audit',
      'status',
      'preflight',
      'learn',
      'participate',
      'impact',
      'init',
      'uninit',
    ];
    for (const cmd of expected) {
      expect(COMMANDS[cmd]).toBeDefined();
      expect(typeof COMMANDS[cmd]).toBe('function');
    }
  });

  test('capabilities command handles missing config gracefully', async () => {
    await expect(runCapabilitiesCommand([])).resolves.toBeUndefined();
  });

  test('authorship command handles non-git cwd gracefully', async () => {
    const originalCwd = process.cwd();
    try {
      process.chdir('/tmp');
      await expect(runAuthorshipCommand([])).resolves.toBeUndefined();
    } finally {
      process.chdir(originalCwd);
    }
  });

  test('carbon command handles missing logs gracefully', async () => {
    await expect(runCarbonCommand([])).resolves.toBeUndefined();
  });
});

describe('Policy hook installer (installPolicyHook)', () => {
  const repoPath = join(process.cwd(), 'tests/fixtures/policy-test-repo');

  beforeAll(() => {
    rmSync(repoPath, { recursive: true, force: true });
    mkdirSync(repoPath, { recursive: true });
    spawnSync(['git', 'init'], { cwd: repoPath });
    spawnSync(['git', 'config', 'user.email', 'test@test.com'], { cwd: repoPath });
    spawnSync(['git', 'config', 'user.name', 'Test User'], { cwd: repoPath });
    writeFileSync(join(repoPath, 'file1.txt'), 'hello');
    spawnSync(['git', 'add', '.'], { cwd: repoPath });
    spawnSync(['git', 'commit', '-m', 'init'], { cwd: repoPath });
  });

  afterAll(() => {
    rmSync(repoPath, { recursive: true, force: true });
  });

  test('writes .git/outlier-cap and pre-commit hook', () => {
    const result = installPolicyHook(repoPath, 50);
    expect(result.capValue).toBe(50);
    expect(result.hookPath).toBe(join(repoPath, '.git', 'hooks', 'pre-commit'));
    expect(result.capPath).toBe(join(repoPath, '.git', 'outlier-cap'));
    expect(result.hookContent).toContain('hook --pre-commit');
    expect(result.hookContent).toContain('outlier.js');
    expect(readFileSync(result.capPath, 'utf8').trim()).toBe('50');
  });

  test('backs up existing hook before overwriting', () => {
    const hookPath = join(repoPath, '.git', 'hooks', 'pre-commit');
    writeFileSync(hookPath, '#!/bin/sh\necho old');
    const result = installPolicyHook(repoPath, 70);
    expect(result.hookContent).not.toContain('echo old');
    expect(existsSync(hookPath + '.backup')).toBe(true);
    expect(readFileSync(hookPath + '.backup', 'utf8').trim()).toBe('#!/bin/sh\necho old');
  });
});
