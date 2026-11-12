# Strateji - MINI Kripto v2.1 (gecerli)
## Kapsam
BTCUSDT / ETHUSDT / SOLUSDT. 7/24 (CONTINUOUS_247).
## Gostergeler (hepsi Binance canli)
VPIN (1000 trade, 50 bucket, esik 0.35), OBI (10 kademe), CVD, Wall Z, Funding Rate (Binance Futures), Fear & Greed (Alternative.me), Open Interest, Volatilite (30 gunluk mum).
## Veto kurallari (biri bile tutarsa VETO_HOLD)
1. Toksik rejim: VPIN yukseliyor + OBI negatiflesiyor
2. VPIN > 0.35
3. Kalabalik Long: funding > 0 + long orani > 0.5
4. Likidasyon riski: fear < 40 + liqRisk HIGH
5. Hacim anomalisi: |volZ| > 2.0
## Son durum (2026-11-10 20:50, dogrulandi)
- BTCUSDT: VPIN 0.9529, OBI -0.9946, funding +0.005925, fear 32 -> VETO_HOLD
- ETHUSDT: VPIN 0.9033, funding -0.002117, fear 32 -> VETO_HOLD
## V2.2'ye gecis sarti
VPIN < 0.35 VEYA OBI > -0.50 VEYA volZ normallesirse v2.2 yazilir. Sart saglanmadan strateji degistirilmez.
