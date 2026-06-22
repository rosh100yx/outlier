import { expect, test, describe } from 'bun:test';

// The --json contract must be clean, parseable, and ANSI-free so agents/CI can consume it.
describe('--json agent contract', () => {
  test('emits valid JSON with the documented shape and no ANSI', async () => {
    const proc = Bun.spawn(['bun', 'run', 'src/cli.ts', 'status', '--json'], {
      cwd: process.cwd(),
      stdout: 'pipe',
      stderr: 'ignore',
    });
    const out = await new Response(proc.stdout).text();
    await proc.exited;

    // No ANSI escape codes (the ESC byte), so agents/CI can parse it.
    expect(out.includes(String.fromCharCode(27))).toBe(false);
    // Starts with '{' (no logo/banner leaked).
    expect(out.trimStart().startsWith('{')).toBe(true);

    const d = JSON.parse(out);
    expect(d.tool).toBe('outlier');
    expect(typeof d.version).toBe('string');
    expect(d.localFirst).toBe(true);
    expect(d).toHaveProperty('authorship');
    expect(d).toHaveProperty('cost');
    expect(d).toHaveProperty('carbon');
    expect(d).toHaveProperty('reach');
    expect(d.policy).toHaveProperty('status');
  });
});
