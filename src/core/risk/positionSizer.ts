/**
 * ============================================================================
 * 🧠 MT16 QUANTMIND - SİSTEM TALİMATNAMESİ (SYSTEM INSTRUCTIONS)
 * ============================================================================
 * 
 * 1. GÖREV TANIMI:
 *    src/core/risk/positionSizer.ts
 *    Pozisyon Boyutlandırma Ajanı (Position Sizer).
 *    RiskKit kütüphanesinden ilham alarak "Lot Büyütme" ve "Sermaye Koruma"
 *    kurallarını deterministik olarak hesaplar.
 * 
 * 2. ANAYASAL KURALLAR (QODI STANDARTLARI):
 *    - Kural 1 (SSOT): Veri sadece marketGateway ve kapDaemon'dan gelir.
 *    - Kural 2 (Fallback Yasağı): Eğer veri null ise, asla sahte 0, 100 veya 
 *      varsayılan değer atanmaz. Ekrana "VERİ YOK" döner.
 *    - Kural 3 (Karar Zarfı): Her işlem kararı karar zarfı kurallarına uyar.
 *    - Kural 4 (Sıfır Bağımlılık): Dış LLM veya API olmasa dahi deterministik
 *      matematiksel çekirdek tam kapasite çalışır.
 * 
 * 3. HESAPLAMA KURALLARI:
 *    - Temel Lot: (Equity * Risk%) / (Price * ATR_Stop_Pct)
 *    - Kelly Sınırı: kellyFraction > 0.25 ise 0.25 ile sınırla (Half-Kelly)
 *    - Kayıp Merdiveni & Sıfırlama:
 *        resetLossCounter === true ise (tek kazanç sonrası) kayıp sayacı = 0
 *        consecutiveLosses >= 2 -> %25 küçült (0.75x)
 *        consecutiveLosses >= 3 -> %50 küçült (0.50x)
 *        consecutiveLosses >= 4 -> işlem yapma (lot = 0)
 *    - Drawdown Koruması (Peak-to-Trough Freni):
 *        peakEquity veya peakToTroughDrawdownPct ayrı parametre olarak hesaplanır.
 *        drawdown > 10 -> %75 küçült (0.25x)
 *    - Maksimum Lot: Hesaplanan lot sermayenin %20'sinden fazla olamaz
 * ============================================================================
 */

export interface PositionSizeResult {
  lot: number | null;
  baseLot: number | null;
  effectiveKelly: number | null;
  effectiveRiskPct: number | null;
  effectiveConsecutiveLosses: number;
  lossScale: number | null;
  peakToTroughDrawdownPct: number | null;
  drawdownScale: number | null;
  maxLotLimit: number | null;
  isCappedByEquity: boolean;
  isBlocked: boolean;
  reason: string;
}

export interface PositionSizeOptions {
  riskPct?: number | null;
  resetLossCounter?: boolean | null; // Tek kazanç sonrası kayıp merdivenini sıfırla
  peakEquity?: number | null; // Peak-to-Trough hesabı için zirve sermaye
  peakToTroughDrawdownPct?: number | null; // Ayrı Peak-to-Trough drawdown fren yüzdesi
}

/**
 * Pozisyon Boyutlandırma Hesabı (RiskKit & Half-Kelly Mantığı)
 *
 * @param equity Toplam portföy sermayesi
 * @param price İlgili hisse / varlığın birim fiyatı
 * @param atrStopPct ATR Stop yüzdesi (örn. 0.02 veya %2)
 * @param kellyFraction Ham Kelly kriteri kesri (örn. 0.12 veya 0.35)
 * @param consecutiveLosses Art arda gerçekleşen kayıp işlem adedi
 * @param currentDrawdownPct Güncel portföy geri çekilme yüzdesi (örn. 5 veya 12)
 * @param riskPct İsteğe bağlı sabit risk oranı (belirtilmemişse Kelly kullanılır)
 * @param resetLossCounter Tek kazanç gerçekleştiğinde kayıp sayacını sıfırlama bayrağı
 * @param peakEquity Zirve portföy seviyesi (Peak-to-Trough hesabı)
 * @param peakToTroughDrawdownPct Ayrı Peak-to-Trough drawdown fren yüzdesi
 * @returns Hesaplanmış lot adedi (tam sayı) veya veri yoksa null
 */
