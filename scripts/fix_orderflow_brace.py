#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Qodi v6.1 - orderflow.ts Fazla Parantez Düzeltici
Sorun: generateSyntheticTicks fonksiyonunun kapanışından sonra fazladan '}' var.
Çözüm: Fazla olan '}' satırını sil.
"""
import shutil
from pathlib import Path

TARGET = Path("/home/bytrkr/bistapp/src/services/orderflow.ts")
BACKUP = TARGET.with_suffix(TARGET.suffix + ".qodi_bak2")

# Hatalı blok: fonksiyonun kapanışından sonra fazladan '}' ve sınıfın kapanışı
# Beklenen doğru:
#     return;
#   }
# }
#
# Mevcut hatalı:
#     return;
#   }
#   }     ← FAZLA
# }
BAD_BLOCK = """    return;
  }
  }
}

export const orderflowEngine = new OrderflowEngine();"""

GOOD_BLOCK = """    return;
  }
}

export const orderflowEngine = new OrderflowEngine();"""

def main():
    print("=" * 70)
    print("QODI - orderflow.ts FAZLA PARANTEZ DÜZELTİCİ")
    print("=" * 70)

    if not TARGET.exists():
        print(f"[HATA] Dosya yok: {TARGET}")
        return

    content = TARGET.read_text(encoding="utf-8")

    if BAD_BLOCK not in content:
        print("[ATLA] Hatalı blok bulunamadı. Dosya zaten düzgün olabilir.")
        # Kontrol: kaç tane '}' var export'tan önce?
        idx = content.find("export const orderflowEngine")
        if idx > 0:
            tail = content[max(0, idx-50):idx]
            print(f"[BİLGİ] export'tan önceki 50 karakter:")
            print(repr(tail))
        return

    if not BACKUP.exists():
        shutil.copy2(TARGET, BACKUP)
        print(f"[YEDEK] {BACKUP.name} ({BACKUP.stat().st_size} byte)")

    content = content.replace(BAD_BLOCK, GOOD_BLOCK, 1)
    TARGET.write_text(content, encoding="utf-8")
    print("[DÜZELT] Fazla '}' satırı kaldırıldı.")
    print("[OK] Dosya güncellendi.")
    print("=" * 70)
    print("\n[DOĞRULAMA] Şu komutları çalıştır:")
    print("  npx tsc --noEmit 2>&1 | head -10")
    print("=" * 70)

if __name__ == "__main__":
    main()
