import os
import asyncio
import requests
import yfinance as yf
from typing import Dict, Any, Tuple, Optional

# --- Gemini API Yapılandırması (Yeni ve Eski Sürüm Uyumlu) ---
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()

# Yeni google-genai kütüphanesini dene
try:
    from google import genai as new_genai
    from google.genai import types as genai_types
    _USE_NEW_GENAI = True
    _genai_client = new_genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
except ImportError:
    _USE_NEW_GENAI = False
    _genai_client = None
    try:
        import google.generativeai as old_genai
        if GEMINI_API_KEY:
            old_genai.configure(api_key=GEMINI_API_KEY)
        _old_genai = old_genai
    except ImportError:
        _old_genai = None

GEMINI_MODEL_NAME = 'gemini-1.5-flash'


def fix_ticker_symbol(symbol: str) -> str:
    """Sembolün ABD hissesi mi yoksa BIST hissesi mi olduğunu ayırt eder."""
    symbol = symbol.strip().upper()
    us_tickers = ["NVDA", "AAPL", "MSFT", "TSLA", "AMZN", "GOOGL", "META", "QQQ", "SPY"]
    if symbol in us_tickers:
        return symbol
    if not symbol.endswith(".IS"):
        return f"{symbol}.IS"
    return symbol


async def get_market_data_async(symbol: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Yahoo Finance üzerinden piyasa verisini asenkron olarak çeker.
    """
    formatted_symbol = fix_ticker_symbol(symbol)
    loop = asyncio.get_event_loop()

    def _fetch():
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        try:
            ticker = yf.Ticker(formatted_symbol, session=session)
            df = ticker.history(period="1d", interval="1m", timeout=5)
            if df.empty:
                return None, f"Veri boş döndü ({formatted_symbol})."
            info = ticker.info or {}
            current_price = float(df["Close"].iloc[-1])
            open_price = float(df["Open"].iloc[0])
            change_pct = ((current_price - open_price) / open_price * 100) if open_price > 0 else 0.0
            return {
                "ticker": symbol.upper().replace(".IS", ""),
                "price": round(current_price, 2),
                "change_pct": round(change_pct, 2),
                "volume": int(df["Volume"].sum()),
                "sector": info.get("sector", "BIST"),
                "pe_ratio": info.get("trailingPE", 0.0) or 0.0,
            }, None
        except Exception as e:
            return None, f"Piyasa verisi hatası: {str(e)}"

    return await loop.run_in_executor(None, _fetch)


async def _call_gemini_async(prompt: str) -> Optional[str]:
    """Gemini API çağrısı (yeni ve eski sürüm uyumlu)."""
    if not GEMINI_API_KEY:
        return None
    loop = asyncio.get_event_loop()

    def _run():
        try:
            if _USE_NEW_GENAI and _genai_client:
                response = _genai_client.models.generate_content(
                    model=GEMINI_MODEL_NAME,
                    contents=prompt,
                )
                return getattr(response, "text", None)
            elif not _USE_NEW_GENAI and _old_genai is not None:
                model = _old_genai.GenerativeModel(GEMINI_MODEL_NAME)
                response = model.generate_content(prompt)
                return getattr(response, "text", None)
            return None
        except Exception as e:
            print(f"[BIST_ANALYST] Gemini API hatası: {e}")
            return None

    return await loop.run_in_executor(None, _run)


async def analyze_bist_stock(symbol: str) -> Dict[str, Any]:
    """
    BIST (veya NASDAQ) hissesi için piyasa verisini çeker, Gemini ile analiz eder
    ve yapılandırılmış bir karar döndürür.
    """
    clean_symbol = (symbol or "ASELS").strip().upper()
    market_data, error = await get_market_data_async(clean_symbol)

    if error or not market_data:
        return {
            "success": False,
            "ticker": clean_symbol,
            "error": error or "Piyasa verisi alınamadı.",
            "verdict": "NO_DATA",
            "reasoning": f"{clean_symbol} için piyasa verisi çekilemedi: {error}",
        }

    prompt = f"""
Sen kıdemli bir kurumsal kuant stratejistsin. Aşağıdaki {clean_symbol} hisse verilerine göre
kısa ve net bir analiz yap. Cevabını sadece JSON formatında ver.

Veriler:
- Fiyat: {market_data['price']} TL
- Günlük Değişim: {market_data['change_pct']}%
- Hacim: {market_data['volume']}
- Sektör: {market_data['sector']}

JSON Formatı (sadece bu alanlar):
{{
  "verdict": "AL" | "SAT" | "BEKLE",
  "confidence_score": 0-100 arası sayı,
  "reasoning": "kısa gerekçe (max 2 cümle)"
}}
"""

    gemini_response = await _call_gemini_async(prompt)

    import json
    parsed = None
    if gemini_response:
        try:
            cleaned = gemini_response.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("```")[1]
                if cleaned.startswith("json"):
                    cleaned = cleaned[4:]
            parsed = json.loads(cleaned.strip())
        except Exception:
            parsed = None

    if parsed and isinstance(parsed, dict):
        return {
            "success": True,
            "ticker": market_data["ticker"],
            "market_data": market_data,
            "verdict": parsed.get("verdict", "BEKLE"),
            "confidence_score": parsed.get("confidence_score", 50),
            "reasoning": parsed.get("reasoning", "Gemini analizi tamamlandı."),
            "source": "GEMINI_LIVE" if _USE_NEW_GENAI else "GEMINI_LEGACY",
        }

    # Gemini cevap vermezse kural tabanlı fallback
    score = 50
    verdict = "BEKLE"
    if market_data["change_pct"] > 2.0:
        score, verdict = 70, "AL"
    elif market_data["change_pct"] < -2.0:
        score, verdict = 30, "SAT"

    return {
        "success": True,
        "ticker": market_data["ticker"],
        "market_data": market_data,
        "verdict": verdict,
        "confidence_score": score,
        "reasoning": f"Kural tabanlı analiz (Gemini çağrısı yapılamadı). Günlük değişim: {market_data['change_pct']}%.",
        "source": "RULE_BASED_FALLBACK",
    }