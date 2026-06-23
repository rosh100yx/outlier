# Effect-Observer — design spec (2026-06-23)

## Why
Execution attribution (who wrote the lines) is honest only for Claude Code today, because
it reads Claude's transcripts. Most tools write no readable local trace (Copilot inline, web
IDEs) or a proprietary one (Cursor SQLite). The observer makes execution **tool-agnostic** by
measuring the *artifact* — file changes during a bracketed session — instead of any tool's log.

## Scope (v1)
- IN: tool-agnostic **execution** + **learning loop**, via a local "observed" ledger.
- OUT: cost/carbon (the filesystem has no token data — stays transcript-dependent); cadence/
  daemon auto-detection (deferred); pre-observer history (forward-only).

## Provenance model — bracketing
The filesystem shows *what* changed, not *who*. v1 labels a change by **bracketing the agent
window**; everything added in the window is attributed to that tool. Honest, no heuristics.
Friction is removed by wrapping the agent: `outlier watch -- <cmd>`.

Known bias (disclosed): hand-edits made during a bracketed window count as agent (inverse of
today's under-count). Cadence mode can refine later.

## Capture
- **Baseline** = `{ counted file → Set<lineHash> }` of substantive lines, for tracked +
  untracked files (skip >2 MB, apply the existing denylist).
- **Diff at stop** = for each file, `currentLineHashes − baselineLineHashes` = lines ADDED in
  the window = this session's agent output (as hashes).
- `lineHash = sha1(trimmedSubstantiveLine).slice(0,16)`.

## Ledger (the unlock)
Append one line per session to `~/.outlier/observed/<repo-slug>.jsonl`:
```jsonc
{ "ts": "ISO", "tool": "claude", "head": "<sha>", "files": ["src/x.ts"],
  "addedLines": 142, "hashes": ["<lineHash>", …] }
```
- Stores **hashes, not source** → the ledger is non-sensitive (nothing readable at rest).
- `getObservedHashes(repoRoot)` unions all `hashes` into a Set.
- `getAiLines()` returns `claudeTranscriptHashes ∪ observedLedgerHashes`. The instant a session
  is observed, blame-execution **and** the learning loop go tool-agnostic — the provider
  abstraction falls out for free. Bonus: per-tool attribution (`tool` field).

## Modes
1. `outlier watch -- <cmd>` — wrap one terminal agent run (best UX, no residue).
2. `outlier watch start` / `stop` — manual bracket for GUI tools (Cursor IDE, Copilot). `start`
   writes a pending-state file (baseline + time + tool); `stop` diffs, appends, clears. Stale
   pending (>12 h) warns.
3. `outlier watch status` — is a session live; how many observed sessions recorded.

## Integration
- New `src/util.ts`: shared `EXCLUDE_RE`/`isCountedPath`, `isSubstantive`, `linesOf`,
  `repoRootOf`, `hashLine`. `edits.ts` refactors to import these (kills a cycle with observe).
- `src/observe.ts`: snapshot / diff / ledger / start / stop / wrap.
- `edits.ts`: `aiSet` becomes a Set of **hashes**; union the observed ledger; blame membership
  is `aiSet.has(hashLine(line))`.
- `learn.ts`: `aiSet.has(hashLine(snippet))` (snippet still shown live from `git grep`).
- `cli.ts`: `watch` command (wrap / start / stop / status); menu + help entries; receipt notes
  when execution drew on observed sessions.

## Honest limits (surfaced in UI/README)
Forward-only · bracket attributes the whole window to the tool · no tokens/cost · GUI tools
need manual start/stop.
