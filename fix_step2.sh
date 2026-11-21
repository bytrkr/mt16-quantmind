#!/usr/bin/env bash
set -u

BACKUP_DIR="_fix_step2_backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

for f in \
  "python/backtest.py" \
  "python/advanced_quant_simulation.py" \
  "python/auto_repo_absorber.py" \
  "python/fstory_full_integration.py"
do
  if [ -f "$f" ]; then
    mkdir -p "$BACKUP_DIR/$(dirname "$f")"
    cp -p "$f" "$BACKUP_DIR/$f"
  fi
done

echo "=== [1] FROM __FUTURE__ VE IMPORT RANDOM DUZELTME ==="
python3 - <<'PYEOF'
import re

for path in ["python/backtest.py", "python/advanced_quant_simulation.py"]:
    try:
        with open(path, "r", encoding="utf-8") as f:
            lines = f.readlines()
    except FileNotFoundError:
        print("Bulunamadi:", path)
        continue

    # Yanlis basa eklenmis ilk 'import random\n' satirini kaldir
    if lines and lines[0].strip() == "import random":
        lines = lines[1:]

    future_indices = [i for i, l in enumerate(lines) if re.match(r"^\s*from\s+__future__\s+import\s+", l)]
    has_random_import = any(re.match(r"^\s*(import\s+random\b|from\s+random\s+import\b)", l) for l in lines)
    uses_random = any("random." in l for l in lines)

    if uses_random and not has_random_import:
        if future_indices:
            insert_at = max(future_indices) + 1
        else:
            insert_at = 0
        lines.insert(insert_at, "import random\n")
        print(f"Duzeltildi (satir {insert_at + 1}): {path}")
    else:
        print(f"Kontrol edildi: {path}")

    with open(path, "w", encoding="utf-8") as f:
        f.writelines(lines)
PYEOF

echo "=== [2] BOZUK 'http://127.0' ADRESLERINI DUZELTME ==="
python3 - <<'PYEOF'
for path in ["python/auto_repo_absorber.py", "python/fstory_full_integration.py"]:
    try:
        with open(path, "r", encoding="utf-8") as f:
            src = f.read()
    except FileNotFoundError:
        print("Bulunamadi:", path)
        continue

    new_src = src.replace('"http://127.0"', '"http://127.0.0.1:3001"').replace("'http://127.0'", "'http://127.0.0.1:3001'")
    if new_src != src:
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_src)
        print("Guncellendi:", path)
    else:
        print("Degisiklik gerekmedi:", path)
PYEOF

echo "=== [3] PYTHON SOZDIZIMI DENETIMI ==="
python3 -m py_compile \
  python/backtest.py \
  python/advanced_quant_simulation.py \
  python/auto_repo_absorber.py \
  python/fstory_full_integration.py \
  python/ai_coder_agent.py

echo "=== [4] NASDAQ ADAPTER & KURTAR.HTML KONTROLU ==="
grep -rn -C 5 "if (true)" nasdaq/nasdaqAdapter.ts 2>/dev/null || true
ls -la public/kurtar.html 2>/dev/null || true

echo "=== [5] PORT 3000 / 3001 / 8001 DETAY YANITI ==="
for url in "http://127.0.0.1:3000/" "http://127.0.0.1:3001/" "http://127.0.0.1:8001/health"; do
  echo "--- $url ---"
  curl -v -m 3 "$url" 2>&1 | tail -n 15 || true
done
