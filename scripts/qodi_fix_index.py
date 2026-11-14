#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Qodi v6.1 - server/index.ts Otomatik Düzeltici
Sadece 2 güvenli düzeltme yapar:
1. /api/backtest/run endpoint'inde Math.random() ile sahte backtest üretimini kaldırır → VERİ YOK döner.
2. KAP bildirim ID'sindeki Math.random() → Date.now() + ticker.
Her düzeltmede .qodi_bak yedeği alır.
"""

import re
import shutil
from pathlib import Path
from datetime import datetime

TARGET = Path("/home/bytrkr/bistapp/server/index.ts")
BACKUP = TARGET.with_suffix(TARGET.suffix + ".qodi_bak")


def backup_once():
    if not BACKUP.exists():
        shutil.copy2(TARGET, BACKUP)
        print(f"[YEDEK] {BACKUP.name} oluşturuldu ({BACKUP.stat().st_size} byte)")
    else:
        print(f"[YEDEK] {BACKUP.name} zaten mevcut, üzerine yazılmadı.")


def fix_backtest_endpoint(content: str) -> tuple[str, int]:
    """
    /api/backtest/run endpoint'inin 'Dinamik Fallback Mock Üreteci' bloğunu
    Qodi uyumlu 'VERİ YOK' dönüşüyle değiştirir.
    """
    # Blok başlangıcı ve bitişini regex ile bul
    pattern = re.compile(
        r"(app\.post\('/api/backtest/run'.*?catch \(err: any\) \{.*?res\.json\(\{.*?\}\);.*?\}\);)",
        re.DOTALL
    )

    # Alternatif: blok başlangıcı ve sonrasındaki 'catch' bloğunun sonunu yakala
    # Daha güvenli: "Dinamik Fallback Mock Üreteci" yorumundan itibaren, 2. catch bloğunun sonuna kadar
    start_marker = "// Dinamik Fallback Mock Üreteci"
    start_idx = content.find(start_marker)
    if start_idx == -1:
        print("[ATLA] 'Dinamik Fallback Mock Üreteci' bulunamadı (zaten düzeltilmiş olabilir).")
        return content, 0

    # Geriye doğru, 'const result =' satırını bul
    block_start_search = content.rfind("const result = await agentApiClient.runVectorizedBacktest", 0, start_idx)
    if block_start_search == -1:
        print("[ATLA] Backtest endpoint başlangıcı bulunamadı.")
        return content, 0

    # 'const result =' satırının en başına git (satır başı)
    block_start = content.rfind("\n", 0, block_start_search) + 1

    # İleriye doğru, endpoint'in kapanışını bul: 'catch (err: any)' bloğunun son '}' karakteri
    # Basit yaklaşım: 'catch (err: any)' bul, sonrasında iki seviye parantez kapanışına kadar say
    catch_idx = content.find("catch (err: any)", start_idx)
    if catch_idx == -1:
        print("[ATLA] 'catch (err: any)' bulunamadı.")
        return content, 0

    # Catch bloğunun sonunu bul: { ... } dengesi
    depth = 0
    end_idx = catch_idx
    for i in range(catch_idx, len(content)):
        c = content[i]
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0 and i > catch_idx:
                end_idx = i + 1  # '}' dahil
                # Sonrasında ');' veya ';' varsa onu da al
                tail = content[end_idx:end_idx + 5]
                if tail.strip().startswith(';'):
                    end_idx += 1
                break

    old_block = content[block_start:end_idx]

    new_block = """const result = await agentApiClient.runVectorizedBacktest(req.body).catch(() => null);
    if (result && result.success !== false) {
      return res.json(result);
    }
    // QODI v6.1 KURAL 3: Gerçek veri yoksa SAHTE VERİ ÜRETİLMEZ.
    return res.status(503).json({
      success: false,
      error: 'VERİ YOK',
      reason: 'Backtest motoru (Python/vectorbt) yanıt vermedi. Sahte simülasyon üretilmedi.',
      ticker: (req.body?.ticker || '').toUpperCase() || null,
      policy: 'Qodi v6.1 - 0 Math.random / 0 Fallback',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'VERİ YOK',
      reason: 'Backtest çalıştırılamadı: ' + (err?.message || 'Bilinmeyen hata'),
      policy: 'Qodi v6.1 - 0 throw / 0 Fallback',
    });
  }"""

    content = content[:block_start] + new_block + content[end_idx:]
    print(f"[DÜZELT] /api/backtest/run endpoint → Qodi uyumlu (yaklaşık {len(old_block)} karakter değişti)")
    return content, 1


def fix_kap_id(content: str) -> tuple[str, int]:
    """Satır 2887 civarındaki rastgele KAP ID'sini Date.now() + ticker ile değiştir."""
    old = "id: String(Math.floor(Math.random() * 900000 + 100000)),"
    new = "id: `KAP-${Date.now()}-${qTicker}`,"

    if old in content:
        content = content.replace(old, new)
        print(f"[DÜZELT] KAP ID: Math.random() → Date.now() + ticker")
        return content, 1
    else:
        print("[ATLA] KAP ID Math.random() bulunamadı (zaten düzeltilmiş olabilir).")
        return content, 0


def main():
    if not TARGET.exists():
        print(f"[HATA] Dosya bulunamadı: {TARGET}")
        return

    print("=" * 70)
    print("QODI v6.1 - server/index.ts OTOMATİK DÜZELTİCİ")
    print("=" * 70)

    backup_once()

    original = TARGET.read_text(encoding="utf-8")
    content = original
    changes = 0

    # 1. Backtest endpoint
    content, c1 = fix_backtest_endpoint(content)
    changes += c1

    # 2. KAP ID
    content, c2 = fix_kap_id(content)
    changes += c2

    if changes > 0:
        TARGET.write_text(content, encoding="utf-8")
        print(f"\n[OK] Toplam {changes} düzeltme yapıldı. Dosya yazıldı.")
        print(f"[OK] Yedek: {BACKUP}")
    else:
        print("\n[SONUÇ] Hiçbir düzeltme gerekmedi veya bulunamadı.")

    # Kalan Math.random() sayısını göster
    remaining = len(re.findall(r"Math\.random\s*\(", content))
    print(f"\n[KONTROL] Kalan Math.random() sayısı: {remaining}")
    if remaining > 0:
        for m in re.finditer(r"Math\.random\s*\(", content):
            line_no = content[:m.start()].count("\n") + 1
            snippet = content[max(0, m.start() - 60):m.start() + 60].replace("\n", " ")
            print(f"  satır {line_no}: ...{snippet}...")

    print("=" * 70)


if __name__ == "__main__":
    main()
