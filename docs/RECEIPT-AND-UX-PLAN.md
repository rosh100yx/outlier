# Outlier — Receipt + UX + Accuracy Plan

Status: PLAN. Grounded in the paper (Measuring AI Use) and the current code.
Split into: P0 accuracy bugs · P1 receipt gaps · P2 copy/UX · P3 bigger ideas.

## P0 — accuracy / correctness (these mislead real users)

1. **Carbon/$ reads the wrong file.** `src/carbon.ts` parses `~/.claude/tokenomics-log.jsonl`
   — that is OUR custom caveman Stop-hook file, not a standard Claude Code artifact.
   A normal user has no such file, so tokens/$/carbon all read 0. **Fix: parse the
   standard Claude Code session transcripts** (`~/.claude/projects/*/*.jsonl`), which
   carry `usage` (input/output/cache_read/cache_creation) per assistant turn — the same
   source ccusage uses. Keep the tokenomics-log path as a fallback if present.

2. **Authorship under-counts without trailers.** AR = commits with `Co-Authored-By`.
   Agents that don't write the trailer (e.g. this repo's agy commits) read near 0 even
   when AI-built. The number is only as honest as trailer hygiene. **Fix: add an honest
   line** when the trailer rate looks implausibly low ("Low AI% may mean your agent
   doesn't tag commits, not that you wrote it all"), and document the proxy caveat.

3. **`--help` ≠ reality.** It still says "Interactive menu / wizard" (menu was removed)
   and "status = AI reliance & capability audit" (capabilities dropped from the receipt).
   **Fix: reconcile --help copy with actual behavior.**

## P1 — receipt gaps (from the paper)

- **Non-merge floor.** Paper reports both all-commits and non-merge (conservative) AR.
  Add the floor: `AI  75% (68% excluding merges)`.
- **Benchmark.** A number needs an anchor. Paper: enterprise repos 21–79%, ecosystem ~10%.
  Add one line: `Typical: solo devs 10–40% · AI-framework repos up to ~80%`.
- **Honest caveat line.** One dim line under the receipt: AR is a proxy (commit ≠ thought);
  carbon is a rough estimate (4–20× variance), not a precise audit.
- (Optional) **Capabilities one-liner.** Surface MCP/skill surface count, since `status`
  claims to cover it: `Agent reach: N tools, M skills`.

## P2 — copy / UX

- **Footer "governance modules" line.** Replace
  `(To see all local governance modules, run: outlier --help)` with value-forward copy:
  `outlier does more than this audit — see how you adopt AI, what it costs, and what's
  actually working:  outlier --help`
- **Participate = runnable.** Change `Research: Contribute … ➔ outlier participate` to
  make the command explicit: `Contribute to the deskilling study → type:  outlier participate`.
- **Share nudge.** Add a screenshot prompt above the x.com link:
  `📸 Screenshot this receipt to share your score.`
- **Save locally.** Add `outlier status --save` → writes the (plain-text, no-ANSI) receipt
  to `./outlier-audit.txt`; mention it in the footer (`💾 Save:  outlier status --save`).
- **How-it-works link.** Append to the "No data left your machine" outro a docs link:
  `How it works → github.com/rosh100yx/outlier#how-it-works`. Write that README section:
  exactly which local files are read (git log; ~/.claude transcripts), what is computed,
  and the explicit guarantee that nothing is sent anywhere.
- **Post-install screen.** Make `bin/postinstall.js` a tight welcome: one-line value prop,
  the 3 commands that matter, and `run: outlier`. (npm postinstall must not auto-launch an
  interactive audit — the first `outlier` run does the values intro + audit.)

## P3 — bigger ideas (park; scope later)

- **Prompting-skill metric ("how you write").** Analyze the user's own prompts from the
  logs — length, specificity, steer-vs-fill ratio — to answer "are you a sharp prompter,
  or letting the model guess?" Novel and on-thesis (authorship of *intent*). Privacy-
  sensitive (reads prompt text) → must be local-only, opt-in, and never store/transmit.
  Strongest expansion once the core is solid.
- **MCP server** (read-only metrics for other agents) — still parked from the plugin plan.

## ICP requirements (reference)

- First-time dev: how much did AI write · what did it cost · is that normal · is my data safe.
  → plain language ✓ · $ ✓ · benchmark (P1) · trust/how-it-works (P2).
- Eng manager / CTO (B2B): team authorship % · policy/CI gate · honest methodology.
  → policy ✓ · accuracy caveats (P0/P1).
- Universal: trust (needs the how-it-works link) and a benchmark (number needs an anchor).

## Accuracy summary (answer to "how accurate is the local telemetry?")

- **Authorship:** exact count of trailer'd commits, but a *proxy* for real human-vs-AI
  cognition, and it UNDER-counts when agents omit the trailer. Honest, with caveat.
- **Tokens:** exact IF reading the right log (P0-1); today 0 for most users.
- **Cost ($):** accurate when the log has a real cost field; otherwise a rough blended
  token estimate (labeled "rough").
- **Carbon:** an estimate with wide variance (energy 4–20×), and a *counterfactual* grid
  number (cloud inference runs on the provider's grid, not the user's). Label as rough.

## Suggested order
P0-1 (fix the token source — the biggest silent bug) → P0-3 (--help truth) →
P1 (floor + benchmark + caveat) → P2 copy (cheap wins) → P0-2 honesty line →
P3 later.
