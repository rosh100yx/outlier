// The learning loop — turn the code your agent wrote into a curriculum.
//
// Outlier's deskilling axis is a judgment ("you're a Spectator"). That scolds; it doesn't
// help. This flips it: COACH, not judge. We read what the agent actually wrote to your repo
// and surface ONE technique it used that you can go learn — with the proof in your own code
// and a 30-second challenge. "Duolingo for the code your AI writes."
//
// Fully local: a curated pattern→skill catalog matched against the agent's own tool-writes.
// No network, no LLM call. Each pattern is high-signal and low-false-positive on purpose;
// the catalog grows over time rather than guessing.

import { execSync } from 'child_process';
import { getAiLines } from './edits';
import { hashLine } from './util';
import { homedir } from 'os';

export interface Skill {
  id: string;
  name: string;
  why: string;        // one line: why this technique matters
  challenge: string;  // a 30-second "do you actually get it" task
  value: number;      // teaching priority when several are detected (higher = surface first)
  grep: string;       // POSIX ERE matched against the AI-written code (single-line)
}

// v1 catalog — tight and deliberately conservative. Each entry is a concept a vibe coder
// commonly lets the agent handle without learning. Ordered roughly by leverage.
export const SKILLS: Skill[] = [
  { id: 'auth-hashing', name: 'Password hashing & tokens', value: 9,
    why: 'Never store or compare secrets in plaintext — hash + salt, sign tokens.',
    challenge: 'Why hash+salt instead of encrypt a password? What lives in a JWT payload?',
    grep: 'bcrypt|scrypt|argon2|jsonwebtoken|jwt\\.(sign|verify)|hashSync|createHmac' },
  { id: 'promise-concurrency', name: 'Concurrent async', value: 8,
    why: 'Run awaits in parallel instead of one-by-one — often a big latency win.',
    challenge: 'Rewrite a loop of sequential awaits to run with Promise.all. When is it unsafe?',
    grep: 'Promise\\.(all|allSettled|race)' },
  { id: 'sql-transaction', name: 'Database transactions', value: 8,
    why: 'All-or-nothing writes — partial updates corrupt your data.',
    challenge: 'Why wrap these writes in a transaction? What breaks if one fails midway?',
    grep: '\\b(BEGIN|COMMIT|ROLLBACK)\\b|\\.transaction\\(|beginTransaction' },
  { id: 'memoization', name: 'Memoization', value: 7,
    why: 'Cache expensive results / stop needless re-renders.',
    challenge: 'What re-renders if you delete this useMemo? Explain the dependency array.',
    grep: 'useMemo|useCallback|memoize|lru[-_]?cache' },
  { id: 'streams', name: 'Streams & realtime', value: 7,
    why: 'Handle continuous/large data without loading it all into memory.',
    challenge: 'What problem does backpressure solve? Why stream a large file instead of read it?',
    grep: 'WebSocket|EventSource|createReadStream|createWriteStream|\\.pipe\\(|ReadableStream' },
  { id: 'rate-limit', name: 'Rate limiting', value: 7,
    why: 'Protect endpoints from abuse and runaway cost.',
    challenge: 'Token bucket vs fixed window — one sentence each. Which is fairer under bursts?',
    grep: 'rate[-_]?limit|RateLimiter|express-rate-limit|throttleRequests' },
  { id: 'state-reducer', name: 'Reducers & state machines', value: 6,
    why: 'Model complex state transitions explicitly instead of scattered flags.',
    challenge: 'Why a reducer over useState here? Name one illegal state it prevents.',
    grep: 'useReducer|createMachine|createSlice|createStore' },
  { id: 'debounce', name: 'Debounce / throttle', value: 6,
    why: 'Stop a handler firing on every keystroke / scroll tick.',
    challenge: 'Write debounce(fn, ms) from scratch. How does throttle differ?',
    grep: '\\bdebounce\\b|\\bthrottle\\b' },
  { id: 'regex', name: 'Regular expressions', value: 5,
    why: 'Match and parse text patterns precisely.',
    challenge: 'Read this regex aloud in plain English. Rewrite it with named groups.',
    grep: 'new RegExp\\(|/\\^?.+/[gimsuy]+\\.(test|match|exec)' },
  { id: 'env-config', name: 'Config & secrets separation', value: 4,
    why: 'Keep secrets and per-environment values out of the code.',
    challenge: 'List three things that belong in env vars, not in the repo.',
    grep: 'process\\.env\\.|os\\.environ|import\\.meta\\.env|dotenv' },
];

export interface DetectedSkill { id: string; name: string; why: string; challenge: string; value: number; file: string; line: number; snippet: string; }
export interface Learning {
  found: boolean;          // were any AI sessions present to read at all
  detected: DetectedSkill[];   // skills the agent used in your code, with a location
  next: DetectedSkill | null;  // the top skill you have not marked learned
  totalCatalog: number;
  learnedCount: number;
}

// Find the first place in the repo where an AI-written line matches a skill's pattern.
// git grep only searches tracked files; -I skips binaries. We confirm the matched line is
// actually AI-authored (in aiSet) so we coach on the agent's work, not your own.
function locate(cwd: string, skill: Skill, aiSet: Set<string>): { file: string; line: number; snippet: string } | null {
  let out = '';
  try {
    out = execSync(`git -C "${cwd}" grep -nIE -e ${JSON.stringify(skill.grep)}`, {
      stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 32 * 1024 * 1024,
    }).toString();
  } catch { return null; } // grep exits non-zero on no match
  for (const row of out.split('\n')) {
    const m = row.match(/^(.+?):(\d+):(.*)$/);
    if (!m || !m[1] || !m[2]) continue;
    const snippet = (m[3] || '').trim();
    // Coach on real usage, not the import line that names the technique.
    if (/^(import |from .+ import|export .+ from|const .* = require|require\(|using |#include|@import)/.test(snippet)) continue;
    if (aiSet.has(hashLine(snippet))) return { file: m[1], line: parseInt(m[2], 10), snippet: snippet.slice(0, 76) };
  }
  return null;
}

export function getLearning(cwd: string = process.cwd(), learned: string[] = [], baseDir: string = homedir()): Learning {
  const aiSet = getAiLines(cwd, baseDir);
  const empty: Learning = { found: false, detected: [], next: null, totalCatalog: SKILLS.length, learnedCount: learned.length };
  if (aiSet.size === 0) return empty;

  const detected: DetectedSkill[] = [];
  for (const s of SKILLS) {
    const hit = locate(cwd, s, aiSet);
    if (hit) detected.push({ id: s.id, name: s.name, why: s.why, challenge: s.challenge, value: s.value, ...hit });
  }
  detected.sort((a, b) => b.value - a.value);
  const next = detected.find(d => !learned.includes(d.id)) || null;
  return { found: true, detected, next, totalCatalog: SKILLS.length, learnedCount: learned.length };
}
