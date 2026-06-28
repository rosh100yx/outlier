# Reddit Graft Drafts

Post these after 48h of commenting. Save permalinks in `docs/WINS.md`.

## r/LocalLLM

Title: I built a local-first CLI that audits what your AI coding agent wrote, plus the carbon bill

Body:
I run a small solo repo and after a few weeks with Claude Code I realised I had no idea how much was mine vs. the agent — and zero visibility on token cost.

So I built a terminal tool that reads git + local Claude logs only, no cloud, and prints a receipt:
- AI authorship %, intent, oversight
- Token spend (new vs. re-read context)
- Agent blast radius (what the agent can deploy/write)
- Carbon estimate per session

Example from my own repo:
- Execution 62% AI
- 3.1M new tokens, 74M re-read
- $18.40 estimated spend
- Blast radius HIGH (5 write/deploy tools reachable)

Link is in comments. Happy to answer questions.

## r/vibecoding

Title: I audited my vibe-coded repo and discovered I'm a Centaur — 60% AI execution, 240 prompts, 96% context re-read

Body:
I vibe-coded a project for a few weeks and finally ran a local audit to see what was happening under the hood.

Receipt:
- Centaur profile: AI writes most, I steer and review
- 240 prompts typed by me
- 18/160 rework commits (oversight)
- Context tax: 96% of tokens were re-sent context, not work

The wait animation is a Nyan Cat ASCII loop.

Tool in comments.
