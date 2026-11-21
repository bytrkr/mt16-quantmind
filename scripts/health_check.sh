#!/usr/bin/env bash
set -euo pipefail
echo "=== MT16 SISTEM & PORT SAGLIK TARAMASI ==="
date
ss -tulpn | grep -E "3000|3001|8001" || true
pm2 jlist 2>/dev/null | head -c 1200 || pm2 status
echo ""
echo "--- 8001 /api/track-record ---"
curl -sS -m 5 http://127.0.0.1:8001/api/track-record | head -c 800 || echo "8001 yanit vermedi"
echo ""
echo "--- 3000 & 3001 HTTP ---"
curl -sS -m 5 -o /dev/null -w "Port 3000 HTTP: %{http_code} | Sure: %{time_total}s\n" http://127.0.0.1:3000/ || true
curl -sS -m 5 -o /dev/null -w "Port 3001 HTTP: %{http_code} | Sure: %{time_total}s\n" http://127.0.0.1:3001/ || true
