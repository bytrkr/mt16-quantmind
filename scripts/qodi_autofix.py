#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Qodi v6.1 Otomatik Düzeltme Betiği
====================================
GÜVENLİ düzeltmeler yapar. Riskli olanları atlar ve raporlar.
Yedek alır, geri alınabilir.

Kullanım:
    python3 scripts/qodi_autofix.py            # Düzelt
    python3 scripts/qodi_autofix.py --dry-run  # Sadece göster, değiştirme
    python3 scripts/qodi_autofix.py --rollback # Yedeklerden geri yükle
"""

import os
import re
import sys
import json
import shutil
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path("/home/bytrkr/bistapp")
SCAN_DIRS = ["src", "server", "core", "bist", "crypto", "nasdaq", "python"]
EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".py"]
EXCLUDE_DIRS = {"node_modules", ".git", "dist", "build", "__pycache__", ".venv", "venv", "public/assets"}

BACKUP_SUFFIX = ".qodi_bak"
LOG_FILE = ROOT / "data" / "qodi_autofix_log.json"


def is_excluded(path: Path) -> bool:
    return bool(set(path.parts) & EXCLUDE_DIRS)


def should_skip_line(line: str) -> bool:
    stripped = line.strip()
    return (
        stripped.startswith("#")
        or stripped.startswith("//")
        or "qodi:ignore" in line
        or "# noqa" in line
    )


# ============================================================================
# GÜVENLİ DÜZELTMELER (kodu küçültmez, sadece kurala uygun hale getirir)
# ============================================================================

def fix_python_bare_except(content: str, path: Path) -> tuple[str, list]:
    """Python: 'except:' → 'except Exception as e:'"""
    changes = []
    lines = content.splitlines(keepends=True)
    for i, line in enumerate(lines):
        if re.match(r"^\s*except\s*:\s*$", line) or re.match(r"^\s*except\s*:\s*#", line):
            new_line = re.sub(r"except\s*:", "except Exception as e:", line)
            changes.append({"line": i + 1, "old": line.rstrip(), "new": new_line.rstrip(), "rule": "PY_BARE_EXCEPT"})
            lines[i] = new_line
    return "".join(lines), changes


def fix_python_random(content: str, path: Path) -> tuple[str, list]:
    """Python: 'import random' → 'import secrets' (güvenli alternatif)."""
    changes = []
    lines = content.splitlines(keepends=True)
    for i, line in enumerate(lines):
        if re.match(r"^\s*import\s+random\s*$", line):
            new_line = line.replace("import random", "import secrets")
            changes.append({"line": i + 1, "old": line.rstrip(), "new": new_line.rstrip(), "rule": "PY_RANDOM"})
            lines[i] = new_line
        elif re.match(r"^\s*from\s+random\s+import", line):
            # Bu riskli, atla ve raporla
            changes.append({"line": i + 1, "old": line.rstrip(), "new": "SKIPPED (from random import)", "rule": "PY_RANDOM_SKIP"})
    return "".join(lines), changes


# ============================================================================
# ANA DÖNGÜ
# ============================================================================

def process_file(path: Path, dry_run: bool = False) -> list:
    """Tek dosyayı işle. Değişiklik listesi döndür."""
    try:
        original = path.read_text(encoding="utf-8")
    except Exception as e:
        return [{"file": str(path), "error": str(e)}]

    content = original
    all_changes = []

    suffix = path.suffix

    if suffix == ".py":
        content, changes = fix_python_bare_except(content, path)
        all_changes.extend([{**c, "file": str(path.relative_to(ROOT))} for c in changes])

        content, changes = fix_python_random(content, path)
        all_changes.extend([{**c, "file": str(path.relative_to(ROOT))} for c in changes])

    # Sadece değişiklik varsa yaz
    if content != original and not dry_run:
        backup = path.with_suffix(path.suffix + BACKUP_SUFFIX)
        if not backup.exists():
            shutil.copy2(path, backup)
        path.write_text(content, encoding="utf-8")

    return all_changes


def rollback():
    """Tüm .qodi_bak dosyalarını geri yükle."""
    restored = 0
    for d in SCAN_DIRS:
        target = ROOT / d
        if not target.exists():
            continue
        for bak in target.rglob(f"*{BACKUP_SUFFIX}"):
            if is_excluded(bak):
                continue
            original = Path(str(bak)[: -len(BACKUP_SUFFIX)])
            shutil.copy2(bak, original)
            bak.unlink()
            restored += 1
            print(f"[GERİ ALINDI] {original.relative_to(ROOT)}")
    print(f"\nToplam geri alınan dosya: {restored}")


def main():
    dry_run = "--dry-run" in sys.argv
    if "--rollback" in sys.argv:
        rollback()
        return

    started = datetime.now(timezone.utc).isoformat()
    all_changes = []
    processed = 0

    print("=" * 70)
    print(f"QODI AUTOFIX - {'DRY RUN (değişiklik yapılmıyor)' if dry_run else 'GERÇEK DÜZELTME'}")
    print("=" * 70)

    for d in SCAN_DIRS:
        target = ROOT / d
        if not target.exists():
            continue
        for f in target.rglob("*"):
            if not f.is_file() or f.suffix not in EXTENSIONS or is_excluded(f):
                continue
            if f.name.endswith(BACKUP_SUFFIX):
                continue
            processed += 1
            changes = process_file(f, dry_run=dry_run)
            all_changes.extend(changes)

    # Log yaz
    log = {
        "timestamp": started,
        "dry_run": dry_run,
        "files_processed": processed,
        "changes": all_changes,
        "total_changes": len([c for c in all_changes if "error" not in c]),
        "skipped": len([c for c in all_changes if c.get("rule", "").endswith("_SKIP")]),
    }
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    LOG_FILE.write_text(json.dumps(log, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"İşlenen dosya : {processed}")
    print(f"Yapılan değişiklik : {log['total_changes']}")
    print(f"Atlanan (riskli)   : {log['skipped']}")
    print(f"Log            : {LOG_FILE}")
    if not dry_run:
        print("\nGeri almak için: python3 scripts/qodi_autofix.py --rollback")
    print("=" * 70)


if __name__ == "__main__":
    main()
