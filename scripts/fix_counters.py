#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Qodi v6.1 - Eksik Sayaç Değişkenlerini Ekle
Her dosyada sınıfın en başına 'private auditCounter = 0;' benzeri satır ekler.
"""
import re
import shutil
from pathlib import Path

ROOT = Path("/home/bytrkr/bistapp")


def add_private_counter(rel_path, class_name, counter_name):
    """Sınıfın içine 'private <counter> = 0;' satırı ekle."""
    target = ROOT / rel_path
    backup = target.with_suffix(target.suffix + ".qodi_bak4")
    
    print(f"\n{'='*70}")
    print(f"DOSYA: {rel_path}")
    print(f"SINIF: {class_name}")
    print(f"SAYAÇ: {counter_name}")
    print(f"{'='*70}")
    
    if not target.exists():
        print(f"[HATA] Dosya yok: {target}")
        return False
    
    content = target.read_text(encoding="utf-8")
    
    # Zaten tanımlı mı?
    if re.search(rf"\b{counter_name}\b\s*[:=]", content):
        if f"private {counter_name}" in content:
            print(f"[ATLA] '{counter_name}' zaten tanımlı.")
            return True
    
    if not backup.exists():
        shutil.copy2(target, backup)
        print(f"[YEDEK] {backup.name}")
    
    # Sınıf tanımını bul: 'export class <ClassName>' veya 'class <ClassName>'
    pattern = re.compile(
        rf"(export\s+(?:default\s+)?class\s+{re.escape(class_name)}[^{{]*\{{)"
    )
    match = pattern.search(content)
    
    if not match:
        print(f"[HATA] '{class_name}' sınıfı bulunamadı.")
        return False
    
    # Sınıf açılışının hemen sonrasına ekle
    insert_pos = match.end()
    counter_line = f"\n  private {counter_name} = 0;"
    content = content[:insert_pos] + counter_line + content[insert_pos:]
    
    target.write_text(content, encoding="utf-8")
    print(f"[OK] 'private {counter_name} = 0;' sınıfın başına eklendi.")
    return True


def fix_queue_module_counter(rel_path):
    """queue.ts gibi modül seviyesinde sayaç ekle (sınıf değil)."""
    target = ROOT / rel_path
    backup = target.with_suffix(target.suffix + ".qodi_bak4")
    
    print(f"\n{'='*70}")
    print(f"DOSYA: {rel_path} (modül seviyesi sayaç)")
    print(f"{'='*70}")
    
    if not target.exists():
        print(f"[HATA] Dosya yok: {target}")
        return False
    
    content = target.read_text(encoding="utf-8")
    
    if "let queueCounter" in content:
        print("[ATLA] 'queueCounter' zaten tanımlı.")
        return True
    
    if not backup.exists():
        shutil.copy2(target, backup)
        print(f"[YEDEK] {backup.name}")
    
    # İlk 'export' veya 'import' satırından sonra ekle
    lines = content.split("\n")
    insert_idx = 0
    for i, line in enumerate(lines):
        if line.startswith("import ") or line.startswith("export "):
            insert_idx = i + 1
            if not line.startswith("import"):
                break
    
    lines.insert(insert_idx, "\nlet queueCounter = 0;")
    content = "\n".join(lines)
    target.write_text(content, encoding="utf-8")
    print(f"[OK] 'let queueCounter = 0;' modül başına eklendi.")
    return True


# ============================================================================
# 1. queue.ts
# ============================================================================
fix_queue_module_counter("server/publisher/queue.ts")

# ============================================================================
# 2. binanceExecutor.ts
# ============================================================================
add_private_counter(
    "server/services/binanceExecutor.ts",
    "BinanceSpotExecutor",
    "execCounter"
)

# ============================================================================
# 3. enterpriseAuditEngine.ts
# ============================================================================
add_private_counter(
    "server/services/enterpriseAuditEngine.ts",
    "EnterpriseAuditEngine",
    "auditCounter"
)

# ============================================================================
# 4. finnhubService.ts
# ============================================================================
add_private_counter(
    "server/services/finnhubService.ts",
    "FinnhubService",
    "auditCounter"
)

# ============================================================================
# 5. tcmbService.ts
# ============================================================================
add_private_counter(
    "server/services/tcmbService.ts",
    "TcmbService",
    "auditCounter"
)

# ============================================================================
# 6. trackRecordService.ts
# ============================================================================
add_private_counter(
    "server/services/trackRecordService.ts",
    "TrackRecordService",
    "auditCounter"
)


print(f"\n{'='*70}")
print("Son doğrulama: npx tsc --noEmit 2>&1 | head -20")
print("=" * 70)
