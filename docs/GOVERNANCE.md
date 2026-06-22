# Outlier Governance & Contribution Model

## The Thesis
If `outlier` is an AI Governance tool, this repository must be the gold standard for AI Governance in open-source.
We follow a strict "Honesty > Purity" rule. **AI-generated code is welcome, as long as it is declared.**

## The Agent vs. Human Split
Every Pull Request to this repository follows the dogfooding methodology:
- **The Agent (Bot):** Measures authorship honesty, checks the `Co-Authored-By` trailers, runs tests, and posts a comment on the PR (e.g., *"This PR is 85% AI-generated"*). It **informs**.
- **The Human (Maintainer):** Reviews the architecture, judges the taste, ensures it fits the mission, and clicks Merge. The human **decides**.

## Branching Strategy
We optimize for velocity.
- **`main`** is protected.
- **Single-PR Gate:** Contributors fork, branch, and PR directly to `main`. 
- We use **Squash and Merge** to maintain a clean history.

## Trailers
We mandate `Co-Authored-By: Claude` (or similar) trailers on commits that were heavily written by an LLM. Our bots will audit this.
