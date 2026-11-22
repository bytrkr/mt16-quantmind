#!/usr/bin/env bash
set -euo pipefail
APP_DIR="/home/bytrkr/bistapp"
OUT_DIR="$APP_DIR/backups/excel_reports"
mkdir -p "$OUT_DIR"
STAMP=$(date -u '+%Y%m%d_%H%M')
OUT_FILE="$OUT_DIR/MT16_QuantMind_Rapor_${STAMP}.xlsx"
"$APP_DIR/.venv/bin/python" -c "import sys; sys.path.insert(0, '$APP_DIR/python'); from quant_grid_service import build_excel_bytes; open('$OUT_FILE', 'wb').write(build_excel_bytes())"
cp -f "$OUT_FILE" "$OUT_DIR/MT16_QuantMind_Son_Rapor.xlsx"
find "$OUT_DIR" -name "MT16_QuantMind_Rapor_*.xlsx" -mtime +30 -delete 2>/dev/null || true
echo "[OK] Excel raporu arsivlendi: $OUT_FILE ($(du -h "$OUT_FILE" | cut -f1))"
