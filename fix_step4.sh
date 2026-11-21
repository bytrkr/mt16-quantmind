#!/usr/bin/env bash
set -u

BACKUP_DIR="_fix_step4_backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

for f in "python/ai_coder_agent.py" "public/kurtar.html"; do
  if [ -f "$f" ]; then
    mkdir -p "$BACKUP_DIR/$(dirname "$f")"
    cp -p "$f" "$BACKUP_DIR/$f"
  fi
done

echo "=== [1] AI_CODER_AGENT.PY URL KONTROL & DUZELTME ==="
grep -rn -C 3 "groq\|openrouter\|http" python/ai_coder_agent.py 2>/dev/null || true
python3 - <<'PYEOF'
path = "python/ai_coder_agent.py"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

new_src = src.replace("https://://groq.com", "https://api.groq.com/openai/v1/chat/completions")
new_src = new_src.replace("https://://", "https://")
if new_src != src:
    with open(path, "w", encoding="utf-8") as f:
        f.write(new_src)
    print("Guncellendi:", path)
else:
    print("Degisiklik gerekmedi:", path)
PYEOF

echo "=== [2] KURTAR.HTML SABIT PIN TEMIZLIGI & CSS ONARIMI ==="
python3 - <<'PYEOF'
path = "public/kurtar.html"
with open(path, "r", encoding="utf-8") as f:
    html = f.read()

# Sabit value="1616" kaldirilir ve bozuk CSS ifadeleri duzeltilir
new_html = html.replace('value="1616"', 'placeholder="PIN"')
new_html = new_html.replace("width:100%argin:8px 0;", "width:100%;margin:8px 0;")
new_html = new_html.replace("font-size:12pxargin-top:10px", "font-size:12px;margin-top:10px")

if new_html != html:
    with open(path, "w", encoding="utf-8") as f:
        f.write(new_html)
    print("Guncellendi:", path)
else:
    print("Degisiklik gerekmedi:", path)
PYEOF

echo "=== [3] PORT 8001 (PYTHON API_SERVER) BASLATMA & TEST ==="
if command -v pm2 >/dev/null 2>&1; then
  pm2 delete bistapp-api 2>/dev/null || true
  pm2 start "python3 -m uvicorn python.api_server:app --host 127.0.0.1 --port 8001" --name bistapp-api
  sleep 2
  pm2 status
fi

curl -i -s -m 3 http://127.0.0.1:8001/health | head -n 15 || true
curl -i -s -m 3 http://127.0.0.1:8001/docs | head -n 10 || true
