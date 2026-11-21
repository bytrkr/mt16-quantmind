#!/usr/bin/env bash
set -u

BACKUP_DIR="_fix_step8_backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

if [ -f "public/kurtar.html" ]; then
  mkdir -p "$BACKUP_DIR/public"
  cp -p "public/kurtar.html" "$BACKUP_DIR/public/kurtar.html"
fi

echo "=== [1] KURTAR.HTML CSS NET ONARIM ==="
python3 - <<'PYEOF'
path = "public/kurtar.html"
with open(path, "r", encoding="utf-8") as f:
    html = f.read()

html = html.replace("width:100%argin:8px 0", "width:100%;margin:8px 0")
html = html.replace("font-size:12pxargin-top:10px", "font-size:12px;margin-top:10px")

with open(path, "w", encoding="utf-8") as f:
    f.write(html)
print("Kurtar.html yazildi.")
PYEOF
grep -rn "argin" public/kurtar.html 2>/dev/null || echo "Bozuk CSS ifadesi kalmadi."

echo "=== [2] BISTAPP-API PM2 BASLATMA ==="
if command -v pm2 >/dev/null 2>&1; then
  pm2 delete bistapp-api 2>/dev/null || true
  pm2 start python3 --name bistapp-api -- -m uvicorn python.api_server:app --host 127.0.0.1 --port 8001
  sleep 3
  pm2 status
  pm2 logs bistapp-api --lines 20 --nostream 2>/dev/null || true
fi

echo "=== [3] AUDIT (8001 HEALTH & PY_COMPILE) ==="
curl -i -s -m 4 http://127.0.0.1:8001/health | head -n 20 || true
python3 -m py_compile python/ai_coder_agent.py python/api_server.py && echo "PY_COMPILE_OK"
echo "STEP8_TAMAMLANDI"
