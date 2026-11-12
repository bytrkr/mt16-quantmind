// src/services/execution.ts
/**
 * MT16 Kuant Terminali - Dinamik OCO & İcra Motoru
 * Kurumsal Seviye Dinamik OCO (Direnç Kütlesi Öncesi Kâr Al / Takip Eden Zarar Durdur).
 * Stop-Loss Critical Hard-Stop, DataRuleEngine Ön Filtre ve Distribution Override kuralları ile güçlendirilmiştir.
 */

import { DepthSnapshot } from './microstructure';
import { JuryDecision } from './jury';

export interface ExecutionPlan {
  symbol: string;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  takeProfitPrice: number;
  trailingStopPrice: number;
  slippageTolerance: number;
  actionable: boolean;
  status: 'READY' | 'STOP_EXECUTED' | 'NOHOLD_LOCKED' | 'PENDING' | 'ORDER_PENDING';
  rationale: string;
  massResistanceLevel: number;
  bidSupportLevel: number;
  riskRewardRatio: number;
  orderType: 'OCO_LIMIT_DYNAMIC' | 'EMERGENCY_STOP_EXIT' | 'NOHOLD_DISTRIBUTION_LOCK' | 'LIMIT_ORDER_PENDING';
  isPreFiltered?: boolean;
  wallTrapDetected?: boolean;
  timestamp: number;
}

