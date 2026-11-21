#!/usr/bin/env bash
set -u

BACKUP_DIR="_fix_step6_backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

if [ -f "public/kurtar.html" ]; then
  mkdir -p "$BACKUP_DIR/public"
  cp -p "public/kurtar.html" "$BACKUP_DIR/public/kurtar.html"
fi

echo "=== [1] PYTHON / VENV / UVICORN KONUMLARINI TARA ==="
which -a python3 uvicorn 2>/dev/null || true
find / -name "uvicorn" 2>/dev/null | head -n 20 || true

PY_BIN=""
for cand in \
  "./venv/bin/python3" \
  "./.venv/bin/python3" \
  "/root/venv/bin/python3" \
  "/opt/venv/bin/python3" \
  "/usr/local/bin/python3" \
  "/usr/bin/python3"
do
  if [ -x "$cand" ] && "$cand" -m uvicorn --version >/dev/null 2>&1; then
    PY_BIN="$cand"
    break
  fi
done

if [ -z "$PY_BIN" ]; then
  FOUND_UV=$(find / -name "uvicorn" -type f -executable 2>/dev/null | head -n 1 || true)
  if [ -n "$FOUND_UV" ]; then
    DIR_UV=$(dirname "$FOUND_UV")
    if [ -x "$DIR_UV/python3" ]; then
      PY_BIN="$DIR_UV/python3"
    fi
  fi
fi

echo "Secilen PY_BIN: ${PY_BIN:-BULUNAMADI}"

echo "=== [2] KURTAR.HTML CSS ONARIMI ==="
python3 - <<'PYEOF'
path = "public/kurtar.html"
with open(path, "r", encoding="utf-8") as f:
    html = f.read()

new_html = (
    html.replace("width:100%argin:8px 0", "width:100%;margin:8px 0")
        .replace("font-size:12pxargin-top:10px", "font-size:12px;margin-top:10px")
)
if new_html != html:
    with open(path, "w", encoding="utf-8") as f:
        f.write(new_html)
    print("Guncellendi (CSS):", path)
else:
    print("Degisiklik gerekmedi:", path)
PYEOF
grep -rn "argin" public/kurtar.html 2>/dev/null || echo "Bozuk CSS ifadesi kalmadi."

echo "=== [3] BISTAPP-API YENIDEN BASLATMA ==="
if [ -n "$PY_BIN" ] && command -v pm2 >/dev/null 2>&1; then
  pm2 delete bistapp-api 2>/dev/null || true
  pm2 start "$PY_BIN" --name bistapp-api -- -m uvicorn python.api_server:app --host 127.0.0.1 --port 8001
  sleep 2
  pm2 status
  pm2 logs bistapp-api --lines 15 --nostream 2>/dev/null || true
else
  echo "Uvicorn iceren Python bulunamadi; kurulum veya venv yolu kontrol edilmeli."
fi

echo "=== [4] AUDIT (8001 HEALTH & PY_COMPILE) ==="
curl -i -s -m 3 http://127.0.0.1:8001/health | head -n 15 || true
"${PY_BIN:-python3}" -m py_compile python/ai_coder_agent.py python/api_server.py
