#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""queue.ts'de interface içine yanlışlıkla eklenen queueCounter'ı kaldır, doğru yere koy."""
import shutil
from pathlib import Path

TARGET = Path("/home/bytrkr/bistapp/server/publisher/queue.ts")
BACKUP = TARGET.with_suffix(TARGET.suffix + ".qodi_bak5")

def main():
    print("=" * 70)
    print("QODI - queue.ts QUEUECOUNTER DÜZELTİCİ")
    print("=" * 70)
    
    if not TARGET.exists():
        print(f"[HATA] Dosya yok: {TARGET}")
        return
    
    content = TARGET.read_text(encoding="utf-8")
    
    # 1. Yanlış yerdeki satırı kaldır (interface içindeki boş satır + let queueCounter)
    bad_block = "export interface QueueItem {\n\nlet queueCounter = 0;\n  id: string;"
    good_interface = "export interface QueueItem {\n  id: string;"
    
    if bad_block not in content:
        print("[ATLA] Hatalı blok bulunamadı. Dosya zaten düzgün olabilir.")
        # Mevcut durumu göster
        idx = content.find("export interface QueueItem")
        if idx >= 0:
            print("[BİLGİ] İlk 200 karakter:")
            print(repr(content[idx:idx+200]))
        return
    
    if not BACKUP.exists():
        shutil.copy2(TARGET, BACKUP)
        print(f"[YEDEK] {BACKUP.name}")
    
    # Interface'i düzelt
    content = content.replace(bad_block, good_interface, 1)
    print("[DÜZELT] interface içindeki 'let queueCounter = 0;' kaldırıldı.")
    
    # 2. Doğru yere ekle: interface'in kapanışından sonra, class'tan önce
    # 'export class PublisherQueue' öncesine ekle
    class_marker = "export class PublisherQueue"
    if class_marker not in content:
        print("[HATA] 'export class PublisherQueue' bulunamadı.")
        return
    
    insert_pos = content.find(class_marker)
    
    # Zaten class'tan önce queueCounter var mı?
    before_class = content[:insert_pos]
    if "let queueCounter = 0;" in before_class:
        print("[BİLGİ] queueCounter zaten doğru yerde.")
    else:
        content = content[:insert_pos] + "let queueCounter = 0;\n\n" + content[insert_pos:]
        print("[DÜZELT] 'let queueCounter = 0;' class'tan önce doğru yere eklendi.")
    
    TARGET.write_text(content, encoding="utf-8")
    print("[OK] Dosya güncellendi.")
    print("=" * 70)
    
    # Doğrulama: ilk 20 satırı göster
    print("\n[DOĞRULAMA] Dosyanın ilk 20 satırı:")
    for i, line in enumerate(TARGET.read_text(encoding="utf-8").split("\n")[:20], 1):
        print(f"  {i:2d}: {line}")
    print("=" * 70)
    print("Sonra çalıştır: npx tsc --noEmit 2>&1 | head -20")

if __name__ == "__main__":
    main()
