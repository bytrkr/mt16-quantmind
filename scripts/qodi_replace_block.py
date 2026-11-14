#!/usr/bin/env python3
"""
Qodi Genel Blok Değiştirici
Kullanım:
    python3 scripts/qodi_replace_block.py <dosya> <eski_blok_dosyası> <yeni_blok_dosyası>

Örnek:
    python3 scripts/qodi_replace_block.py src/services/orderflow.ts /tmp/old.txt /tmp/new.txt
"""
import sys
import shutil
from pathlib import Path

def main():
    if len(sys.argv) != 4:
        print("Kullanım: python3 qodi_replace_block.py <hedef_dosya> <eski_blok> <yeni_blok>")
        sys.exit(1)

    target = Path(sys.argv[1])
    old_block_file = Path(sys.argv[2])
    new_block_file = Path(sys.argv[3])

    if not target.exists():
        print(f"[HATA] Hedef dosya yok: {target}")
        sys.exit(1)
    if not old_block_file.exists():
        print(f"[HATA] Eski blok dosyası yok: {old_block_file}")
        sys.exit(1)
    if not new_block_file.exists():
        print(f"[HATA] Yeni blok dosyası yok: {new_block_file}")
        sys.exit(1)

    content = target.read_text(encoding="utf-8")
    old_block = old_block_file.read_text(encoding="utf-8")
    new_block = new_block_file.read_text(encoding="utf-8")

    if old_block not in content:
        print(f"[HATA] Eski blok hedef dosyada bulunamadı.")
        print(f"  Aranan blok (ilk 100 karakter): {old_block[:100]}")
        sys.exit(1)

    count = content.count(old_block)
    if count > 1:
        print(f"[UYARI] Eski blok {count} kez bulundu. Sadece ilkini değiştiriyorum.")

    content = content.replace(old_block, new_block, 1)

    backup = target.with_suffix(target.suffix + ".qodi_bak2")
    if not backup.exists():
        shutil.copy2(target, backup)

    target.write_text(content, encoding="utf-8")
    print(f"[OK] {target} güncellendi.")
    print(f"[YEDEK] {backup}")

if __name__ == "__main__":
    main()
