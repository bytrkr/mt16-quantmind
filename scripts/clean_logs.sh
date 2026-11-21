#!/usr/bin/env bash
set -euo pipefail
echo "=== LOG VE GECICI DOSYA TEMIZLIGI ==="
pm2 flush
find /home/bytrkr/bistapp -maxdepth 2 -name "*.bak_*" -mtime +7 -delete 2>/dev/null || true
df -h / | tail -n 2
