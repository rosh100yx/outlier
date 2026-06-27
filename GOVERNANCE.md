# Outlier Governance Model

Outlier is designed to remain an open, zero-trust, local-first framework. To ensure it remains a technical circuit breaker rather than a telemetry honeypot, we adhere to the following governance principles.

## Core Tenets
1. **Local-First Absolute:** No code, commit data, or logs shall ever be transmitted off the user's machine by the `outlier` binary.
2. **Zero-Trust Telemetry:** All parsing of Git history or LLM API usage must be strictly read-only and contained locally.
3. **No Monetization of User Data:** The core telemetry engine will never become a SaaS platform that aggregates user metrics.

## Decision Making
Major architectural changes, especially those involving dependencies that touch network or file-system layers, require:
- A public issue discussion for at least 72 hours.
- A passing `tsc --noEmit` check.
- Approval from at least two core maintainers.

## Contributor Roles
- **Maintainers:** Have push access to the main branch. Responsible for reviewing PRs, enforcing the Core Tenets, and managing releases.
- **Contributors:** Anyone who submits a pull request that gets merged. Contributors are expected to follow the `CODE_OF_CONDUCT.md` and `CONTRIBUTING.md`.

## Modifying the Governance Model
Changes to this `GOVERNANCE.md` require a pull request, community review period, and unanimous consent from active Maintainers.

## AI Authorship & Contribution Credits
As AI takes over code execution, human value shifts to Intent (Architecture) and Oversight (Review). 
- **The Bouncer Pattern:** All PRs must be audited via `outlier status --since main`. Merging code with an excessively high Execution AI Share (>70%) and low Oversight will require documented justification.
- **Credit where due:** Non-code contributions (Documentation, Research, and Architectural Review) are formally credited. Reviewers earn points, ensuring the team is rewarded for steering and reviewing, not just executing.
