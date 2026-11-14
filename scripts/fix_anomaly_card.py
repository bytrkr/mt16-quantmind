#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Qodi v6.1 - AnomalyBubbleChartCard.tsx düzeltici
Sorun: 43. satırda yorum nesne içine yazılmış: 'price: null // SAHTE FIYAT YOK'
Çözüm: Yorumu nesne dışına taşı.
"""
import shutil
from pathlib import Path

TARGET = Path("/home/bytrkr/bistapp/src/components/AnomalyBubbleChartCard.tsx")
BACKUP = TARGET.with_suffix(TARGET.suffix + ".qodi_bak")

OLD = "{ symbol: 'TSLA', name: 'Tesla Inc', zVol: 3.40, zPrice: -2.15, obi: -0.58, forensicRisk: 68, beneishMScore: -1.65, anomalyTag: 'SPOOFING_BASKI', changePct: -2.15, price: null // SAHTE FIYAT YOK },"

NEW = "        // SAHTE FIYAT YOK: TSLA için price null (Qodi v6.1)\n        { symbol: 'TSLA', name: 'Tesla Inc', zVol: 3.40, zPrice: -2.15, obi: -0.58, forensicRisk: 68, beneishMScore: -1.65, anomalyTag: 'SPOOFING_BASKI', changePct: -2.15, price: null },"

def main():
    print("=" * 70)
    print("QODI - AnomalyBubbleChartCard.tsx DÜZELTİCİ")
    print("=" * 70)

    if not TARGET.exists():
        print(f"[HATA] Dosya yok: {TARGET}")
        return

    content = TARGET.read_text(encoding="utf-8")

    if OLD not in content:
        print("[ATLA] Hedef satır bulunamadı (zaten düzeltilmiş olabilir).")
        return

    if not BACKUP.exists():
        shutil.copy2(TARGET, BACKUP)
        print(f"[YEDEK] {BACKUP.name} ({BACKUP.stat().st_size} byte)")

    content = content.replace(OLD, NEW, 1)
    TARGET.write_text(content, encoding="utf-8")
    print("[DÜZELT] TSLA satırındaki // yorumu nesne dışına taşındı.")
    print("[OK] Dosya güncellendi.")
    print("=" * 70)

if __name__ == "__main__":
    main()
