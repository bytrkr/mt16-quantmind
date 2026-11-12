# API
## GET /health
{"status":"ok","service":"bist-juri-terminal","timestamp":"..."}
## GET /api/analyze/full?symbol=XXX
- BTCUSDT|ETHUSDT|SOLUSDT -> cryptoAdapter (Binance canli)
- THYAO -> bistAdapter (Matriks yoksa VERI YOK)
- NVDA -> nasdaqAdapter (Alpaca canli veri yoksa VERI YOK)
## Cevap (kripto)
price, source, cryptoCheck.sessionPhase, vpin{vpinScore, toxicityLevel, isToxic, action, reason, bucketSize, analyzedTradesCount}, extra{obi, cvd, wallZ, volatility, sharpeRatio, beta, fundingRatePct, fearIndex, openInterest, fearSource, fundingSource}, finalDecision{action: VETO_HOLD|PROCEED, reason}, sentinel/alpha/wall/portfolio (veto varsa null)
## VERI YOK sozlesmesi
Veri yoksa HTTP 200 + price: null + source: "VERI YOK - ..." doner. Asla uydurma fiyat donulmez.
