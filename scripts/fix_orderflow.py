#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Qodi v6.1 - orderflow.ts düzeltici
Sorun: generateSyntheticTicks içinde 4 Math.random() var.
Çözüm: Fonksiyonu no-op yap, sadece uyarı logla, boş ticks döndür.
"""
import shutil
import re
from pathlib import Path

TARGET = Path("/home/bytrkr/bistapp/src/services/orderflow.ts")
BACKUP = TARGET.with_suffix(TARGET.suffix + ".qodi_bak")

# Eski fonksiyonun tamamını regex ile bul (birden fazla satır)
OLD_PATTERN = re.compile(
    r"  /\*\*\s*\n"
    r"   \* @deprecated[^\n]*\n"
    r"   \*/\s*\n"
    r"  public generateSyntheticTicks\(currentPrice: number \| null, count: number = 30\): void \{\s*\n"
    r".*?"
    r"  \}\s*\n",
    re.DOTALL
)

NEW_FUNC = """  /**
   * @deprecated QODI v6.1: Sentetik veri üretimi YASAK (0 Math.random).
   * Bu fonksiyon artık veri üretmez. Sadece uyarı loglar ve boş ticks döner.
   * Gerçek veri için marketGateway / binance / matriks kullanılmalıdır.
   */
  public generateSyntheticTicks(currentPrice: number | null, count: number = 30): void {
    // Qodi v6.1 Kural 2: Math.random yasak. Sentetik tick üretimi devre dışı.
    this.ticks = [];
    if (currentPrice === null) return;

    console.warn(
      '[QODI v6.1] generateSyntheticTicks çağrıldı ancak sentetik veri üretimi yasak. ' +
      'Gerçek veri kaynağı (Binance/Matriks/Alpaca) kullanın. Boş ticks döndürülüyor.'
    );
    return;
  }
"""

def main():
    print("=" * 70)
    print("QODI - orderflow.ts DÜZELTİCİ")
    print("=" * 70)

    if not TARGET.exists():
        print(f"[HATA] Dosya yok: {TARGET}")
        return

    content = TARGET.read_text(encoding="utf-8")

    # Math.random sayısını öncesinde göster
    before_count = len(re.findall(r"Math\.random\s*\(", content))
    print(f"[ÖNCE] Math.random() sayısı: {before_count}")

    match = OLD_PATTERN.search(content)
    if not match:
        print("[ATLA] generateSyntheticTicks fonksiyonu bulunamadı.")
        print("[İPUCU] Dosyada elle kontrol et: grep -n 'generateSyntheticTicks' src/services/orderflow.ts")
        return

    if not BACKUP.exists():
        shutil.copy2(TARGET, BACKUP)
        print(f"[YEDEK] {BACKUP.name} ({BACKUP.stat().st_size} byte)")

    new_content = OLD_PATTERN.sub(NEW_FUNC, content, count=1)

    # Math.random sonrası sayı
    after_count = len(re.findall(r"Math\.random\s*\(", new_content))
    print(f"[SONRA] Math.random() sayısı: {after_count}")

    if after_count >= before_count:
        print("[HATA] Değişiklik uygulanmadı, dosya yazılmadı.")
        return

    TARGET.write_text(new_content, encoding="utf-8")
    print(f"[DÜZELT] {before_count - after_count} Math.random() kaldırıldı.")
    print("[OK] Dosya güncellendi.")
    print("=" * 70)

if __name__ == "__main__":
    main()
