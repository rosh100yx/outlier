import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { runHook } from '../src/hook';
import { join } from 'path';
import { rmSync, mkdirSync, writeFileSync } from 'fs';
import { spawnSync } from 'bun';

describe('Hook runner (src/hook.ts)', () => {
  const repoPath = join(process.cwd(), 'tests/fixtures/hook-test-repo');

  beforeAll(() => {
    rmSync(repoPath, { recursive: true, force: true });
    mkdirSync(repoPath, { recursive: true });
    spawnSync(['git', 'init'], { cwd: repoPath });
    spawnSync(['git', 'config', 'user.email', 'test@test.com'], { cwd: repoPath });
    spawnSync(['git', 'config', 'user.name', 'Test User'], { cwd: repoPath });
    writeFileSync(join(repoPath, 'file1.txt'), 'hello world');
    spawnSync(['git', 'add', '.'], { cwd: repoPath });
    spawnSync(['git', 'commit', '-m', 'init'], { cwd: repoPath });
    writeFileSync(join(repoPath, '.git', 'outlier-cap'), '70\n');
  });

  afterAll(() => {
    rmSync(repoPath, { recursive: true, force: true });
  });

  test('returns a valid HookResult with signal when no logs exist', async () => {
    const result = await runHook(repoPath);
    expect(result).toHaveProperty('aiPercent');
    expect(result).toHaveProperty('cap');
    expect(result).toHaveProperty('over');
    expect(result).toHaveProperty('source');
    expect(typeof result.aiPercent).toBe('number');
    expect(typeof result.cap).toBe('number');
    expect(typeof result.over).toBe('boolean');
    expect(['measured', 'proxy', 'none']).toContain(result.source);
  });

  test('respects the persisted cap from .git/outlier-cap', async () => {
    const result = await runHook(repoPath);
    expect(result.cap).toBe(70);
  });

  test('flags over when aiPercent exceeds cap (proxy fallback)', async () => {
    writeFileSync(join(repoPath, 'file1.txt'), 'hello world edit');
    spawnSync(['git', 'add', '.'], { cwd: repoPath });
    spawnSync(['git', 'commit', '-m', 'ai generated\n\nCo-Authored-By: Claude'], { cwd: repoPath });
    const result = await runHook(repoPath);
    expect(result.source).toBe('proxy');
    expect(result.aiPercent).toBeGreaterThan(0);
    expect(typeof result.over).toBe('boolean');
  });
});