export function calculatePositionSize(
  equity: number | null,
  price: number | null,
  atrStopPct: number | null,
  kellyFraction: number | null,
  consecutiveLosses: number | null,
  currentDrawdownPct: number | null,
  riskPct?: number | null,
  resetLossCounter?: boolean | null,
  peakEquity?: number | null,
  peakToTroughDrawdownPct?: number | null
): number | null {
  if (
    equity === null ||
    price === null ||
    atrStopPct === null ||
    kellyFraction === null ||
    equity <= 0 ||
    price <= 0 ||
    atrStopPct <= 0
  ) {
    return null;
  }

  // 1. Kelly Sınırı: Half-Kelly (maksimum 0.25)
  const normalizedKelly = kellyFraction > 1 ? kellyFraction / 100 : kellyFraction;
  const effectiveKelly = normalizedKelly > 0.25 ? 0.25 : Math.max(0, normalizedKelly);

  let effectiveRisk: number;
  if (riskPct !== null && riskPct !== undefined && riskPct > 0) {
    effectiveRisk = riskPct > 1 ? riskPct / 100 : riskPct;
  } else {
    effectiveRisk = effectiveKelly;
  }

  const normalizedAtrStop = atrStopPct > 1 ? atrStopPct / 100 : atrStopPct;
  const stopDistancePerShare = price * normalizedAtrStop;
  if (stopDistancePerShare <= 0) {
    return null;
  }

  // 2. Temel Lot: (Equity * Risk%) / (Price * ATR_Stop_Pct)
  const totalRiskCapital = equity * effectiveRisk;
  let lot = totalRiskCapital / stopDistancePerShare;

  // 3. Kayıp Merdiveni & Tek Kazanç Sıfırlama Kuralı:
  // resetLossCounter === true ise (tek kazanç sonrası) kayıp sayacı 0 kabul edilir
  const effectiveLosses = resetLossCounter === true
    ? 0
    : (consecutiveLosses !== null && consecutiveLosses !== undefined ? consecutiveLosses : 0);

  if (effectiveLosses >= 4) {
    return 0;
  } else if (effectiveLosses >= 3) {
    lot = lot * 0.50;
  } else if (effectiveLosses >= 2) {
    lot = lot * 0.75;
  }

  // 4. Drawdown Freni (Peak-to-Trough Ayrı Hesaplama):
  let effectiveDrawdown = 0;
  if (peakToTroughDrawdownPct !== null && peakToTroughDrawdownPct !== undefined) {
    effectiveDrawdown = peakToTroughDrawdownPct;
  } else if (peakEquity !== null && peakEquity !== undefined && peakEquity > 0) {
    effectiveDrawdown = Math.max(0, ((peakEquity - equity) / peakEquity) * 100);
  } else if (currentDrawdownPct !== null && currentDrawdownPct !== undefined) {
    effectiveDrawdown = currentDrawdownPct;
  }

  if (effectiveDrawdown > 10) {
    lot = lot * 0.25;
  }

  // 5. Maksimum Lot: Sermayenin %20 tavanı
  const maxAllowedNotional = equity * 0.20;
  const maxLot = maxAllowedNotional / price;
  if (lot > maxLot) {
    lot = maxLot;
  }

  return Math.max(0, Math.floor(lot));
}

/**
 * Detaylı Pozisyon Boyutlandırma Analizi ve Ajan Raporu
 */
