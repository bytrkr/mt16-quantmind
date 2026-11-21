#!/usr/bin/env bash
set -u

BACKUP_DIR="_fix_step5_backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

for f in "python/ai_coder_agent.py" "public/kurtar.html"; do
  if [ -f "$f" ]; then
    mkdir -p "$BACKUP_DIR/$(dirname "$f")"
    cp -p "$f" "$BACKUP_DIR/$f"
  fi
done

echo "=== [1] AI_CODER_AGENT.PY OPENROUTER URL DUZELTME ==="
python3 - <<'PYEOF'
path = "python/ai_coder_agent.py"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

new_src = src.replace("https://groq.com", "https://openrouter.ai/api/v1/chat/completions")
if new_src != src:
    with open(path, "w", encoding="utf-8") as f:
        f.write(new_src)
    print("Guncellendi (OpenRouter URL):", path)
else:
    print("Degisiklik gerekmedi:", path)
PYEOF
grep -rn -C 2 "openrouter.ai" python/ai_coder_agent.py 2>/dev/null || true

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
grep -rn "kurtar.html\|1616\|argin" public/kurtar.html 2>/dev/null || true

echo "=== [3] BISTAPP-API PM2 YENIDEN BASLATMA & LOG KONTROL ==="
if command -v pm2 >/dev/null 2>&1; then
  pm2 delete bistapp-api 2>/dev/null || true
  pm2 start python3 --name bistapp-api -- -m uvicorn python.api_server:app --host 127.0.0.1 --port 8001
  sleep 2
  pm2 status
  pm2 logs bistapp-api --lines 20 --nostream 2>/dev/null || true
fi

echo "=== [4] AUDIT (8001 HEALTH & PY_COMPILE) ==="
curl -i -s -m 3 http://127.0.0.1:8001/health | head -n 15 || true
python3 -m py_compile python/ai_coder_agent.py python/api_server.py
