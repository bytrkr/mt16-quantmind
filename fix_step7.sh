#!/usr/bin/env bash
set -u

BACKUP_DIR="_fix_step7_backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

if [ -f "public/kurtar.html" ]; then
  mkdir -p "$BACKUP_DIR/public"
  cp -p "public/kurtar.html" "$BACKUP_DIR/public/kurtar.html"
fi

echo "=== [1] KURTAR.HTML CSS ONARIMI ==="
python3 - <<'PYEOF'
path = "public/kurtar.html"
with open(path, "r", encoding="utf-8") as f:
    html = f.read()

old_w = "width:100" + "%argin:8px 0"
new_w = "width:100%;margin:8px 0"
old_f = "font-size:12pxargin-top:10px"
new_f = "font-size:12px;margin-top:10px"

new_html = html.replace(old_w, new_w).replace(old_f, new_f)
if new_html != html:
    with open(path, "w", encoding="utf-8") as f:
        f.write(new_html)
    print("Guncellendi:", path)
else:
    print("Degisiklik gerekmedi:", path)
PYEOF
grep -rn "argin" public/kurtar.html 2>/dev/null || echo "Bozuk CSS ifadesi kalmadi."

echo "=== [2] UVICORN & FASTAPI KURULUMU ==="
if python3 -m pip --version >/dev/null 2>&1; then
  python3 -m pip install --upgrade uvicorn fastapi || python3 -m pip install --break-system-packages --upgrade uvicorn fastapi
elif command -v apt-get >/dev/null 2>&1; then
  apt-get update -qq && apt-get install -y -qq python3-uvicorn python3-fastapi || true
fi

python3 -m uvicorn --version || true

echo "=== [3] BISTAPP-API PM2 BASLATMA ==="
if command -v pm2 >/dev/null 2>&1 && python3 -m uvicorn --version >/dev/null 2>&1; then
  pm2 delete bistapp-api 2>/dev/null || true
  pm2 start python3 --name bistapp-api -- -m uvicorn python.api_server:app --host 127.0.0.1 --port 8001
  sleep 2
  pm2 status
  pm2 logs bistapp-api --lines 15 --nostream 2>/dev/null || true
fi

echo "=== [4] AUDIT (8001 HEALTH & PY_COMPILE) ==="
curl -i -s -m 3 http://127.0.0.1:8001/health | head -n 15 || true
python3 -m py_compile python/ai_coder_agent.py python/api_server.py
echo "AUDIT_TAMAMLANDI"
