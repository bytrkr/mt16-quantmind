#!/usr/bin/env bash
set -euo pipefail
echo "=================================================="
echo "MT16 CANLI PORT & SERVIS SAGLIK MATRISI"
echo "Tarih (UTC): $(date -u '+%Y-%m-%d %H:%M:%S')"
echo "=================================================="
for p in 3000 3001 8001; do
  t_start=$(date +%s%3N)
  code=$(curl -sS -m 4 -o /dev/null -w "%{http_code}" "http://127.0.0.1:${p}/" 2>/dev/null || echo "000")
  t_end=$(date +%s%3N)
  ms=$((t_end - t_start))
  if [ "$code" != "000" ]; then
    echo "[OK]   Port ${p} -> HTTP ${code} (${ms} ms)"
  else
    echo "[WARN] Port ${p} -> HTTP Yanit Yok (${ms} ms)"
  fi
done
echo ""
echo "--- 8001 /api/track-record Ozeti ---"
curl -sS -m 5 http://127.0.0.1:8001/api/track-record 2>/dev/null | head -c 500 || echo "8001 API erisilemedi"
echo ""
echo ""
echo "--- PM2 Surec Durumu ---"
pm2 status || true
