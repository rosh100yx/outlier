#!/usr/bin/env bash
# outlier-ar — AI authorship share for any git repository.
#
# Counts commits whose message carries an AI co-author trailer
# (e.g. "Co-Authored-By: Claude") against all commits, and prints
# an overall ratio, a conservative non-merge floor, and a weekly
# breakdown. Reads commit metadata only. Nothing is sent anywhere.
#
# Usage: scripts/outlier-ar.sh [path-to-repo]   (defaults to ".")

set -euo pipefail

REPO="${1:-.}"
TRAILER='Co-Authored-By'

if ! git -C "$REPO" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "error: '$REPO' is not a git repository" >&2
  exit 1
fi

count()  { git -C "$REPO" log "$@" --oneline 2>/dev/null | wc -l | tr -d ' '; }
pct()    { awk -v a="$1" -v b="$2" 'BEGIN{ if (b==0) print "n/a"; else printf "%.1f%%", 100*a/b }'; }

total=$(count)
ai=$(count -i --grep="$TRAILER")
total_nm=$(count --no-merges)
ai_nm=$(count --no-merges -i --grep="$TRAILER")

echo "outlier — AI authorship share"
echo "repo: $REPO"
echo
echo "all commits:        $ai / $total      AR = $(pct "$ai" "$total")"
echo "non-merge (floor):  $ai_nm / $total_nm   AR = $(pct "$ai_nm" "$total_nm")"
echo
echo "weekly (ISO week  AI/total):"

weeks_total=$(git -C "$REPO" log --date=format:'%G-W%V' --format='%ad' | sort | uniq -c)
weeks_ai=$(git -C "$REPO" log -i --grep="$TRAILER" --date=format:'%G-W%V' --format='%ad' | sort | uniq -c)

echo "$weeks_total" | while read -r cnt wk; do
  [ -z "${wk:-}" ] && continue
  aic=$(echo "$weeks_ai" | awk -v w="$wk" '$2==w {print $1}')
  aic=${aic:-0}
  printf "  %s  %s/%s  %s\n" "$wk" "$aic" "$cnt" "$(pct "$aic" "$cnt")"
done
