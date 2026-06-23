import { expect, test, describe } from 'bun:test';
import { getTokenAuthorship } from '../src/agentic';

describe('token-based authorship', () => {
  test('returns not-found when no session logs exist for the path', () => {
    const a = getTokenAuthorship('/nonexistent/repo/path', '/nonexistent/home');
    expect(a.found).toBe(false);
    expect(a.aiPercent).toBe(0);
  });
});
