# Bistapp - Mimari
## Ilke
- 1 cekirdek matematik motoru (core/): VPIN, OBI, CVD, Wall Z, volatilite. Matematik pazara bagli degildir.
- Pazar basina 1 adaptor: bist/, crypto/, Nasdaq/. Her adaptor kendi veri kaynagini, seans kuralini, veto mantigini tasir.
- Karistirma yasaktir: KAP sadece BIST, SEC sadece Nasdaq, funding/fear sadece kripto.
## Klasorler
- core/ - vpin.ts, obi.ts, cvd.ts, wall.ts
- bist/ - bistAdapter.ts, matriks.ts, session.ts, kap.ts (Matriks yoksa VERI YOK)
- crypto/ - cryptoAdapter.ts, Binance.ts, funding.ts, fear.ts, liquidation.ts, oi.ts, session.ts
- Nasdaq/ - nasdaqAdapter.ts, alpaca.ts, session.ts, sec.ts (Alpaca canli veri yoksa VERI YOK)
- server/ - index.ts, API rotalari (/api/analyze/full, /health)
- src/ - frontend (React)
- docs/ - bu klasor
- scripts/ - update_tree.sh
## Veri durustlugu
Veri yoksa price: null, source: "VERI YOK - ...", action: "VETO_HOLD". Asla test fiyati (312.50 vb.) yazilmaz.
