# Outlier as a Claude Code Plugin — Distribution Plan

Status: PLAN. Not built. The ambient-presence play, modeled on how the caveman plugin works.

## Why this exists
Outlier-the-CLI is a one-shot: you `npx` it, get a receipt, leave, forget. The thing
we want is **ambient presence** — the reliance number living where developers already
look, every day, with zero effort. The caveman plugin proves the pattern: it puts a
persistent badge in the terminal status bar and fires on session start, using only
local scripts. No MCP, no network, no chat UI.

Outlier should ship as a **Claude Code plugin** that rides Claude Code's distribution
(the plugin marketplace) and turns the audit into a daily, glanceable habit — while
staying 100% local-first.

## How caveman actually works (the reference architecture)
Verified from `~/.claude/settings.json` + the plugin's hook scripts. Three surfaces,
one plugin bundle. **It is NOT MCP.**

1. **statusLine** (`settings.json → statusLine.command → caveman-statusline.sh`):
   Claude Code runs the script every render and paints its stdout in the persistent
   bottom bar. Reads a flag file + cached values. This is the always-on glance.
2. **SessionStart hook** (`caveman-activate.js`): runs once when a session opens.
   Writes a flag file and can inject context / print a greeting.
3. **UserPromptSubmit / Stop hooks**: fire per-turn; can inject context or print.

Outlier maps onto surfaces 1 and 2 (and optionally 3). MCP stays out — it's a fourth
surface (callable tools) we explicitly defer.

## What we build

### Surface 1 — statusLine reliance meter (the flywheel core)
A script that paints, in the bottom bar, next to cost:
```
🤖 75% AI · 🌱 3.8kg
```
- AI reliance % (from git authorship) + today's carbon (from the token log).
- This is the always-on, ambient number — the equivalent of ccstatusline's cost
  segment, but for reliance/carbon. It's the part that creates daily passive exposure.

**Hard constraint: <50ms per render.** The status line runs constantly, so it must
NOT re-walk git or parse logs on every keystroke. Use the **cache pattern** (same as
the cost cache in claude-config): a hook recomputes the numbers occasionally and writes
them to small cache files (`~/.outlier/reliance-cache`, `~/.outlier/carbon-cache`); the
statusLine script only reads those cached strings. Atomic writes (temp + rename) so a
half-written cache never blanks the bar.

### Surface 2 — SessionStart pre-flight greeting (the ritual)
When the developer opens Claude Code, a SessionStart hook prints a one-line greeting:
```
[outlier] You're at 75% AI reliance this week · 3.8kg CO2 today.
          Audit before you delegate:  npx @rosh100yx/outlier
```
- Automates the "pre-flight ritual" (the daily reliance check before delegating).
- Once-per-day guard via a timestamp in `~/.outlier_config` so it doesn't nag every
  session. Keep under ~150ms.

### Surface 3 — Stop hook nudge (optional, off by default)
After a turn, optionally append a tiny reliance delta. Off by default; opt-in via
config. Risk: per-turn noise. Ship only if it doesn't annoy.

### The cache updater (the engine behind surface 1+2)
A small `outlier cache` subcommand (or a hook) that:
- Computes reliance % (git) + carbon (token log) for cwd/repo.
- Writes the cached display strings atomically.
- Runs on SessionStart and/or on a cheap interval — never on every render.
Reuses outlier's existing `getAuthorshipStats` / `getCarbonStats`.

## Packaging
- A `.claude-plugin/marketplace.json` (or plugin manifest) in the repo so users install
  with `/plugin marketplace add rosh100yx/outlier` then enable it.
- The plugin wires: `statusLine` → outlier's reliance script; `SessionStart` → the
  greeting hook. Document the exact `settings.json` additions for manual installers too.
- Keep the standalone `npx @rosh100yx/outlier` CLI as the home for the FULL receipt,
  policy hooks, capabilities, impact/literature. The plugin is the ambient teaser; the
  CLI is the deep dive. The greeting drives people from the bar into the full audit.

## Laws (non-negotiable)
- **Local-first / zero-trust stays absolute.** Hooks + statusLine run local scripts.
  No network, no MCP, no LLM keys, no telemetry. This is the moat — the plugin must not
  weaken it. (Contrast: the chat-TUI pivot would have broken this; that's why we parked it.)
- **Performance is a feature.** statusLine <50ms (cached), SessionStart <150ms. A slow
  bar gets the plugin uninstalled — same lesson as the 8s-delay friction in the CLI.
- **No nagging.** Once-per-day greeting; Stop nudge off by default. Ambient, not annoying.

## Why this beats the alternatives we considered
- **vs standalone CLI only:** the CLI is opt-in and forgotten; the plugin is ambient and
  daily. Distribution rides Claude Code's marketplace instead of cold `npx`.
- **vs chat-TUI / MCP-agent pivot (parked):** no UI rebuild, no @clack→Ink migration, no
  cloud, no competing with Cursor/Claude as a chat client. Keeps outlier hyper-focused on
  measurement + governance.
- **vs the "place it where claude runs" idea:** this IS that idea, done cleanly — outlier
  lives in the same status bar and session lifecycle the developer already watches.

## Sequence
1. Build `outlier cache` (compute + atomic-write the two cache strings). ~half day.
2. Build the statusLine reliance script (read cache, paint bar, <50ms). ~half day.
3. Build the SessionStart greeting hook (once-per-day guard). ~couple hours.
4. Add the plugin manifest / marketplace.json + install docs. ~couple hours.
5. (Optional, later) Stop-hook nudge, opt-in.
6. Keep zero-trust + perf laws in GOVERNANCE.md; add a plugin section.

Highest-leverage piece: **Surface 1 (the cached reliance meter in the status bar).**
That's the ambient daily exposure that turns a one-shot tool into a habit — the actual
flywheel. Everything else supports it.

## Open question for later
MCP (surface 4) — exposing outlier's metrics as read-only tools another agent can query
("how much of this PR did I write?") — stays parked. It's additive to this plan, not a
replacement, and only worth building once the plugin has users.
```
