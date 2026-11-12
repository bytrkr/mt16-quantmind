import { checkAlpacaStatus } from "./alpaca.js";
import { getNasdaqSessionStatus } from "./session.js";
import { evaluateSecFilings } from "./sec.js";
import { evaluateEarnings } from "./earnings.js";
import { evaluateShortInterest } from "./short.js";
import { evaluatePremarket } from "./premarket.js";

export async function analyzeNasdaqSymbol(cleanSym: string) {
  const alpacaStatus = checkAlpacaStatus();
  const sessionInfo = getNasdaqSessionStatus();
  const secInfo = evaluateSecFilings(cleanSym);
  const earningsInfo = evaluateEarnings(cleanSym);
  const shortInfo = evaluateShortInterest(cleanSym);
  const premarketInfo = evaluatePremarket(cleanSym);

  const defaultPrices: Record<string, { price: number }> = {
    // NVDA sahte fiyat silindi
    // AAPL sahte fiyat silindi
    // MSFT sahte fiyat silindi
    // TSLA sahte fiyat silindi
  };
  // GERCEK VERI KILIDI: Bu adapter henuz Alpaca API'sine istek atmiyor.
  // Hardcoded fiyat/VPIN/Wall ile PROCEED donmek uydurma veridir.
  // Gercek Alpaca fetch baglanana kadar Nasdaq VERI YOK doner.
  if (true) {
    return {
      success: true,
      symbol: cleanSym,
      source: "VERI YOK - ALPACA CANLI VERI YOK",
      dataProvider: "ALPACA",
      alpacaKeyStatus: alpacaStatus.hasKey ? "ALPACA ANAHTARI VAR AMA CANLI VERI BAGLI DEGIL" : "ALPACA API ANAHTARI YOK",
      price: null,
      priceNote: "ALPACA CANLI VERI YOK, fiyat yok",
      nasdaqCheck: { sessionPhase: sessionInfo.phase, isMarketOpen: sessionInfo.isOpen, secStatus: "VERI YOK" },
      vpin: { symbol: cleanSym, vpinScore: null, note: "ALPACA CANLI VERI YOK", toxicityLevel: "UNKNOWN", isToxic: false, action: "VETO_HOLD", reason: "VERI YOK, sebep: Alpaca canli veri bagli degil (0 uydurma veri ilkesi)", bucketSize: 0, analyzedTradesCount: 0 },
      sentinel: null, alpha: null, wall: null, portfolio: null,
      extra: { source: "VERI YOK - ALPACA CANLI VERI YOK", obi: "VERI YOK", cvd: "VERI YOK", wallZ: "VERI YOK", volatility: "VERI YOK", sharpeRatio: "VERI YOK", beta: "VERI YOK", earningsNote: "VERI YOK", shortFloatPct: "VERI YOK", premarketGapPct: "VERI YOK" },
      finalDecision: { action: "VETO_HOLD", reason: "VERI YOK, sebep: Alpaca canli veri bagli degil" }
    };
  }
  const currentPrice = null;

  return {
    success: true,
    symbol: cleanSym,
    source: "Alpaca Market Data API (https://paper-api.alpaca.markets)",
    price: currentPrice,
    nasdaqCheck: {
      sessionPhase: sessionInfo.phase,
      isMarketOpen: sessionInfo.isOpen,
      secStatus: secInfo.status
    },
    vpin: {
      symbol: cleanSym,
      vpinScore: 0.18,
      note: "Alpaca L2 Akışından 50 Bucket ile Hesaplandı",
      toxicityLevel: "SAFE",
      isToxic: false,
      action: "PROCEED",
      reason: "Alpaca Güvenli Akış (0.1800 <= 0.35)",
      bucketSize: 5000,
      analyzedTradesCount: 1000
    },
    sentinel: {
      approved: true,
      action: "PROCEED",
      reason: "Alpaca Risk Guard Onayladı: Pozisyon Payı %15.00",
      stockAllocationPct: 15.0,
      sectorAllocationPct: 25.0,
      dailyLossPct: 0.0
    },
    alpha: {
      symbol: cleanSym,
      direction: "BULLISH",
      confidence: 90,
      timeHorizon: "1-5 Gün",
      sourceModel: "Nasdaq-QuantMind-V1"
    },
    wall: {
      symbol: cleanSym,
      type: "DESTEK_DUVARI",
      price: currentPrice,
      wall_lot: 50000,
      wallZScore: 3.4,
      note: "Alpaca Order Book 10-Kademe Derinlikten Hesaplandı"
    },
    portfolio: {
      status: "OK",
      kellyFraction: 0.18,
      kellyFormula: "f* = (p*b - q) / b",
      portfolioRisk: "%28.40 Volatilite Riski",
      optimalWeightPct: 20.0,
      alpacaPaperStatus: alpacaStatus.statusText
    },
    extra: {
      source: "Alpaca Market Data API",
      obi: "+0.3200 (Alpaca L2 Order Book)",
      cvd: `+4200.00 ${cleanSym} (Agresif Delta)`,
      wallZ: "3.40 Z",
      volatility: "%28.40 (Yıllıklandırılmış)",
      sharpeRatio: "1.65",
      beta: "1.25 (vs S&P 500)",
      earningsNote: earningsInfo.note,
      shortFloatPct: `%${shortInfo.shortFloatPct.toFixed(1)}`,
      premarketGapPct: `%${premarketInfo.premarketGapPct.toFixed(2)}`
    },
    finalDecision: {
      action: "PROCEED",
      reason: "Tüm Nasdaq Kuant Aşamaları Onaylandı."
    }
  };
}
