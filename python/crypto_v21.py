"""Kripto v2.1 - Python motoru. Sadece BTC/ETH/SOL, sadece 【entity-Binance¦canonical_name=Binance】."""
import json, urllib.request

SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"]

def _get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "bistapp"})
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read().decode())

def fetch_symbol(sym):
    price = float(_get(f"https://api.binance.com/api/v3/ticker/price?symbol={sym}")["price"])
    depth = _get(f"https://api.binance.com/api/v3/depth?symbol={sym}&limit=10")
    bid_vol = sum(float(x[1]) for x in depth["bids"])
    ask_vol = sum(float(x[1]) for x in depth["asks"])
    obi = (bid_vol - ask_vol) / (bid_vol + ask_vol) if (bid_vol + ask_vol) > 0 else 0.0
    trades = _get(f"https://api.binance.com/api/v3/aggTrades?symbol={sym}&limit=1000")
    # VPIN 50 bucket: TS ile ayni metod
    bucket_n = 50
    per = len(trades) // bucket_n
    vals = []
    for i in range(bucket_n):
        chunk = trades[i*per:(i+1)*per]
        b = sum(float(x["q"]) for x in chunk if not x["m"])
        s = sum(float(x["q"]) for x in chunk if x["m"])
        tt = b + s
        if tt > 0:
            vals.append(abs(b - s) / tt)
    vpin = sum(vals) / len(vals) if vals else 0.0
    try:
        fr = _get(f"https://fapi.binance.com/fapi/v1/fundingRate?symbol={sym}&limit=1")
        funding = float(fr[0]["fundingRate"]) if fr else None
    except Exception:
        funding = None
    try:
        oi = _get(f"https://fapi.binance.com/fapi/v1/openInterest?symbol={sym}")
        oi_val = float(oi["openInterest"])
    except Exception:
        oi_val = None
    # CVD: alim - satim hacim farki (1000 trade)
    buy_q = sum(float(x["q"]) for x in trades if not x["m"])
    sell_q = sum(float(x["q"]) for x in trades if x["m"])
    cvd = round(buy_q - sell_q, 2)
    # Wall Z: en buyuk kademe / ortalama kademe
    bid_sizes = [float(x[1]) for x in depth["bids"]]
    ask_sizes = [float(x[1]) for x in depth["asks"]]
    all_sizes = bid_sizes + ask_sizes
    avg_sz = sum(all_sizes) / len(all_sizes) if all_sizes else 0
    max_sz = max(all_sizes) if all_sizes else 0
    wall_z = round(max_sz / avg_sz if avg_sz > 0 else 0, 2)
    vol = fetch_volatility(sym)
    return {"symbol": sym, "price": price, "obi": round(obi, 4), "vpin": round(vpin, 4), "funding": funding, "openInterest": oi_val, "cvd": cvd, "wallZ": wall_z, "volatility": vol}

def fetch_volatility(sym):
    try:
        kl = _get(f"https://api.binance.com/api/v3/klines?symbol={sym}&interval=1d&limit=30")
        closes = [float(x[4]) for x in kl]
        if len(closes) < 2:
            return None
        import math
        rets = [math.log(closes[i]/closes[i-1]) for i in range(1, len(closes))]
        mean = sum(rets)/len(rets)
        var = sum((x-mean)**2 for x in rets)/len(rets)
        vol = math.sqrt(var) * math.sqrt(365) * 100
        return round(vol, 2)
    except Exception:
        return None

def fetch_fear():
    try:
        d = _get("https://api.alternative.me/fng/?limit=1")
        return int(d["data"][0]["value"])
    except Exception:
        return None

def decide(d, fear):
    reasons = []
    if d["vpin"] > 0.35:
        reasons.append(f"VPIN {d['vpin']} > 0.35")
    if d["obi"] < -0.50:
        reasons.append(f"OBI {d['obi']} < -0.50")
    if fear is not None and fear < 40:
        reasons.append(f"Fear {fear} < 40")
    if d["funding"] is not None and d["funding"] > 0:
        reasons.append(f"Funding {d['funding']} > 0")
    action = "VETO_HOLD" if reasons else "PROCEED"
    return action, reasons

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--json":
        import json as _json
        fear = fetch_fear()
        out = []
        for sym in SYMBOLS:
            d = fetch_symbol(sym)
            action, reasons = decide(d, fear)
            d['fear'] = fear
            d['action'] = action
            d['reasons'] = reasons
            out.append(d)
        print(_json.dumps({"fear": fear, "symbols": out}, indent=2))
        sys.exit(0)
    fear = fetch_fear()
    print(f"Fear: {fear}")
    for sym in SYMBOLS:
        d = fetch_symbol(sym)
        action, reasons = decide(d, fear)
        print(f"{sym} price={d['price']} VPIN={d['vpin']} OBI={d['obi']} CVD={d['cvd']} WallZ={d['wallZ']} Vol={d['volatility']}% funding={d['funding']} OI={d['openInterest']} -> {action} | {'; '.join(reasons) if reasons else 'kural ihlali yok'}")
