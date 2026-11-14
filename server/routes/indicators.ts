import { Router, Request, Response } from 'express';
import { RSI, MACD, SMA, EMA, BollingerBands, ATR } from 'technicalindicators';

const router = Router();

router.get('/:symbol', async (req: Request, res: Response) => {
  const symbol = (req.params.symbol || 'THYAO').toUpperCase();
  
  try {
    // Yahoo Finance'ten geçmiş veri çek
    // Qodi v6.1: Sembol turune gore Yahoo sembolu belirle
    let yahooSymbol = symbol;
    if (symbol === 'BTCUSDT' || symbol.endsWith('USDT')) {
      // Binance kripto paritesi -> Yahoo'da BTC-USD formati
      yahooSymbol = symbol.replace('USDT', '-USD');
    } else if (['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'GOOGL', 'META'].includes(symbol)) {
      // NASDAQ hisseleri -> Yahoo'da dogrudan sembol
      yahooSymbol = symbol;
    } else {
      // BIST hisseleri -> .IS ekle
      yahooSymbol = `${symbol}.IS`;
    }
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=3mo`;
    const yRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!yRes.ok) return res.status(503).json({ success: false, error: 'VERİ YOK - Yahoo' });
    
    const yData: any = await yRes.json();
    const result = yData?.chart?.result?.[0];
    if (!result) return res.status(503).json({ success: false, error: 'VERİ YOK - Yahoo' });
    
    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const opens = quotes.open || [];
    const highs = quotes.high || [];
    const lows = quotes.low || [];
    const closes = quotes.close || [];
    const volumes = quotes.volume || [];
    
    // Qodi v6.1: null/undefined olan mumları atla
    const candles = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] == null || opens[i] == null || highs[i] == null || lows[i] == null) continue;
      candles.push({
        time: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
        open: opens[i], high: highs[i], low: lows[i], close: closes[i], volume: volumes[i] || 0,
      });
    }
    
    if (candles.length < 30) return res.status(503).json({ success: false, error: 'VERİ YOK - yetersiz mum' });
    
    const closeArr = candles.map(c => c.close);
    const highArr = candles.map(c => c.high);
    const lowArr = candles.map(c => c.low);
    
    // Teknik indikatörler
    const rsi14 = RSI.calculate({ values: closeArr, period: 14 });
    const macd = MACD.calculate({ values: closeArr, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false });
    const sma20 = SMA.calculate({ values: closeArr, period: 20 });
    const ema50 = EMA.calculate({ values: closeArr, period: 50 });
    const bb = BollingerBands.calculate({ values: closeArr, period: 20, stdDev: 2 });
    const atr14 = ATR.calculate({ high: highArr, low: lowArr, close: closeArr, period: 14 });
    
    // RSI'yi mum zamanına hizala
    const rsiData = rsi14.map((v, i) => ({ time: candles[candles.length - rsi14.length + i].time, value: Math.round(v * 100) / 100 }));
    const macdData = macd.map((m, i) => ({ time: candles[candles.length - macd.length + i].time, value: Math.round((m.MACD || 0) * 100) / 100 }));
    
    return res.json({
      success: true, symbol, source: 'Yahoo Finance',
      candles, rsi: rsiData, macd: macdData,
      sma20: sma20.slice(-1)[0], ema50: ema50.slice(-1)[0],
      bollinger: bb.slice(-1)[0], atr14: atr14.slice(-1)[0],
      lastPrice: candles[candles.length - 1].close,
    });
  } catch (e: any) {
    // Qodi v6.1: Yahoo basarisiz olursa Binance'e fallback (kripto icin)
    if (symbol.endsWith('USDT')) {
      try {
        const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=90`;
        const bRes = await fetch(binanceUrl);
        if (bRes.ok) {
          const bData: any[] = await bRes.json();
          const candles = bData.map((k: any[]) => ({
            time: new Date(k[0]).toISOString().split('T')[0],
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5]),
          }));
          if (candles.length >= 30) {
            return res.json({
              success: true, symbol, source: 'Binance',
              candles, rsi: [], macd: [],
              lastPrice: candles[candles.length - 1].close,
            });
          }
        }
      } catch (binanceErr) {
        // Binance de basarisiz, VERI YOK
      }
    }
    return res.status(503).json({ success: false, error: 'VERİ YOK - ' + (e?.message || 'bilinmeyen') });
  }
});

export default router;
