// Shared primitives for authorship signals — kept here so both the transcript reader
// (edits.ts) and the effect-observer (observe.ts) use identical line/path semantics
// without importing each other.

import { execSync } from 'child_process';
import { createHash } from 'crypto';

export const linesOf = (s: string): number => (s ? s.split('\n').length : 0);

// A line worth attributing: not blank, not pure punctuation/brackets, long enough that a
// content match is meaningful. Short and bracket-only lines collide across all code.
export function isSubstantive(trimmed: string): boolean {
  if (trimmed.length < 8) return false;
  if (!/[A-Za-z0-9]/.test(trimmed)) return false;
  return true;
}

// Stable short hash of a trimmed line. The ledger stores hashes (not source) so nothing
// readable sits at rest; membership tests hash the candidate line and compare.
export const hashLine = (trimmed: string): string => createHash('sha1').update(trimmed).digest('hex').slice(0, 16);

// Files nobody hand-authored pollute attribution: binaries git misreads as text (PDFs,
// fonts), lockfiles, minified/generated output, vendored deps. Excluded everywhere.
const EXCLUDE_RE = new RegExp([
  '\\.(pdf|png|jpe?g|gif|webp|svg|ico|bmp|tiff?|woff2?|ttf|otf|eot|mp4|mov|webm|mp3|wav|zip|gz|tar|tgz|rar|7z|wasm|lockb|ipynb)$',
  '(^|/)(node_modules|dist|build|out|vendor|\\.next|\\.nuxt|\\.svelte-kit|coverage|__snapshots__)/',
  '(^|/)(package-lock\\.json|yarn\\.lock|pnpm-lock\\.yaml|bun\\.lock|composer\\.lock|poetry\\.lock|Cargo\\.lock|Gemfile\\.lock)$',
  '\\.min\\.(js|css)$',
  '\\.(map)$',
].join('|'), 'i');

export const isCountedPath = (path: string): boolean => !EXCLUDE_RE.test(path);

// numstat may show a rename as "old => new" or "{a => b}/c"; test the new-path tail.
export function isCountedNumstatPath(raw: string): boolean {
  const path = raw.includes('=>') ? raw.replace(/\{[^}]*=> ?([^}]*)\}/, '$1').replace(/.*=> ?/, '').trim() : raw;
  return isCountedPath(path);
}

// Claude Code stores transcripts under ~/.claude/projects/<slug>/, where <slug> is the
// project's absolute path with EVERY non-alphanumeric character replaced by '-' (so '_',
// '.', etc. all become '-' — not just '/'). Replicate that exactly: only matching this
// encoding finds the real folder, so a path like '/Users/me/qafelah_app' resolves to
// '-Users-me-qafelah-app' instead of being silently reported as having no AI activity.
export function claudeProjectSlug(path: string): string {
  return path.replace(/[^a-zA-Z0-9]/g, '-');
}

export function repoRootOf(cwd: string): string {
  try {
    return execSync(`git -C "${cwd}" rev-parse --show-toplevel`, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim() || cwd;
  } catch { return cwd; }
}
