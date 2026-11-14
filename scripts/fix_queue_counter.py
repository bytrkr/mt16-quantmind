#!/usr/bin/env python3
"""queue.ts'de let queueCounter = 0; satırını doğru yere taşı."""
import re
import shutil
from pathlib import Path

TARGET = Path("/home/bytrkr/bistapp/server/publisher/queue.ts")
BACKUP = TARGET.with_suffix(TARGET.suffix + ".qodi_bak5")

def main():
    content = TARGET.read_text(encoding="utf-8")
    
    # Yanlış yere eklenmiş satırı kaldır
    lines = content.split("\n")
    new_lines = []
    removed = False
    for line in lines:
        if "let queueCounter = 0;" in line:
            removed = True
            print(f"[KALDIR] Satır: '{line.strip()}'")
            continue
        new_lines.append(line)
    
    if not removed:
        print("[BİLGİ] 'let queueCounter = 0;' bulunamadı.")
        return
    
    # Doğru yere ekle: son import satırından sonra
    insert_idx = 0
    for i, line in enumerate(new_lines):
        if line.strip().startswith("import ") or line.strip().startswith("} from "):
            insert_idx = i + 1
        elif line.strip().startswith("export ") or line.strip().startswith("class ") or line.strip().startswith("const "):
            break
    
    new_lines.insert(insert_idx, "\nlet queueCounter = 0;")
    
    if not BACKUP.exists():
        shutil.copy2(TARGET, BACKUP)
        print(f"[YEDEK] {BACKUP.name}")
    
    TARGET.write_text("\n".join(new_lines), encoding="utf-8")
    print(f"[OK] 'let queueCounter = 0;' doğru yere eklendi (satır {insert_idx + 1}).")

if __name__ == "__main__":
    main()
