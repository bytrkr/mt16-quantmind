# 9 Araç Entegrasyon Özeti (BISTAPP / MT16)

Bu belge, BistApp Proje Yöneticisi analiz terminaline entegre edilen açık kaynaklı / endüstri standardı 9 aracın mimari katkılarını özetler:

1. **Plane (Cycle Yönetimi):** Sol proje ağacında "Cycle 1 (Bugün)" yapısı kurularak THYAO ve ASELS hisselerinin aktif iş döngüsü altında gruplanması sağlandı.
2. **OpenProject (Gantt Zaman Çizelgesi):** Orta canvas üstünde kuant boru hattı adımlarının (Fiyat → VPIN → Sentinel → Alpha → Wall → Karar) gerçek milisaniye süreleri (`performance.now`) ve bağımlılık zinciri görselleştirildi.
3. **Taiga (Kanban Panosu):** Orta alanda [Canvas] / [Kanban] sekmesiyle Yapılacak / Çalışıyor / Bitti / VETO iş akışı kolonları sunuldu.
4. **FUXA (Alarm & Seans Göstergesi):** Üst barda canlı Seans durumu (Açık/Kapalı, Saat, Gecikmeli Veri) ve alt panelde sadece VETO / Duvar ihlallerini listeleyen FUXA Alarm sekmesi eklendi.
5. **Node-RED (Blok Canvas & Debug):** 6 aşamalı StepCard akış şeması ve alt panelde ham JSON çıktısını gösteren `[DEBUG]` sekmesi entegre edildi.
6. **OpenPLC (Modüler Mimari & Dinamik Import):** 4.7MB'lık Mermaid kütüphanesi dynamic import ile bölündü, gereksiz şişmeler engellendi.
7. **MT5 Workflow Manager (Gerçek Ölçüm & AutonomousLoop):** Sabit süre simülasyonları yerine gerçek işlem süreleri ölçüldü; seans kapalıyken `AutonomousLoop` taramasının döngüde kilitlenmesi önlendi.
8. **OpenTerm5 (Prop Guard):** Günlük max %2.0 zarar limiti bekçisi; limit aşıldığında paneli kilitler ve prop guard logu basar.
9. **BistApp Command Risk (Güvenlik Kalkanı):** Qodi v6.1 kurallarına (0 fallback, 0 Math.random, 0 throw) tam uyumlu, veri yoksa açıkça "VERİ YOK" yazan güvenli kuant terminali.
