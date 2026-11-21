# MT16 QuantMind & AI Studio v8.0 — Kokpit Kullanım ve Bakım Kılavuzu

- **Ana Terminal (Port 3000):** http://136.144.200.54:3000
- **AI Studio Kokpit (Port 3001):** http://136.144.200.54:3001
- **Python Kantitatif Çekirdek (Port 8001):** http://127.0.0.1:8001/api/track-record

## Kısayollar ve Hızlı İşlemler
- `Ctrl + Enter`: Komutu Linux Shell üzerinde çalıştırır.
- `Shift + Enter`: İsteği AI Ajanına gönderir.
- `↑` / `↓`: Komut geçmişinde gezinir.
- **Otomatik Yedekleme:** Her gece `03:30` (`scripts/backup_data.sh` -> `backups/`, 14 gün rotasyon).
- **Acil Kurtarma:** `pm2 restart all && pm2 flush`
