import { expect, test, describe } from 'bun:test';
import { claudeProjectSlug } from '../src/util';

describe('claudeProjectSlug', () => {
  // Regression: underscores (and other non-alphanumerics) must become '-', matching
  // Claude Code's real folder encoding — otherwise repos with '_' in their path are
  // silently reported as having no AI activity.
  test('replaces underscores with dashes like Claude Code does', () => {
    expect(claudeProjectSlug('/Users/sohaib/IdeaProjects/qafelah_app')).toBe(
      '-Users-sohaib-IdeaProjects-qafelah-app',
    );
  });

  test('encodes a plain slash-only path', () => {
    expect(claudeProjectSlug('/Users/sohaib/outlier')).toBe('-Users-sohaib-outlier');
  });
});
