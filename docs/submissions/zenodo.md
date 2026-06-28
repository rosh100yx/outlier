# Zenodo + GitHub Auto-Archive

## Setup
1. Go to https://zenodo.org/ and sign in with GitHub.
2. Go to **Settings → GitHub**.
3. Toggle **outlier** repo ON.
4. Zenodo will mint a DOI on every release tag.

## After setup
- Every `git tag vX.Y.Z && git push --tags` triggers Zenodo.
- Add the Zenodo DOI badge to README when the first release is minted.

## Badge template
```markdown
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.XXXXXX.svg)](https://doi.org/10.5281/zenodo.XXXXXX)
```

## Notes
- Don't enable auto-archive on pre-releases.
- Keep the release notes concise: link to paper, npm, and README highlights.
