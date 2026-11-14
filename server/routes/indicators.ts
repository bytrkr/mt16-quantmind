import { Router, Request, Response } from 'express';
import { RSI, MACD, SMA, EMA, BollingerBands, ATR } from 'technicalindicators';
const router = Router();
router.get('/:symbol', async (req: Request, res: Response) => {
  const symbol = (req.params.symbol || 'THYAO').toUpperCase();
  try {
    let yahooSymbol = symbol;
    if (symbol.endsWith('USDT')) {
      yahooSymbol = symbol.replace('USDT', '-USD');
    } else if (['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'GOOGL', 'META'].includes(symbol)) {
      yahooSymbol = symbol;
    } else {
      yahooSymbol = `${symbol}.IS`;
    }
    const proxyUrl = `http://localhost:3000/api/yahoo-proxy?symbol=${encodeURIComponent(yahooSymbol)}`;
    const yRes = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
    if (!yRes.ok) return res.status(503).json({ success: false, error: 'VERİ YOK - Yahoo Proxy' });
    const yData: any = await yRes.json();
    const result = yData?.chart?.result?.[0];
    if (!result) return res.status(503).json({ success: false, error: 'VERİ YOK - Yahoo Proxy' });
    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const opens = quotes.open || [];
    const highs = quotes.high || [];
    const lows = quotes.low || [];
    const closes = quotes.close || [];
    const volumes = quotes.volume || [];
    const candles = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] == null || opens[i] == null || highs[i] == null || lows[i] == null) continue;
      candles.push({ time: new Date(timestamps[i] * 1000).toISOString().split('T')[0], open: opens[i], high: highs[i], low: lows[i], close: closes[i], volume: volumes[i] || 0 });
    }
    if (candles.length < 30) return res.status(503).json({ success: false, error: 'VERİ YOK - yetersiz mum' });
    const closeArr = candles.map((c: any) => c.close);
    const highArr = candles.map((c: any) => c.high);
    const lowArr = candles.map((c: any) => c.low);
    const rsi14 = RSI.calculate({ values: closeArr, period: 14 });
    const macd = MACD.calculate({ values: closeArr, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false });
    const sma20 = SMA.calculate({ values: closeArr, period: 20 });
    const ema50 = EMA.calculate({ values: closeArr, period: 50 });
    const bb = BollingerBands.calculate({ values: closeArr, period: 20, stdDev: 2 });
    const atr14 = ATR.calculate({ high: highArr, low: lowArr, close: closeArr, period: 14 });
    const rsiData = rsi14.map((v: number, i: number) => ({ time: candles[candles.length - rsi14.length + i].time, value: Math.round(v * 100) / 100 }));
    const macdData = macd.map((m: any, i: number) => ({ time: candles[candles.length - macd.length + i].time, value: Math.round((m.MACD || 0) * 100) / 100 }));
    let fundamentals: any = {};
    try {
      const fundUrl = `http://localhost:3000/api/yahoo-fundamentals-proxy?symbol=${encodeURIComponent(yahooSymbol)}`;
      const fRes = await fetch(fundUrl, { signal: AbortSignal.timeout(10000) });
      if (fRes.ok) {
        const fData: any = await fRes.json();
        const result = fData?.quoteSummary?.result?.[0] || {};
        const stats = result.defaultKeyStatistics || {};
        const fin = result.financialData || {};
        const detail = result.summaryDetail || {};
        const price = result.price || {};
        fundamentals = {
          trailingPE: detail.trailingPE?.raw ?? null,
          priceToBook: stats.priceToBook?.raw ?? null,
          marketCap: price.marketCap?.raw ?? null,
          beta: stats.beta?.raw ?? null,
          dividendYield: detail.dividendYield?.raw ?? null,
          returnOnEquity: fin.returnOnEquity?.raw ?? null,
          profitMargins: fin.profitMargins?.raw ?? null,
          forwardPE: detail.forwardPE?.raw ?? null,
          sharesOutstanding: stats.sharesOutstanding?.raw ?? null,
          bookValue: stats.bookValue?.raw ?? null,
          fiftyTwoWeekHigh: detail.fiftyTwoWeekHigh?.raw ?? null,
          fiftyTwoWeekLow: detail.fiftyTwoWeekLow?.raw ?? null,
          rsi14: rsiData.slice(-1)[0]?.value ?? null,
        };
      }
    } catch (e) {}

    return res.json({ success: true, symbol, source: 'Yahoo Finance (proxy)', candles, rsi: rsiData, macd: macdData, sma20: sma20.slice(-1)[0], ema50: ema50.slice(-1)[0], bollinger: bb.slice(-1)[0], atr14: atr14.slice(-1)[0], lastPrice: candles[candles.length - 1].close, fundamentals });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: 'VERİ YOK - ' + (e?.message || 'bilinmeyen') });
  }
});
export default router;
