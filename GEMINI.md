# CLAUDE.md — MT16 QuantMind & AI Studio v8.0 Otonom Ajan Anayasası
- Proje Kök Dizini: `/home/bytrkr/bistapp`
- Aktif Servisler (PM2): `bistapp` (3000), `ai-studio-v8` (3001), `bistapp-api` (8001), `otonom-beyin`
- Python Ortamı: Daima `/home/bytrkr/bistapp/.venv/bin/python` kullan.
- Kritik Kurallar:
  1. Herhangi bir dosyayı değiştirmeden önce mutlaka yedek al veya Git durumunu koru.
  2. Değişiklik sonrası Python için `py_compile`, Node/JS için `node --check` doğrula.
  3. SPK Seri:V No:55 Karar Destek Terminali uyumluluk metinlerini asla silme.
  4. `data/`, `decision_logs.db` ve `sanal_portfoy.json` dosyalarına zarar verecek sıfırlama yapma.
