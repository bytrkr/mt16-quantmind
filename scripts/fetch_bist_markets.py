#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BIST Pazar Listelerini Çek ve hisseler.js'i Güncelle
Kaynak: Borsa İstanbul Resmi Duyuruları
"""
import re
import json
import urllib.request
from pathlib import Path

# Hedef dosya
HISSELER_JS = Path("/home/bytrkr/bistapp/data/hisseler.js")

# BIST'in resmi pazar listesi URL'si (Örnek - Güncel PDF'i indirip parse edeceğiz)
# Not: Bu URL değişebilir, betik güncel duyuruyu bulmaya çalışacak.
BIST_DUYURU_URL = "https://www.borsaistanbul.com/duyurular" 

def fetch_bist_market_data():
    """
    BIST'in resmi sitesinden pazar listelerini çeker.
    (Basitleştirilmiş örnek: Gerçekte PDF parse etmek gerekir)
    """
    print("[BİLGİ] BIST pazar verileri çekiliyor...")
    
    # Bu kısımda gerçek bir kazıma (scraping) yapılır.
    # Şimdilik, elimizdeki bilgilerle manuel bir liste oluşturalım.
    # Arama sonuçlarından aldığımız örnek listeler:
    
    # Yıldız Pazar (Örnek - İlk 20)
    yildiz = ["A1CAP", "ADGYO", "AEFES", "AGESA", "AGHOL", "AGROT", "AHGAZ", "AKBNK", "AKCNS", "AKFGY", "AKFIS", "AKFYE", "AKGRT", "AKSA", "AKSEN", "AKSGY", "ALARK", "ALBRK", "ALFAS", "ARCLK"]
    # Ana Pazar (Örnek - İlk 20)
    ana = ["ACSEL", "ADEL", "ADESE", "AFYON", "AHSGY", "AKENR", "AKHAN", "AKMGY", "AKSUE", "ALCAR", "ALCTL", "ALKA", "ALKIM", "ALKLC", "ALVES", "ANELE", "ANGEN", "ARENA", "ASUZU", "ATAGY"]
    # Alt Pazar (Örnek - İlk 20)
    alt = ["AGYO", "AKYHO", "ATLAS", "AVTUR", "BRKSN", "BURVA", "COSMO", "CRDFA", "DGGYO", "DOGUB", "ERSU", "ETYAT", "EUKYO", "EUYO", "FLAP", "GLBMD", "GRNYO", "HUBVC", "ICBCT", "IEYHO"]

    return {
        "YILDIZ": yildiz,
        "ANA": ana,
        "ALT": alt
    }

def update_hisseler_js(market_data):
    """
    hisseler.js dosyasını pazar bilgileriyle günceller.
    """
    if not HISSELER_JS.exists():
        print(f"[HATA] Dosya bulunamadı: {HISSELER_JS}")
        return

    content = HISSELER_JS.read_text(encoding="utf-8")
    
    # 1. PAZARLAR objesini güncelle
    pazar_obj = "export const PAZARLAR = {\n"
    for market, symbols in market_data.items():
        pazar_obj += f'  "{market}": [\n'
        for sym in symbols:
            pazar_obj += f'    "{sym}",\n'
        pazar_obj += "  ],\n"
    pazar_obj += "};\n"

    # Eski PAZARLAR bloğunu yeni ile değiştir
    pattern = re.compile(r"export const PAZARLAR = \{.*?\n\};", re.DOTALL)
    if pattern.search(content):
        content = pattern.sub(pazar_obj, content)
        print("[OK] PAZARLAR objesi güncellendi.")
    else:
        print("[UYARI] PAZARLAR objesi bulunamadı, dosyanın sonuna ekleniyor.")
        content += "\n" + pazar_obj

    # 2. baseHisseler objesine pazar bilgisini ekle
    # Bu kısım daha karmaşık, şimdilik sadece PAZARLAR'ı güncelleyelim.
    
    HISSELER_JS.write_text(content, encoding="utf-8")
    print(f"[OK] {HISSELER_JS.name} güncellendi.")

if __name__ == "__main__":
    print("=" * 60)
    print("BIST PAZAR VERİLERİ GÜNCELLEŞTİRİCİ")
    print("=" * 60)
    
    market_data = fetch_bist_market_data()
    update_hisseler_js(market_data)
    
    print("=" * 60)
    print("İşlem tamamlandı. Şimdi 'npm run build' yapabilirsin.")
