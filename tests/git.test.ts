import { test, expect } from 'bun:test';
import { getAuthorshipStats, checkIsGitRepo } from '../src/git';

test('checkIsGitRepo returns true for valid repo', async () => {
  const isRepo = await checkIsGitRepo(process.cwd());
  expect(isRepo).toBe(true);
});

test('getAuthorshipStats handles missing repos gracefully', async () => {
  expect(getAuthorshipStats('/tmp/definitely-not-a-repo')).rejects.toThrow();
});
