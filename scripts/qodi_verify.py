#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Qodi v6.1 - Genel Doğrulama Betiği
Düzeltilen dosyalarda Math.random kalmadı mı kontrol eder.
"""
import re
import sys
from pathlib import Path

ROOT = Path("/home/bytrkr/bistapp")

TARGETS = [
    "server/index.ts",
    "src/components/AnomalyBubbleChartCard.tsx",
    "src/services/orderflow.ts",
]

def main():
    print("=" * 70)
    print("QODI v6.1 - DOĞRULAMA")
    print("=" * 70)

    total = 0
    for rel in TARGETS:
        f = ROOT / rel
        if not f.exists():
            print(f"[YOK] {rel}")
            continue
        text = f.read_text(encoding="utf-8")
        count = len(re.findall(r"Math\.random\s*\(", text))
        total += count
        status = "✅ TEMİZ" if count == 0 else f"❌ {count} ihlal"
        print(f"  {status:15s} {rel}")

    print("=" * 70)
    if total == 0:
        print("[SONUÇ] ✅ Tüm dosyalar Qodi uyumlu (0 Math.random).")
        sys.exit(0)
    else:
        print(f"[SONUÇ] ❌ Toplam {total} Math.random() kaldı.")
        sys.exit(1)

if __name__ == "__main__":
    main()
