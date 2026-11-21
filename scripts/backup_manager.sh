#!/usr/bin/env bash
set -euo pipefail
ACTION="${1:-list}"
TARGET="${2:-}"
BACKUP_DIR="/home/bytrkr/bistapp/backups"
APP_DIR="/home/bytrkr/bistapp"
mkdir -p "$BACKUP_DIR"

if [ "$ACTION" = "list" ]; then
  echo "=== YEDEK ARSIVLERI ($BACKUP_DIR) ==="
  ls -lh "$BACKUP_DIR"/*.tar.gz 2>/dev/null || echo "Henuz .tar.gz yedek bulunmuyor."
elif [ "$ACTION" = "create" ]; then
  STAMP=$(date +%Y%m%d_%H%M%S)
  OUT_FILE="$BACKUP_DIR/mt16_manual_backup_${STAMP}.tar.gz"
  tar --exclude="node_modules" --exclude=".venv" --exclude="backups/*.tar.gz" -czf "$OUT_FILE" -C "$APP_DIR" data python server scripts docs CLAUDE.md GEMINI.md .cursorrules 2>/dev/null || \
  tar --exclude="node_modules" --exclude=".venv" --exclude="backups/*.tar.gz" -czf "$OUT_FILE" -C "$APP_DIR" .
  echo "[OK] Yeni yedek olusturuldu: $OUT_FILE ($(du -h "$OUT_FILE" | cut -f1))"
elif [ "$ACTION" = "restore" ]; then
  if [ -z "$TARGET" ]; then
    echo "Kullanim: bash scripts/backup_manager.sh restore /home/bytrkr/bistapp/backups/<dosya.tar.gz>"
    ls -lh "$BACKUP_DIR"/*.tar.gz 2>/dev/null || true
    exit 1
  fi
  if [ ! -f "$TARGET" ]; then
    echo "[HATA] Dosya bulunamadi: $TARGET"
    exit 1
  fi
  SAFE_STAMP=$(date +%Y%m%d_%H%M%S)
  tar --exclude="node_modules" --exclude=".venv" --exclude="backups/*.tar.gz" -czf "$BACKUP_DIR/pre_restore_${SAFE_STAMP}.tar.gz" -C "$APP_DIR" data python server scripts 2>/dev/null || true
  tar -xzf "$TARGET" -C "$APP_DIR"
  echo "[OK] Yedek geri yuklendi: $TARGET (On yedek: pre_restore_${SAFE_STAMP}.tar.gz)"
  echo "[BILGI] Servisleri yenilemek icin: pm2 restart all"
else
  echo "Gecersiz islem: $ACTION (list | create | restore)"
  exit 1
fi
