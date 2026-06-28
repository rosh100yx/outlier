# Zenodo + GitHub Auto-Archive

## Setup
1. Go to https://zenodo.org/ and sign in with GitHub.
2. Go to **Settings → GitHub**.
3. Toggle **outlier** repo ON.
4. Zenodo will mint a DOI on every release tag.

## After setup
- Every `git tag vX.Y.Z && git push --tags` triggers Zenodo.
- Releases are archived with DOI automatically.

## Notes
- Don't enable auto-archive on pre-releases.
- Keep the release notes concise: link to paper, npm, and README highlights.
