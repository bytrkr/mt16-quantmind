# Runbook - Sunucu
Sunucu: 136.144.200.54, kullanici: bytrkr, yol: /home/bytrkr/bistapp. Node 20.20.2, PM2 bistapp, port 3000.
## Gunluk
pm2 status
pm2 logs bistapp --lines 30 --nostream
curl -s http://localhost:3000/health; echo
curl -s "http://localhost:3000/api/analyze/full?symbol=BTCUSDT" | head -c 1000; echo
## Yeniden baslatma (cokmede restart degil, temiz baslat)
pm2 delete bistapp; sleep 2
pm2 start "npm start" --name bistapp --cwd /home/bytrkr/bistapp
pm2 save
## .env
Sadece sunucuda, chmod 600 .env, chat'e anahtar yapistirilmaz.