export class ExecutionEngine {
  /**
   * Derinlik defteri, ön filtre kalkanı ve jüri kararına göre dinamik OCO icra planı üretir.
   */
  public createPlan(
    symbol: string,
    currentPrice: number,
    jury: JuryDecision,
    depth: DepthSnapshot
  ): ExecutionPlan {
    if (currentPrice <= 0) {
      return {
        symbol,
        side: 'BUY',
        entryPrice: 0,
        takeProfitPrice: 0,
        trailingStopPrice: 0,
        slippageTolerance: 0,
        actionable: false,
        status: 'PENDING',
        rationale: 'Canlı piyasa verisi bekleniyor. Henüz aktif icra planı kurulamaz.',
        massResistanceLevel: 0,
        bidSupportLevel: 0,
        riskRewardRatio: 0,
        orderType: 'OCO_LIMIT_DYNAMIC',
        timestamp: Date.now(),
      };
    }

    const asks = depth.asks || [];
    const bids = depth.bids || [];

    // 1. En kalın satış direnç duvarını (Mass Resistance) bul
    let maxAskVol = 0;
    let massResistanceLevel = Number((currentPrice * 1.035).toFixed(2));

    for (const ask of asks) {
      if (ask.price > currentPrice && ask.volume > maxAskVol) {
        maxAskVol = ask.volume;
        massResistanceLevel = ask.price;
      }
    }

    // 2. En kalın alış destek duvarını (Bid Support) bul
    let maxBidVol = 0;
    let bidSupportLevel = currentPrice > 0 ? Number((currentPrice * 0.98).toFixed(2)) : 98.0;

    for (const bid of bids) {
      if (bid.price < currentPrice && bid.volume > maxBidVol) {
        maxBidVol = bid.volume;
        bidSupportLevel = bid.price;
      }
    }

    // 3. Kâr Al (Take Profit):
    // BECERİ 2: Duvar Erime Hızı Kontrolü - Eğer duvar erime süresi > 30 dk ise duvar "Tuzak"tır ve TP duvarın önüne çekilir
    let takeProfitPrice = Number((massResistanceLevel * 0.998).toFixed(2));
    const wallTrapDetected = Boolean(jury.preFilterResult?.wallTrapDetected);
    if (wallTrapDetected && jury.preFilterResult?.adjustedTakeProfit) {
      takeProfitPrice = jury.preFilterResult.adjustedTakeProfit;
    }

    // 4. Takip Eden Zarar Durdur (Trailing Stop):
    // Asgari VaR tabanlı güvenli SL seviyesi (en az %2.50)
    const trailingStopPrice = Number(Math.min(currentPrice * 0.975, bidSupportLevel * 0.995).toFixed(2));

    // 5. Kayma Toleransı
    const slippageTolerance = 0.0025; // %0.25 azami kayma toleransı

    // 6. Risk / Ödül Oranı
    const potentialReward = Math.max(0.01, takeProfitPrice - currentPrice);
    const potentialRisk = Math.max(0.01, currentPrice - trailingStopPrice);
    const riskRewardRatio = Number((potentialReward / potentialRisk).toFixed(2));

    // =========================================================================
    // HİYERARŞİ KURALI 1: CRITICAL HARD-STOP (STOP-LOSS İHLALİ)
    // =========================================================================
    if (jury.isHardStop || jury.verdict === 'STOP_EXECUTED' || jury.preFilterResult?.finalVerdict === 'STOP_EXECUTED') {
      return {
        symbol,
        side: 'SELL',
        entryPrice: currentPrice,
        takeProfitPrice: 0,
        trailingStopPrice: currentPrice,
        slippageTolerance: 0.005,
        actionable: true,
        status: 'STOP_EXECUTED',
        orderType: 'EMERGENCY_STOP_EXIT',
        rationale: jury.rationale || '🛑 CRITICAL HARD-STOP / ACİL ÇIKIŞ: Stop-Loss seviyesi ihlal edildi. Piyasa emriyle acil tasfiye devrede!',
        massResistanceLevel,
        bidSupportLevel,
        riskRewardRatio: 0,
        isPreFiltered: true,
        wallTrapDetected,
        timestamp: Date.now()
      };
    }

    // =========================================================================
    // HİYERARŞİ KURALI 1.5: ÖN FİLTRE VETOSU (SPOOFING / BENEISH / BOĞA TUZAĞI)
    // =========================================================================
    if (jury.isPreFiltered && (jury.verdict === 'HOLD' || jury.verdict === 'VETO')) {
      return {
        symbol,
        side: 'SELL',
        entryPrice: currentPrice,
        takeProfitPrice,
        trailingStopPrice,
        slippageTolerance,
        actionable: false,
        status: 'NOHOLD_LOCKED',
        orderType: 'NOHOLD_DISTRIBUTION_LOCK',
        rationale: jury.rationale || '🛡️ ÖN FİLTRE DEVREDE (VETO / NOHOLD): Kök veri kural ihlali nedeniyle işlem durduruldu.',
        massResistanceLevel,
        bidSupportLevel,
        riskRewardRatio,
        isPreFiltered: true,
        wallTrapDetected,
        timestamp: Date.now()
      };
    }

    // =========================================================================
    // HİYERARŞİ KURALI 0: JÜRİ BEKLE / NÖTR KONTROLÜ
    // Jüri "BEKLE" diyorsa, icra motoru "Emir Beklemede" demelidir. Asla ACİL ÇIKIŞ veremez!
    // =========================================================================
    const isJuryWait = jury.verdict === 'NEUTRAL' || (jury.verdict as string) === 'BEKLE' || (jury.verdict as string) === 'HOLD' || (jury.verdict as string) === 'NÖTR';
    if (isJuryWait) {
      return {
        symbol,
        side: 'BUY',
        entryPrice: currentPrice,
        takeProfitPrice,
        trailingStopPrice,
        slippageTolerance,
        actionable: false,
        status: 'ORDER_PENDING',
        orderType: 'LIMIT_ORDER_PENDING',
        rationale: 'Jüri kararı BEKLE: İcra motoru bekleme modundadır (Emir Beklemede). Piyasa teyidi bekleniyor.',
        massResistanceLevel,
        bidSupportLevel,
        riskRewardRatio,
        isPreFiltered: false,
        wallTrapDetected,
        timestamp: Date.now()
      };
    }

    // =========================================================================
    // HİYERARŞİ KURALI 2: DAĞITIM / TUZAK (DISTRIBUTION OVERRIDE - NOHOLD)
    // =========================================================================
    if (jury.isDistributionLock || jury.verdict === 'DISTRIBUTION' || jury.verdict === 'TRAP_ALERT' || jury.verdict === 'STRONG_SELL') {
      return {
        symbol,
        side: 'SELL',
        entryPrice: currentPrice,
        takeProfitPrice,
        trailingStopPrice,
        slippageTolerance,
        actionable: false,
        status: 'NOHOLD_LOCKED',
        orderType: 'NOHOLD_DISTRIBUTION_LOCK',
        rationale: '🔒 NOHOLD / SATIŞ KİLİT: Dağıtım veya Tuzak alarmı nedeniyle alım şartı beklemesi derhal iptal edildi. Tahta alıma kilitlendi.',
        massResistanceLevel,
        bidSupportLevel,
        riskRewardRatio,
        isPreFiltered: false,
        wallTrapDetected,
        timestamp: Date.now()
      };
    }

    // =========================================================================
    // NORMAL AKIŞ: OCO DİNAMİK İCRA ŞARTLARI
    // =========================================================================
    const hasFatalWarning = jury.warnings.some(w => 
      w.includes('TUZAK') || w.includes('Kırmızı Bayrak') || w.includes('İflas')
    );
    const isHighConviction = (jury.score >= 80 || jury.verdict === 'SHORT_SQUEEZE');
    const actionable = isHighConviction && !hasFatalWarning && riskRewardRatio >= 1.5;

    let rationale = '';
    let status: ExecutionPlan['status'] = 'PENDING';

    if (actionable) {
      status = 'READY';
      rationale = `ONAYLANDI (Skor: ${jury.score}/100, R:R: 1:${riskRewardRatio}): Dinamik OCO hazır. Hedef Kâr Al ₺${takeProfitPrice} (${massResistanceLevel} direnç kütlesi önü), Takip Eden Stop ₺${trailingStopPrice} seviyesine kilitlendi.` + (wallTrapDetected ? ' [Tuzak Duvar Koruması Aktif]' : '');
    } else if (hasFatalWarning) {
      status = 'NOHOLD_LOCKED';
      rationale = `REDDEDİLDİ: Kritik uyarı/kırmızı bayrak tespit edildi. Adli veya tuzak riski nedeniyle emir engellendi.`;
    } else if (jury.score < 80) {
      status = 'PENDING';
      rationale = `BEKLEMEDE: Jüri skoru (%${jury.score}) kurumsal icra eşiği olan %80'in altında.`;
    } else {
      status = 'PENDING';
      rationale = `BEKLEMEDE: Risk/Ödül oranı (1:${riskRewardRatio}) minimum 1:1.5 standardını karşılamıyor.`;
    }

    return {
      symbol,
      side: 'BUY',
      entryPrice: currentPrice,
      takeProfitPrice,
      trailingStopPrice,
      slippageTolerance,
      actionable,
      status,
      rationale,
      massResistanceLevel,
      bidSupportLevel,
      riskRewardRatio,
      orderType: 'OCO_LIMIT_DYNAMIC',
      isPreFiltered: false,
      wallTrapDetected,
      timestamp: Date.now()
    };
  }
}

export const executionEngine = new ExecutionEngine();
