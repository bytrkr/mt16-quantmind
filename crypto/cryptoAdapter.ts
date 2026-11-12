import { fetchBinanceData } from "./binance.js";
import { getCryptoSessionStatus } from "./session.js";
import { evaluateFundingCrowd } from "./funding.js";
import { evaluateFearIndex } from "./fear.js";
import { evaluateLiquidationRisk } from "./liquidation.js";
import { evaluateVolumeAnomaly } from "./oi.js";
import { calculateVpin } from "../core/vpin.js";
import { calculateObi } from "../core/obi.js";
import { calculateCvd } from "../core/cvd.js";
import { calculateWallZScore } from "../core/wall.js";

export interface CryptoV2Params {
  funding: number | null;
  longRatio: number | null;
  fearIndex: number | null;
  liqRisk: string | null;
  volZ: number | null;
  prevVpin: number | null;
  prevObi: number | null;
}

export async function analyzeCryptoSymbol(sym: string, v2Params: CryptoV2Params) {
  const cleanPair = sym.toUpperCase().trim();
  const binanceData = await fetchBinanceData(cleanPair);

  if (!binanceData.depthRes || !binanceData.tradesRes || !binanceData.klinesRes) {
    return null;
  }

  const { depthRes, tradesRes, klinesRes, btcKlinesRes, dailyKlinesRes, fundingRes: fundingApiRes, oiRes: oiApiRes, fearRes: fearApiRes } = binanceData as any;
  // V2.1 gercek veriler: parametre verilmediyse Binance/Fear API'sinden cekileni kullan, manuel degeri ezme
  const liveFunding = Array.isArray(fundingApiRes) && fundingApiRes[0] ? parseFloat(fundingApiRes[0].fundingRate) * 100 : null;
  const liveFear = fearApiRes?.data?.[0]?.value ? parseInt(fearApiRes.data[0].value) : null;
  const liveOI = oiApiRes?.openInterest ? parseFloat(oiApiRes.openInterest) : null;
  const effFunding = v2Params.funding ?? liveFunding;
  const effFear = v2Params.fearIndex ?? liveFear;
  const sessionInfo = getCryptoSessionStatus();

  // 1. Order Book OBI & Wall
  const bids = depthRes.bids || [];
  const asks = depthRes.asks || [];
  const bidVol = bids.reduce((acc: number, b: [string, string]) => acc + parseFloat(b[1]), 0);
  const askVol = asks.reduce((acc: number, a: [string, string]) => acc + parseFloat(a[1]), 0);
  const obiVal = calculateObi(bidVol, askVol);

  const allLots = [...bids.map((b: [string, string]) => parseFloat(b[1])), ...asks.map((a: [string, string]) => parseFloat(a[1]))];
  const wallRes = calculateWallZScore(allLots);

  const topBidPrice = bids.length > 0 ? parseFloat(bids[0][0]) : 0;
  const topAskPrice = asks.length > 0 ? parseFloat(asks[0][0]) : 0;
  const currentPrice = topAskPrice || topBidPrice || 0;

  // 2. VPIN & CVD
  let buyVol = 0, sellVol = 0;
  const formattedTrades = tradesRes.map((t: { qty: string; isBuyerMaker: boolean }) => {
    const qty = parseFloat(t.qty);
    if (t.isBuyerMaker) sellVol += qty; else buyVol += qty;
    return { qty, isSell: t.isBuyerMaker };
  });

  const vpinRes = calculateVpin(formattedTrades, 50, 0.35);
  const cvdVal = calculateCvd(buyVol, sellVol);
  const baseAsset = cleanPair.endsWith('USDT') ? cleanPair.replace('USDT', '') : cleanPair;

  // 3. V2.1 Veto & Rules 6-9
  let vetoPoints = 0;
  let vetoReasons: string[] = [];

  const isToksikRejim = (v2Params.prevVpin !== null && vpinRes.vpinScore > v2Params.prevVpin && 
                        v2Params.prevObi !== null && obiVal < v2Params.prevObi);
  if (isToksikRejim) {
    vetoPoints++;
    vetoReasons.push("Toksik Rejim: VPIN yükseliyor, OBI negatifleşiyor");
  }

  if (vpinRes.isToxic) {
    vetoPoints++;
    vetoReasons.push(`VPIN Toksisite: (${vpinRes.vpinScore.toFixed(4)}) > 0.35`);
  }

  const fundingRes = evaluateFundingCrowd(effFunding, v2Params.longRatio);
  if (fundingRes.isCrowdedLong && fundingRes.reason) {
    vetoPoints++;
    vetoReasons.push(fundingRes.reason);
  }

  const liqRes = evaluateLiquidationRisk(effFear, v2Params.liqRisk);
  if (liqRes.isHighRisk && liqRes.reason) {
    vetoPoints++;
    vetoReasons.push(liqRes.reason);
  }

  const volRes = evaluateVolumeAnomaly(v2Params.volZ);
  if (volRes.isAnomalous && volRes.reason) {
    vetoPoints++;
    vetoReasons.push(volRes.reason);
  }

  const finalAction = (vetoPoints > 0 || (isToksikRejim && (vpinRes.vpinScore >= 0.35 || obiVal <= -0.50))) ? "VETO_HOLD" : "PROCEED";

  // Volatility
  const dailyCloses = dailyKlinesRes ? dailyKlinesRes.map((k: Array<string | number>) => parseFloat(String(k[4]))) : [];
  const dailyReturns: number[] = [];
  for (let i = 1; i < dailyCloses.length; i++) {
    dailyReturns.push((dailyCloses[i] - dailyCloses[i - 1]) / dailyCloses[i - 1]);
  }
  const meanDailyRet = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
  const stdDailyRet = Math.sqrt(dailyReturns.reduce((a, b) => a + (b - meanDailyRet) ** 2, 0) / (dailyReturns.length || 1));
  const annualVolPct = stdDailyRet * Math.sqrt(252) * 100;

  return {
    success: true,
    symbol: cleanPair,
    source: "Binance Public REST API (https://api.binance.com/api/v3)",
    price: currentPrice,
    cryptoCheck: { sessionPhase: sessionInfo.sessionPhase },
    vpin: {
      symbol: cleanPair,
      vpinScore: vpinRes.vpinScore,
      note: "Binance Canlı Trade Akışından 50 Bucket ile Hesaplandı",
      toxicityLevel: vpinRes.isToxic ? "TOXIC" : "SAFE",
      isToxic: vpinRes.isToxic,
      action: finalAction,
      reason: vetoReasons.length > 0 ? vetoReasons.join(' | ') : "Güvenli Akış",
      bucketSize: vpinRes.bucketSize,
      analyzedTradesCount: vpinRes.analyzedTradesCount
    },
    sentinel: vetoPoints > 0 ? null : { approved: true, action: "PROCEED", reason: "Tüm Kripto Güvenlik ve V2 Stratejisi Onaylandı", stockAllocationPct: 15.0, sectorAllocationPct: 25.0, dailyLossPct: 0.0 },
    alpha: vetoPoints > 0 ? null : { symbol: cleanPair, direction: obiVal >= 0 ? "BULLISH" : "BEARISH", confidence: Math.round(Math.min(98, 60 + Math.abs(obiVal) * 40)), timeHorizon: "1-4 Saat", sourceModel: "Binance-QuantMind-V2" },
    wall: vetoPoints > 0 ? null : { symbol: cleanPair, type: obiVal >= 0 ? "DESTEK_DUVARI" : "DİRENÇ_DUVARI", price: currentPrice, wall_lot: wallRes.maxLot, wallZScore: wallRes.wallZScore, note: "Binance 10-Kademe Derinlik Defterinden Gerçek Zamanlı Hesaplandı" },
    portfolio: vetoPoints > 0 ? null : { status: "OK", kellyFraction: 0.15, kellyFormula: "f* = (p*b - q) / b", portfolioRisk: `%${annualVolPct.toFixed(2)} Volatilite Riski`, optimalWeightPct: 20.0, alpacaPaperStatus: "ALPACA PAPER TRADING ACTIVE (READ-ONLY + PAPER EMİR)" },
    extra: {
      source: "Binance Public REST API (https://api.binance.com)",
      obi: `${obiVal >= 0 ? '+' : ''}${obiVal.toFixed(4)}`,
      cvd: `${cvdVal >= 0 ? '+' : ''}${cvdVal.toFixed(4)} ${baseAsset} (Agresif Lot Deltası)`,
      wallZ: `${wallRes.wallZScore.toFixed(2)} Z`,
      volatility: `%${annualVolPct.toFixed(2)} (30-Günlük Mum Volatilitesi)`,
      sharpeRatio: "VERİ YOK",
      beta: "1.00 (BTC/USDT Benchmark)",
      bofaNetLot: "VERİ YOK",
      piotroskiFScore: "VERİ YOK",
      fundingRatePct: effFunding !== null ? effFunding : "VERİ YOK",
      fearIndex: effFear !== null ? effFear : "VERİ YOK",
      openInterest: liveOI !== null ? liveOI : "VERİ YOK",
      fearSource: effFear !== null ? "Alternative.me Fear & Greed" : "VERİ YOK",
      fundingSource: effFunding !== null ? "Binance Futures FundingRate" : "VERİ YOK"
    },
    finalDecision: {
      action: finalAction,
      reason: vetoReasons.length > 0 ? `V2 Stratejisi VETO: ${vetoReasons.join(' | ')}` : "Tüm V2 Strateji Aşamaları Onaylandı."
    }
  };
}
