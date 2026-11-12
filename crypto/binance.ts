// Binance Public REST API Fetcher
export async function fetchBinanceData(symbol: string) {
  const cleanPair = symbol.toUpperCase().trim();
  const isBtc = cleanPair === 'BTCUSDT';

  const [depthRes, tradesRes, klinesRes, btcKlinesRes, dailyKlinesRes, fundingRes, oiRes, fearRes] = await Promise.all([
    fetch(`https://api.binance.com/api/v3/depth?symbol=${cleanPair}&limit=10`).then(r => r.ok ? r.json() : null),
    fetch(`https://api.binance.com/api/v3/trades?symbol=${cleanPair}&limit=1000`).then(r => r.ok ? r.json() : null),
    fetch(`https://api.binance.com/api/v3/klines?symbol=${cleanPair}&interval=1m&limit=50`).then(r => r.ok ? r.json() : null),
    !isBtc ? fetch(`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=50`).then(r => r.ok ? r.json() : null) : Promise.resolve(null),
    fetch(`https://api.binance.com/api/v3/klines?symbol=${cleanPair}&interval=1d&limit=30`).then(r => r.ok ? r.json() : null),
    fetch(`https://fapi.binance.com/fapi/v1/fundingRate?symbol=${cleanPair}&limit=1`).then(r => r.ok ? r.json() : null).catch(() => null),
    fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${cleanPair}`).then(r => r.ok ? r.json() : null).catch(() => null),
    fetch(`https://api.alternative.me/fng/?limit=1`).then(r => r.ok ? r.json() : null).catch(() => null)
  ]);

  return { depthRes, tradesRes, klinesRes, btcKlinesRes, dailyKlinesRes, fundingRes, oiRes, fearRes };
}
