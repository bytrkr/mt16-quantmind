#!/usr/bin/env bash
set -u

STAGE="${1:-all}"
BACKUP_ROOT="_pipeline_backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_ROOT"

backup_file() {
  local f="$1"
  if [ -f "$f" ]; then
    mkdir -p "$BACKUP_ROOT/$(dirname "$f")"
    cp -p "$f" "$BACKUP_ROOT/$f"
  fi
}

ai_plan() {
  echo "=== [1/4] AI PLAN & TESHIS ==="
  echo "--- Yedek / Cop Dosyalar ---"
  find . -maxdepth 4 -not -path "./_pipeline_backups*" -not -path "./_temizlik_yedek*" \( -name "*.bak*" -o -name "*qodi_bak*" -o -name "*ai_bak*" \) || true

  echo "--- Kritik Hata Kaliplari ---"
  grep -rn "random\.\|127\.0\.0\b\|https://://\|if (true)" python/ nasdaq/ server/ 2>/dev/null || true

  echo "--- Dinleyen Portlar ---"
  ss -tulpn 2>/dev/null || netstat -tulpn 2>/dev/null || true

  echo "--- PM2 / Docker Durumu ---"
  pm2 status 2>/dev/null || true
  docker compose ps 2>/dev/null || true
}

build_step() {
  echo "=== [2/4] BUILD ADIMLARI ==="

  mkdir -p _temizlik_yedek
  while IFS= read -r -d '' f; do
    mkdir -p "_temizlik_yedek/$(dirname "$f")"
    mv "$f" "_temizlik_yedek/$f"
    echo "Tasindi: $f -> _temizlik_yedek/$f"
  done < <(find . -maxdepth 4 -not -path "./_pipeline_backups*" -not -path "./_temizlik_yedek*" \( -name "*.bak*" -o -name "*qodi_bak*" -o -name "*ai_bak*" \) -print0)

  for pyf in "python/backtest.py" "python/advanced_quant_simulation.py" "python/auto_repo_absorber.py" "python/ai_coder_agent.py"; do
    backup_file "$pyf"
  done

  python3 - <<'PYEOF'
for path in ["python/backtest.py", "python/advanced_quant_simulation.py"]:
    try:
        with open(path, "r", encoding="utf-8") as f:
            src = f.read()
        if "random." in src and "import random" not in src:
            with open(path, "w", encoding="utf-8") as f:
                f.write("import random\n" + src)
            print("Guncellendi (import random):", path)
        else:
            print("Atlandi:", path)
    except FileNotFoundError:
        print("Bulunamadi:", path)

path = "python/auto_repo_absorber.py"
try:
    with open(path, "r", encoding="utf-8") as f:
        src = f.read()
    new_src = src.replace("http://127.0/", "http://127.0.0.1/").replace("http://127.0:", "http://127.0.0.1:")
    if new_src != src:
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_src)
        print("Guncellendi (127.0.0.1):", path)
    else:
        print("Degisiklik gerekmedi:", path)
except FileNotFoundError:
    print("Bulunamadi:", path)

path = "python/ai_coder_agent.py"
try:
    with open(path, "r", encoding="utf-8") as f:
        src = f.read()
    new_src = src.replace("https://://", "https://")
    if new_src != src:
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_src)
        print("Guncellendi (https://):", path)
    else:
        print("Degisiklik gerekmedi:", path)
except FileNotFoundError:
    print("Bulunamadi:", path)
PYEOF
}

hack_console_check() {
  echo "=== [3/4] HACK KONSOLU (ENDPOINT & ERISIM KONTROLU) ==="
  for url in "http://127.0.0.1:3001/" "http://127.0.0.1:8001/health" "http://127.0.0.1:3001/kurtar.html"; do
    echo "--- Test: $url ---"
    curl -i -s -m 3 "$url" | head -n 12 || echo "Yanit yok / baglanti hatasi"
  done
}

audit_step() {
  echo "=== [4/4] AUDIT (SON DENETIM) ==="
  grep -rn "random\.\|127\.0\.0\b\|https://://" python/ nasdaq/ server/ 2>/dev/null || echo "Kritik kalip bulunamadi."
  python3 -m py_compile \
    python/backtest.py \
    python/advanced_quant_simulation.py \
    python/auto_repo_absorber.py \
    python/ai_coder_agent.py 2>&1 || true
  echo "Yedek klasoru: $BACKUP_ROOT"
}

case "$STAGE" in
  plan)  ai_plan ;;
  build) build_step ;;
  hack)  hack_console_check ;;
  audit) audit_step ;;
  all)
    ai_plan
    build_step
    hack_console_check
    audit_step
    ;;
  *)
    echo "Kullanim: ./run_pipeline.sh [all|plan|build|hack|audit]"
    exit 1
    ;;
esac
