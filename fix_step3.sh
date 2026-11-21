#!/usr/bin/env bash
set -u

echo "=== [1] PORT 3001 / PM2 LOG KONTROLU ==="
pm2 logs ai-studio-v8 --lines 25 --nostream 2>/dev/null || true
pm2 logs otonom-beyin --lines 20 --nostream 2>/dev/null || true

echo "=== [2] PORT 8001 PYTHON SERVER DOSYALARI ==="
ls -la python/api_server.py python/server.py server.py 2>/dev/null || true
grep -rn "app\s*=\s*FastAPI" python/ server/ 2>/dev/null || true

echo "=== [3] PUBLIC/KURTAR.HTML ICERIGI ==="
cat public/kurtar.html 2>/dev/null || true
echo ""

echo "=== [4] 'http://127.0' SATIRLARININ TAM HALINI GOR ==="
grep -rn -C 2 "127\.0[^0-9.]\|127\.0\"\|127\.0'" python/auto_repo_absorber.py python/fstory_full_integration.py 2>/dev/null || true
