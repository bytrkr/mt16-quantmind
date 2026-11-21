#!/usr/bin/env bash
set -euo pipefail
MODE="${1:-status}"
if [ "$MODE" = "clean" ]; then
  echo "=== DISK, RAM VE LOG TEMIZLIGI ==="
  pm2 flush || true
  find /home/bytrkr/bistapp -maxdepth 2 -name "*.bak_*" -mtime +7 -delete 2>/dev/null || true
  rm -f /home/bytrkr/bistapp/"=2.0" /home/bytrkr/bistapp/vite.config.ts.timestamp-*.mjs 2>/dev/null || true
fi
echo "--- Sistem Kaynaklari (Uptime / Free / DF) ---"
uptime
free -h
df -h / | tail -n 2
echo "--- Aktif Cron Gorevleri ---"
crontab -l 2>/dev/null || echo "Aktif kullanici crontab kaydi yok."
