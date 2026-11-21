#!/usr/bin/env bash
set -euo pipefail
MODE="${1:-status}"
cd /home/bytrkr/bistapp
git status -s
git log -n 4 --oneline
if [ "$MODE" = "push" ]; then
  git push origin HEAD
fi