export function calculatePositionSizeDetailed(
  equity: number | null,
  price: number | null,
  atrStopPct: number | null,
  kellyFraction: number | null,
  consecutiveLosses: number | null,
  currentDrawdownPct: number | null,
  riskPct?: number | null,
  resetLossCounter?: boolean | null,
  peakEquity?: number | null,
  peakToTroughDrawdownPct?: number | null
): PositionSizeResult {
  if (
    equity === null ||
    price === null ||
    atrStopPct === null ||
    kellyFraction === null ||
    equity <= 0 ||
    price <= 0 ||
    atrStopPct <= 0
  ) {
    return {
      lot: null,
      baseLot: null,
      effectiveKelly: null,
      effectiveRiskPct: null,
      effectiveConsecutiveLosses: 0,
      lossScale: null,
      peakToTroughDrawdownPct: null,
      drawdownScale: null,
      maxLotLimit: null,
      isCappedByEquity: false,
      isBlocked: true,
      reason: 'YETERSİZ_VERİ (Gerekli risk parametreleri eksik)',
    };
  }

  const normalizedKelly = kellyFraction > 1 ? kellyFraction / 100 : kellyFraction;
  const effectiveKelly = normalizedKelly > 0.25 ? 0.25 : Math.max(0, normalizedKelly);

  let effectiveRisk: number;
  if (riskPct !== null && riskPct !== undefined && riskPct > 0) {
    effectiveRisk = riskPct > 1 ? riskPct / 100 : riskPct;
  } else {
    effectiveRisk = effectiveKelly;
  }

  const normalizedAtrStop = atrStopPct > 1 ? atrStopPct / 100 : atrStopPct;
  const stopDistancePerShare = price * normalizedAtrStop;
  if (stopDistancePerShare <= 0) {
    return {
      lot: null,
      baseLot: null,
      effectiveKelly,
      effectiveRiskPct: effectiveRisk,
      effectiveConsecutiveLosses: 0,
      lossScale: null,
      peakToTroughDrawdownPct: null,
      drawdownScale: null,
      maxLotLimit: null,
      isCappedByEquity: false,
      isBlocked: true,
      reason: 'GEÇERSİZ_STOP_MESAFESİ',
    };
  }

  const baseLot = (equity * effectiveRisk) / stopDistancePerShare;
  let lot = baseLot;

  // Kayıp Merdiveni & Tek Kazanç Sıfırlama
  const effectiveLosses = resetLossCounter === true
    ? 0
    : (consecutiveLosses !== null && consecutiveLosses !== undefined ? consecutiveLosses : 0);

  let lossScale = 1.0;
  let isBlocked = false;
  let reason = 'RiskKit Pozisyon Boyutlandırma Onaylandı';

  if (effectiveLosses >= 4) {
    isBlocked = true;
    lossScale = 0;
    lot = 0;
    reason = 'KAYIP_MERDİVENİ_BLOKAJI (Ardışık 4+ kayıp sebebiyle işlem durduruldu)';
  } else if (effectiveLosses >= 3) {
    lossScale = 0.50;
    lot = lot * 0.50;
    reason = 'KAYIP_MERDİVENİ (%50 Pozisyon Küçültüldü)';
  } else if (effectiveLosses >= 2) {
    lossScale = 0.75;
    lot = lot * 0.75;
    reason = 'KAYIP_MERDİVENİ (%25 Pozisyon Küçültüldü)';
  }

  if (resetLossCounter === true && (consecutiveLosses ?? 0) > 0) {
    reason += ' · KAZANÇ_SONRASI_SAYAC_SIFIRLANDI';
  }

  // Peak-to-Trough Drawdown
  let effectiveDrawdown = 0;
  let calculatedPeakToTrough: number | null = null;

  if (peakToTroughDrawdownPct !== null && peakToTroughDrawdownPct !== undefined) {
    effectiveDrawdown = peakToTroughDrawdownPct;
    calculatedPeakToTrough = peakToTroughDrawdownPct;
  } else if (peakEquity !== null && peakEquity !== undefined && peakEquity > 0) {
    calculatedPeakToTrough = Math.max(0, ((peakEquity - equity) / peakEquity) * 100);
    effectiveDrawdown = calculatedPeakToTrough;
  } else if (currentDrawdownPct !== null && currentDrawdownPct !== undefined) {
    effectiveDrawdown = currentDrawdownPct;
    calculatedPeakToTrough = currentDrawdownPct;
  }

  let drawdownScale = 1.0;
  if (effectiveDrawdown > 10 && !isBlocked) {
    drawdownScale = 0.25;
    lot = lot * 0.25;
    reason += ` · DRAWDOWN_FRENI (Peak-to-Trough çekilme > %10 [${effectiveDrawdown.toFixed(1)}%] olduğu için %75 küçültüldü)`;
  }

  const maxAllowedNotional = equity * 0.20;
  const maxLot = Math.floor(maxAllowedNotional / price);
  let isCappedByEquity = false;

  if (lot > maxLot) {
    lot = maxLot;
    isCappedByEquity = true;
    reason += ' · MAKSİMUM_SERMAYE_TAVANI (Portföyün %20 tavanı uygulandı)';
  }

  const finalLot = Math.max(0, Math.floor(lot));

  return {
    lot: finalLot,
    baseLot: Math.floor(baseLot),
    effectiveKelly,
    effectiveRiskPct: effectiveRisk,
    effectiveConsecutiveLosses: effectiveLosses,
    lossScale,
    peakToTroughDrawdownPct: calculatedPeakToTrough !== null ? Math.round(calculatedPeakToTrough * 10) / 10 : null,
    drawdownScale,
    maxLotLimit: maxLot,
    isCappedByEquity,
    isBlocked,
    reason,
  };
}
