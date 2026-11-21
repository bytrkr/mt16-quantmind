#!/usr/bin/env bash
set -euo pipefail
MODE="${1:-status}"
cd /home/bytrkr/bistapp
git status -s
git log -n 4 --oneline
if [ "$MODE" = "push" ]; then
  git add -A
  git commit -m "chore(cockpit): sync 11-17 quant, script, history and export tools" || true
  git push origin HEAD
fi
