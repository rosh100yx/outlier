#!/usr/bin/env bash
# Publish the SAME current build under two npm names:
#   1. outlier-audit          — the maintained, discoverable name (npx outlier-audit)
#   2. @rosh100yx/outlier      — so the command printed in the submitted paper
#                                (npx @rosh100yx/outlier) resolves to the current product
#
# Each `npm publish` rebuilds the bundle via prepublishOnly, so both get current code.
# package.json is always restored to `outlier-audit` on exit (even on failure).
#
# Usage:
#   bash scripts/dual-publish.sh                 # prompts for an OTP before each publish
#   bash scripts/dual-publish.sh CODE1 CODE2     # non-interactive (two fresh TOTP codes)
#
# Note: npm 2FA gives one valid TOTP code per ~30s window and invalidates a code after
# use, so publish #2 needs a FRESH code — wait for your authenticator to roll over.

set -euo pipefail
cd "$(dirname "$0")/.."

setname() { node -e "const fs=require('fs');const p=require('./package.json');p.name='$1';fs.writeFileSync('./package.json',JSON.stringify(p,null,2)+'\n')"; }
restore() { setname "outlier-audit"; }
trap restore EXIT

VERSION="$(node -e "console.log(require('./package.json').version)")"
OTP1="${1:-}"; OTP2="${2:-}"

echo "Dual-publish outlier @ ${VERSION}"
echo

echo "[1/2] outlier-audit  (discoverable: npx outlier-audit)"
[ -z "$OTP1" ] && read -r -p "  npm OTP for publish #1: " OTP1
setname "outlier-audit"
npm publish --otp="$OTP1"
echo "  done."
echo

echo "[2/2] @rosh100yx/outlier  (keeps the paper's npx command current)"
[ -z "$OTP2" ] && read -r -p "  FRESH npm OTP for publish #2: " OTP2
setname "@rosh100yx/outlier"
npm publish --access public --otp="$OTP2"
echo "  done."
echo

# trap restores the name to outlier-audit
echo "Both names now serve build ${VERSION}. package.json restored to outlier-audit."
