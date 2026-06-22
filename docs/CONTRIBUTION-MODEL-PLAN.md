# Outlier — Contribution & Governance Model (implementation plan)

Status: PLAN. Not yet applied. Hand to agy or implement directly.

Core principle: **outlier dogfoods itself.** Its contribution flow is a live demo of agent–human governance. The agent (CI bot) *measures and informs*; the human (maintainer) *decides*. AI-authored contributions are welcome — the rule is **honesty, not human-purity**.

Integrity stance (locked): **Declare + verify, don't block.** Contributors declare AI involvement; the bot verifies the declaration against `Co-Authored-By` trailers; a mismatch is *flagged for a human*, never auto-rejected.

---

## 1. Branch & working structure

- `main`: always-releasable, **protected**, PR-only (no direct pushes, including maintainer).
- Contributors fork → branch → PR. (Outside contributors can't push branches to origin anyway; fork-and-PR is the only path — correct for OSS.)
- Branch naming: `feat/…`, `fix/…`, `docs/…`, `chore/…` (matches existing commit prefixes).
- Merge strategy: **squash-merge** → linear history the authorship tool parses cleanly.
- Tags `vX.Y.Z` trigger `release.yml`.
- **Cleanup:** delete stale `feat/cli-init`.

```bash
git push origin --delete feat/cli-init 2>/dev/null; git branch -D feat/cli-init 2>/dev/null
```

## 2. Branch protection (apply via gh)

```bash
gh api -X PUT repos/rosh100yx/outlier/branches/main/protection \
  -H "Accept: application/vnd.github+json" \
  -f 'required_status_checks[strict]=true' \
  -f 'required_status_checks[contexts][]=Codebase AI Authorship Review' \
  -f 'required_status_checks[contexts][]=test' \
  -F 'enforce_admins=true' \
  -F 'required_pull_request_reviews[required_approving_review_count]=1' \
  -F 'restrictions=null' \
  -F 'allow_force_pushes=false' \
  -F 'allow_deletions=false'
```
(Solo-maintainer note: `enforce_admins=true` means even you go through PRs. If that's too slow at this stage, set `false` and tighten later — but `true` is the integrity signal.)

## 3. Files to add

### `.github/PULL_REQUEST_TEMPLATE.md`
```markdown
## What this PR does


## Authorship declaration (required)
Outlier governs AI authorship, so we practice it. Please declare how this PR was produced:

- [ ] Human-written (no AI assistance)
- [ ] AI-assisted (human-directed, AI helped)
- [ ] Mostly AI-generated (human-reviewed)

If AI helped, add a trailer to your commits so the audit reads honestly:
`Co-Authored-By: <agent> <email>`

> We welcome AI-assisted PRs. The only rule is honesty — the bot checks your
> declaration against your commit trailers and flags mismatches for a human.
> Nothing here is auto-rejected for being AI-written.

## Checklist
- [ ] `bun test` passes
- [ ] `bunx tsc --noEmit` is clean
- [ ] I signed off my commits (`git commit -s`) — DCO
- [ ] I read CONTRIBUTING.md
```

### `.github/CODEOWNERS`
```
# Default owner — every PR gets a human review.
*       @rosh100yx
# (Later: assign module owners, e.g. /src/carbon.ts @someone)
```

### `GOVERNANCE.md`
```markdown
# Governance

## Decision model
Outlier is maintainer-led (BDFL-lite) while small. Maintainer: @rosh100yx.
Decisions happen in the open via Issues and PRs. Roadmap-level changes get an
Issue with the `discussion` label before code.

## Roles
- **Contributor** — anyone who opens an issue or PR.
- **Maintainer** — review + merge rights; listed in CODEOWNERS.
- Path to maintainer: sustained, quality contributions + alignment with the
  mission (human mastery, local-first, honesty).

## The authorship-honesty contract
Outlier measures AI authorship. We hold ourselves to the same standard:
1. **Declare** AI involvement in every PR (template checkbox).
2. **Trailer** AI-assisted commits (`Co-Authored-By`).
3. The **bot verifies** declaration vs trailers and posts a report.
4. A **mismatch is flagged for a human**, never auto-rejected.
5. AI-authored contributions are welcome. We optimize for *honest* authorship,
   not for *human-only* authorship. Agents inform; humans decide.

## Review = agent + human
- **Agent (CI bot):** measures authorship honesty, capability/surface-area diff
  (new deps/MCPs), token/bloat, tests. Posts a PR comment. Informs only.
- **Human (CODEOWNER):** judges taste, architecture, mission-fit, readability.
  Approves or requests changes. Holds the merge decision.

## Security
See SECURITY.md for private vulnerability disclosure.
```

## 4. Upgrade `outlier-audit.yml` → bot review comment

Today it runs an audit pass/fail. Upgrade it to **post a PR comment** = the live demo.

Add to the job (needs `permissions: pull-requests: write`):
1. Run `bun test` and `bunx tsc --noEmit` as required gates.
2. Run `outlier audit --strict` on the PR head.
3. Parse the PR body for the authorship checkbox; compare against
   `git log origin/main..HEAD` `Co-Authored-By` trailer ratio.
4. Post/update a sticky comment:

```
## 🤖 Outlier self-audit
- Declared: AI-assisted ✓   (trailers show ~62% AI-co-authored)
- Honesty: ✅ declaration matches trailers
- New capabilities: 0 new deps, 0 new MCP surface
- Tokens/bloat: n/a (docs PR)
- Tests: ✅  Typecheck: ✅
Agents informed. A human maintainer decides. 👤
```
If declaration ≠ trailers → comment says `⚠ mismatch — needs maintainer review`,
label `needs-human-review`. **Does not fail the build for authorship.** It *does*
fail for red tests/typecheck.

Implementation note: a small `scripts/pr-audit.ts` that emits the markdown, +
`actions/github-script` or `peter-evans/create-or-update-comment` to post it.

## 5. Dogfood the trailers (habit, starting now)
This repo's own commits currently have **zero `Co-Authored-By` trailers**, so its
self-audit reads ~4% — dishonestly low. From now, AI-assisted commits in outlier
should carry the trailer. This makes the tool's own number truthful and turns the
repo into the reference example.

## 6. Labels (already present — seed real starter tasks)
`good first issue` exists. Seed 3–5 concrete ones so contributors have an on-ramp:
- "Add grid factor for <country> to `data/grid-factors.json`"
- "Add a `TokenLogParser` for Cursor / Codex logs"
- "Split `cli.ts` into `commands/` modules"
- "Rename stale `co2KgVietnam`/`co2KgFrance` fields to region-generic"

---

## Sequence & effort
1. Branch protection + delete stale branch — 5 min.
2. PR template + CODEOWNERS — 10 min.
3. GOVERNANCE.md — 15 min.
4. `outlier-audit.yml` bot-comment upgrade + `pr-audit.ts` — the meaty one, ~half day.
5. Seed good-first-issues — 15 min.
6. Trailer habit — ongoing.

Highest trust ROI: **1 + 3 + 4** (protection, the contract, the bot that demos it).

## Why this is the moat
The contribution process *is* the product demo. A contributor's first PR
**experiences outlier governing** — the agent measures, the human decides, honesty
is enforced without gatekeeping. No other dev-tool's contribution flow dogfoods its
own thesis. That's both the best onboarding and the most credible proof the tool works.
```
