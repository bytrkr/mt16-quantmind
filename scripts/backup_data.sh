#!/usr/bin/env bash
set -euo pipefail
STAMP=$(date +%Y%m%d_%H%M%S)
DEST="/home/bytrkr/bistapp/backups/mt16_backup_${STAMP}.tar.gz"
tar -czf "$DEST" -C /home/bytrkr/bistapp data python/decision_logs.db python/agent_weights.json 2>/dev/null || true
find /home/bytrkr/bistapp/backups -name "mt16_backup_*.tar.gz" -mtime +14 -delete
echo "Yedek alindi: $DEST"
