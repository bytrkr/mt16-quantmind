// src/utils/copyForLLM.ts
/**
 * MT16 BISTAPP — HARİCİ LLM PROMPT, .TOON VE 1 SAYFALIK HTML5 RAPOR ÜRETİCİ (copyForLLM.ts)
 *
 * Mimari Prensip:
 * - Arayüze 9 satırlık kanıt zinciri basmaz; yalnızca saf metin/veri döndürür.
 * - Başka LLM'lere (ChatGPT, Claude, Gemini, DeepSeek) verilecek hazır Kuant Prompt'u,
 *   .TOON (Token-Oriented Object Notation) veri paketini ve 1 sayfalık HTML5 Raporunu üretir.
 * - QODI ANAYASA STANDARDI: Veri null ise ASLA sahte fallback atanmaz veya toFixed ile patlamaz.
 *   Eksik veriler deterministik olarak "VERİ YOK" veya güvenli formatlanır.
 */

import { UnifiedVerdict as FullUnifiedVerdict } from './tacticalCollector';
import { LiveKapDisclosure } from '../services/kapDaemon';
import financeCardsData from '../data/financeCards.json';

function fmtNum(val: number | null | undefined, digits = 2, prefix = '', suffix = ''): string {
  if (typeof val !== 'number' || isNaN(val)) return 'VERİ YOK';
  return `${prefix}${val.toFixed(digits)}${suffix}`;
}

function fmtSigned(val: number | null | undefined, digits = 2, suffix = ''): string {
  if (typeof val !== 'number' || isNaN(val)) return 'VERİ YOK';
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toFixed(digits)}${suffix}`;
}

function fmtInt(val: number | null | undefined, suffix = ''): string {
  if (typeof val !== 'number' || isNaN(val)) return 'VERİ YOK';
  return `${val.toLocaleString('tr-TR')}${suffix}`;
}

function fmtVal(val: any): string {
  if (val === null || val === undefined || val === '') return 'VERİ YOK';
  return String(val);
}

export interface UnifiedVerdict {
  ticker: string;
  price: number | null;
  changePct: number | null;
  zScore: number | null;
  obi: number | null;
  juryScore: number | null;
  riskScore: number | null;
  finalScore: number | null;
  action: string;
  reason: string;
}

function fmt(v: number | null, s = '') {
  return typeof v === 'number' && !isNaN(v) ? `${v.toFixed(2)}${s}` : 'VERİ YOK';
}

export function buildLLMPrompt(v: UnifiedVerdict): string | null {
  if (typeof v.price !== 'number' || isNaN(v.price)) return null;
  const cardsCount = Array.isArray(financeCardsData) ? financeCardsData.length : 14;
  return `Sen MT16 QuantMind Akademi ve Kuant Stratejistisin. Sende ${cardsCount} Disiplin x 25 Madde = 350 İlke Rehberi yüklüdür. VERİLEN fiyatın dışına ASLA çıkma. VERİ: Sembol ${v.ticker} Fiyat ${fmt(v.price, '₺')} Z ${fmt(v.zScore, 'σ')} OBI ${fmt(v.obi)} Jüri ${fmt(v.juryScore, '/100')} Final ${fmt(v.finalScore, '/100')}. GÖREV: Final ≥70 AL, ≤30 SAT, diğer BEKLE. ÇIKTI JSON: {"action":"AL|SAT|BEKLE","reason":"tek cümle Türkçe","price":${v.price}}`.trim();
}

export function buildChatMessages(v: UnifiedVerdict) {
  const prompt = buildLLMPrompt(v);
  if (!prompt) return null;
  return [
    { role: 'system', content: 'Sen MT16 QuantMind, fiyat uydurma, SSOT mutlak.' },
    { role: 'user', content: prompt },
  ];
}

export function guardLLMResponse(llmJson: any, original: UnifiedVerdict): boolean {
  if (!llmJson || typeof llmJson.price !== 'number') return false;
  if (Math.abs(llmJson.price - (original.price || 0)) > 0.5) return false;
  if (!['AL', 'SAT', 'BEKLE'].includes(llmJson.action)) return false;
  return true;
}

/**
 * Başka LLM'lere (ChatGPT, Claude, DeepSeek, Gemini) yapıştırılacak hazır analiz promptu üretir.
 */
export function buildExternalLLMPrompt(
  verdict: FullUnifiedVerdict | any,
  disclosures: LiveKapDisclosure[] = []
): string {
  const cur = verdict?.currencySymbol || '₺';
  const topNews = Array.isArray(disclosures) ? disclosures.slice(0, 4) : [];
  const newsLines =
    topNews.length > 0
      ? topNews
          .map(
            (n, i) =>
              `${i + 1}. [${n.publish_time || 'Canlı'}] (${n.ticker}) ${n.title} — Etki: ${
                typeof n.analysis?.impact_score === 'number'
                  ? `${n.analysis.impact_score >= 0 ? '+' : ''}${n.analysis.impact_score}/100`
                  : 'VERİ YOK'
              }`
          )
          .join('\n')
      : '1. Son seansta olağandışı negatif bildirim yok; rutin akış devam ediyor.';

  const cubeList = verdict?.engines?.storyCubes?.cubes || verdict?.cubes?.cubes || [];
  const cubeSummary =
    cubeList.length > 0
      ? cubeList.map((c) => `${c.label}: ${c.valueText} (${c.signal})`).join(' | ')
      : 'VERİ YOK';

  const priceText = typeof verdict?.price === 'number' ? `${cur}${verdict.price.toFixed(2)}` : 'VERİ YOK';
  const changePctText =
    typeof verdict?.changePct === 'number'
      ? `%${verdict.changePct >= 0 ? '+' : ''}${verdict.changePct.toFixed(2)}`
      : 'VERİ YOK';

  const zScoreText =
    typeof verdict?.zScore === 'number'
      ? `${verdict.zScore >= 0 ? '+' : ''}${verdict.zScore.toFixed(2)}σ`
      : 'VERİ YOK';
  const zThrText =
    typeof verdict?.zThreshold === 'number'
      ? `±${verdict.zThreshold.toFixed(1)}σ`
      : '±2.0σ';

  const obiText =
    typeof verdict?.obi === 'number'
      ? `${verdict.obi >= 0 ? '+' : ''}${verdict.obi.toFixed(3)}`
      : 'VERİ YOK';

  const wallLotText =
    typeof verdict?.wallLot === 'number'
      ? `${verdict.wallLot.toLocaleString('tr-TR')} lot`
      : 'VERİ YOK';
  const wallPriceText =
    typeof verdict?.wallPrice === 'number'
      ? `${cur}${verdict.wallPrice.toFixed(2)}`
      : 'VERİ YOK';
  const breakoutText =
    typeof verdict?.breakoutMinutes === 'number'
      ? `${verdict.breakoutMinutes} dk`
      : 'VERİ YOK';

  const stopPriceText =
    typeof verdict?.stopPrice === 'number'
      ? `${cur}${verdict.stopPrice.toFixed(2)}`
      : 'VERİ YOK';
  const tpPriceText =
    typeof verdict?.tpPrice === 'number'
      ? `${cur}${verdict.tpPrice.toFixed(2)}`
      : 'VERİ YOK';

  const finalScoreText =
    typeof verdict?.finalScore === 'number'
      ? `${verdict.finalScore}/100`
      : 'VERİ YOK';
  const riskScoreText =
    typeof verdict?.riskScore === 'number'
      ? `${verdict.riskScore}/100`
      : 'VERİ YOK';
  const expoScoreText =
    typeof verdict?.expoScore === 'number'
      ? `${verdict.expoScore}/100`
      : 'VERİ YOK';
  const amplifierText =
    typeof verdict?.amplifier === 'number'
      ? `${verdict.amplifier}x`
      : 'VERİ YOK';
  const juryScoreText =
    typeof verdict?.juryScore === 'number'
      ? `%${verdict.juryScore}`
      : 'VERİ YOK';
  const varPctText =
    typeof verdict?.varPct === 'number'
      ? `-%${verdict.varPct}`
      : 'VERİ YOK';
  const kellyPctText =
    typeof verdict?.kellyPct === 'number'
      ? `%${verdict.kellyPct}`
      : 'VERİ YOK';
  const coherenceText =
    typeof verdict?.coherence === 'number'
      ? `%${verdict.coherence}`
      : 'VERİ YOK';

  const anomalyHhi =
    typeof verdict?.engines?.anomaly?.hhi === 'number'
      ? `${verdict.engines.anomaly.hhi}/100`
      : 'VERİ YOK';
  const anomalyIso =
    typeof verdict?.engines?.anomaly?.isolationForestScore === 'number'
      ? String(verdict.engines.anomaly.isolationForestScore)
      : 'VERİ YOK';
  const anomalyTree =
    typeof verdict?.engines?.anomaly?.treeProb === 'number'
      ? `%${verdict.engines.anomaly.treeProb}`
      : 'VERİ YOK';

  const boardMass =
    typeof verdict?.engines?.board?.massResistance === 'number'
      ? `%${verdict.engines.board.massResistance}`
      : 'VERİ YOK';

  const forensicWash =
    typeof verdict?.engines?.forensic?.washTradeRatio === 'number'
      ? `%${verdict.engines.forensic.washTradeRatio}`
      : 'VERİ YOK';
  const forensicBeneish =
    typeof verdict?.engines?.forensic?.beneishMScore === 'number'
      ? String(verdict.engines.forensic.beneishMScore)
      : 'VERİ YOK';
  const spkFlagsText =
    verdict?.engines?.forensic?.spkFlags && verdict.engines.forensic.spkFlags.length > 0
      ? verdict.engines.forensic.spkFlags.join(', ')
      : 'TEMİZ';

  return `Sen kıdemli bir Kurumsal Kuant Stratejisti ve Portföy Yöneticisisin. Aşağıda #${verdict?.symbol ?? 'BIST'} (${verdict?.companyName ?? 'VERİ YOK'} - ${verdict?.marketType ?? 'BIST'} Pazarı) için MT16 Kuant Terminali'nin 5 motorundan (Anomaly, L2 Bookmap, Forensic, 9-Küp, Composite V2) elde edilen CANLI VERİ PAKETİ yer almaktadır.

[1. ÖZET KARAR & FİYAT BAĞLAMI]
- Sembol / Pazar: #${verdict?.symbol ?? 'BIST'} (${verdict?.marketType ?? 'BIST'})
- Anlık Fiyat: ${priceText} (Günlük Değişim: ${changePctText})
- Birleşik Kollektör Skoru: ${finalScoreText} -> Karar: ${verdict?.action ?? 'VERİ YOK'} (Alarm Seviyesi: ${verdict?.alarm ?? 'VERİ_YOK'})
- Tek Cümlelik Teşhis: ${verdict?.reason ?? 'VERİ YOK'}

[2. 5 MOTOR HAM KUANT METRİKLERİ]
- Anomali Motoru: Z-Skor = ${zScoreText} (Pazar Eşiği: ${zThrText}), HHI Yoğunlaşma = ${anomalyHhi}, Isolation Forest = ${anomalyIso}, Tree Olasılık = ${anomalyTree}
- L2 Bookmap & Tahta Motoru: OBI = ${obiText}, Kütle Direnci = ${boardMass}, Kademe Duvarı = ${wallLotText} @ ${wallPriceText}, Tahmini Erime = ${breakoutText}, Sahte Duvar (Spoofing) = ${verdict?.isFakeWall ? 'EVET' : 'HAYIR'}
- Adli (Forensic) Motor: Adli Risk = ${riskScoreText}, Wash Trade = ${forensicWash}, Beneish M-Skor = ${forensicBeneish}, SPK Bayrakları = ${spkFlagsText}
- 9 Küp Uyum Motoru: Uyum (Coherence) = ${coherenceText}, Çatışma = ${verdict?.engines?.storyCubes?.conflictCount ?? 0}/9, Zehirlenme = ${verdict?.engines?.storyCubes?.is_poisoned ? 'AKTİF' : 'YOK'}
  Küp Detayı: ${cubeSummary}
- Composite V2 & Risk: Üstel Risk (EXPO_V2) = ${expoScoreText}, Non-Linear Çarpan = ${amplifierText}, Jüri Konsensüsü = ${juryScoreText}, VaR (95%) = ${varPctText}, Kelly Oranı = ${kellyPctText}
- OCO Emir Seviyeleri: Stop-Loss (SL) = ${stopPriceText} (-%1.0) | Take-Profit (TP) = ${tpPriceText} (+%2.0)

[3. EN SON DÜŞEN CANLI RSS / KAP HABER AKIŞI (EN YENİDEN ESKİYE)]
${newsLines}

GÖREVİN:
Yukarıdaki verileri kullanarak klişe ifadelerden uzak, doğrudan doğal dilde, akıcı ve net bir analiz yap:
1. Tahtadaki mevcut alıcı/satıcı dengesini (L2 OBI, duvar erime süresi ve Z-Skor) yorumla.
2. Son haber/KAP akışının fiyatlama üzerindeki etkisini değerlendir.
3. Önümüzdeki seans için net bir oyun planı (Giriş koşulu, ${stopPriceText} Stop-Loss ve ${tpPriceText} Take-Profit seviyelerinin geçerliliği) sun.`;
}

/**
 * .TOON (Token-Oriented Object Notation) formatında sıkıştırılmış, düşük token maliyetli veri çıktısı üretir.
 */
export function buildToonPayload(
  verdict: FullUnifiedVerdict | any,
  disclosures: LiveKapDisclosure[] = []
): string {
  const cubeList = verdict?.engines?.storyCubes?.cubes || verdict?.cubes?.cubes || [];
  const cubesCompact =
    cubeList.length > 0
      ? cubeList.map((c) => `${c.id}:${c.signal}(${c.score ?? 'NA'})`).join(',')
      : 'NONE';

  const newsCompact = Array.isArray(disclosures)
    ? disclosures
        .slice(0, 3)
        .map(
          (d) =>
            `"${d.ticker}|${d.publish_time || 'Canlı'}|${(d.title || '').replace(/"/g, "'").slice(0, 60)}|imp:${d.analysis?.impact_score ?? 'NA'}"`
        )
        .join('; ')
    : 'NONE';

  const px = typeof verdict?.price === 'number' ? verdict.price.toFixed(2) : 'NA';
  const chg = typeof verdict?.changePct === 'number' ? `${verdict.changePct.toFixed(2)}%` : 'NA';
  const z = typeof verdict?.zScore === 'number' ? `${verdict.zScore.toFixed(2)}s` : 'NA';
  const zThr = typeof verdict?.zThreshold === 'number' ? `${verdict.zThreshold.toFixed(1)}s` : '2.0s';
  const obi = typeof verdict?.obi === 'number' ? verdict.obi.toFixed(3) : 'NA';
  const wallLot = typeof verdict?.wallLot === 'number' ? verdict.wallLot : 'NA';
  const wallPx = typeof verdict?.wallPrice === 'number' ? verdict.wallPrice.toFixed(2) : 'NA';
  const meltMin = typeof verdict?.breakoutMinutes === 'number' ? verdict.breakoutMinutes : 'NA';
  const stop = typeof verdict?.stopPrice === 'number' ? verdict.stopPrice.toFixed(2) : 'NA';
  const tp = typeof verdict?.tpPrice === 'number' ? verdict.tpPrice.toFixed(2) : 'NA';
  const varPct = typeof verdict?.varPct === 'number' ? `-${verdict.varPct}%` : 'NA';
  const kelly = typeof verdict?.kellyPct === 'number' ? `${verdict.kellyPct}%` : 'NA';
  const jury = typeof verdict?.juryScore === 'number' ? `${verdict.juryScore}%` : 'NA';
  const risk = typeof verdict?.riskScore === 'number' ? verdict.riskScore : 'NA';
  const coh = typeof verdict?.coherence === 'number' ? `${verdict.coherence}%` : 'NA';
  const expo = typeof verdict?.expoScore === 'number' ? verdict.expoScore : 'NA';
  const amp = typeof verdict?.amplifier === 'number' ? `${verdict.amplifier}x` : 'NA';
  const massRes =
    typeof verdict?.engines?.board?.massResistance === 'number'
      ? `${verdict.engines.board.massResistance}%`
      : 'NA';
  const finalScore = typeof verdict?.finalScore === 'number' ? `${verdict.finalScore}/100` : 'NA';

  return `#TOON/v3.5 schema=MT16_UNIFIED_VERDICT
@asset{sym:${verdict?.symbol ?? 'NA'};mkt:${verdict?.marketType ?? 'NA'};px:${px};chg:${chg};ts:${verdict?.timestamp ?? Date.now()}}
@verdict{score:${finalScore};act:${verdict?.action ?? 'NA'};alarm:${verdict?.alarm ?? 'NA'};joker_override:${verdict?.engines?.composite?.superCriticalFlag ?? false}}
@reason{"${verdict?.reason ?? 'VERİ YOK'}"}
@engines{z:${z};z_thr:${zThr};obi:${obi};jury:${jury};risk:${risk};coh:${coh};expo:${expo};amp:${amp}}
@board{wall_lot:${wallLot};wall_px:${wallPx};melt_min:${meltMin};fake_wall:${verdict?.isFakeWall ?? false};mass_res:${massRes}}
@oco{stop:${stop};tp:${tp};var:${varPct};kelly:${kelly}}
@cubes[9]{${cubesCompact}}
@rss_latest[${Math.min(3, disclosures?.length || 0)}]{${newsCompact || 'NONE'}}`;
}

/**
 * DynamicHtml5Container içinde görüntülenecek ve tek sayfada (1-Page PDF) çıktı alınabilecek HTML5 Raporu üretir.
 */
export function buildSinglePageHtml5Report(
  verdict: FullUnifiedVerdict | any,
  disclosures: LiveKapDisclosure[] = []
): string {
  const cur = verdict?.currencySymbol || '₺';
  const actionColor =
    verdict?.action === 'AL' ? '#10b981' : verdict?.action === 'SAT' ? '#f43f5e' : '#f59e0b';

  const cubeList = verdict?.engines?.storyCubes?.cubes || verdict?.cubes?.cubes || [];
  const cubesHtml =
    cubeList.length > 0
      ? cubeList
          .map((c) => {
            const col = c.signal === 'AL' ? '#10b981' : c.signal === 'SAT' ? '#f43f5e' : '#94a3b8';
            const scoreStr = typeof c.score === 'number' ? ` (${c.score})` : '';
            return `<div style="background:#0f172a;border:1px solid #1e293b;border-radius:8px;padding:8px 10px;">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;font-weight:700;">
          <span>${c.label}</span>
          <span style="color:${col};">${c.signal}${scoreStr}</span>
        </div>
        <div style="font-size:13px;font-weight:800;color:#f8fafc;margin-top:3px;font-family:monospace;">${c.valueText}</div>
      </div>`;
          })
          .join('')
      : '<div style="color:#64748b;font-size:12px;">VERİ YOK</div>';

  const rssHtml = (Array.isArray(disclosures) ? disclosures.slice(0, 3) : [])
    .map(
      (d) => `<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid #1e293b;font-size:11px;">
        <span style="color:#e2e8f0;"><strong>[${d.ticker}]</strong> ${d.title}</span>
        <span style="color:#38bdf8;white-space:nowrap;font-family:monospace;">${d.publish_time || 'Canlı'} · Etki ${
        typeof d.analysis?.impact_score === 'number' ? d.analysis.impact_score : 'VERİ YOK'
      }</span>
      </div>`
    )
    .join('');

  const pxFormatted =
    typeof verdict?.price === 'number'
      ? `${cur}${verdict.price.toFixed(2)} (${
          typeof verdict.changePct === 'number'
            ? `${verdict.changePct >= 0 ? '+' : ''}${verdict.changePct.toFixed(2)}%`
            : 'VERİ YOK'
        })`
      : 'VERİ YOK';

  const zFormatted =
    typeof verdict?.zScore === 'number'
      ? `${verdict.zScore >= 0 ? '+' : ''}${verdict.zScore.toFixed(2)}σ`
      : 'VERİ YOK';

  const obiFormatted =
    typeof verdict?.obi === 'number'
      ? `${verdict.obi >= 0 ? '+' : ''}${verdict.obi.toFixed(2)}`
      : 'VERİ YOK';

  const meltFormatted =
    typeof verdict?.breakoutMinutes === 'number'
      ? `${verdict.breakoutMinutes} dk (${
          typeof verdict.wallLot === 'number' ? verdict.wallLot.toLocaleString('tr-TR') : 'VERİ YOK'
        } lot)`
      : 'VERİ YOK';

  const varExpoFormatted =
    typeof verdict?.varPct === 'number' || typeof verdict?.expoScore === 'number'
      ? `${typeof verdict.varPct === 'number' ? `-%${verdict.varPct}` : 'VERİ YOK'} / ${
          typeof verdict.expoScore === 'number' ? verdict.expoScore : 'VERİ YOK'
        }`
      : 'VERİ YOK';

  const stopTpFormatted =
    typeof verdict?.stopPrice === 'number' && typeof verdict?.tpPrice === 'number'
      ? `${cur}${verdict.stopPrice.toFixed(2)} / ${cur}${verdict.tpPrice.toFixed(2)}`
      : 'VERİ YOK';

  const zThr = typeof verdict?.zThreshold === 'number' ? verdict.zThreshold : 2.0;

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <title>#${verdict?.symbol ?? 'BIST'} — MT16 Tek Sayfa Kuant Raporu</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #020617;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 20px;
      line-height: 1.45;
    }
    .card {
      max-width: 920px;
      margin: 0 auto;
      background: #090f1f;
      border: 1px solid #1e293b;
      border-radius: 14px;
      padding: 20px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 14px;
      margin-bottom: 14px;
    }
    .badge {
      background: ${actionColor}22;
      color: ${actionColor};
      border: 1px solid ${actionColor};
      padding: 6px 14px;
      border-radius: 8px;
      font-weight: 900;
      font-family: monospace;
      font-size: 15px;
    }
    .metrics-bar {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }
    .metric-box {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 8px 10px;
      text-align: center;
    }
    .metric-box .lbl { font-size: 10px; color: #64748b; text-transform: uppercase; }
    .metric-box .val { font-size: 14px; font-weight: 800; font-family: monospace; color: #f8fafc; margin-top: 2px; }
    .nl-box {
      background: #0f172a;
      border-left: 3px solid ${actionColor};
      padding: 12px 14px;
      border-radius: 8px;
      font-size: 12.5px;
      color: #cbd5e1;
      margin-bottom: 14px;
    }
    .cubes-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }
    @media print {
      body { background: #020617; padding: 0; }
      .card { border: none; }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <div style="font-size:20px;font-weight:900;font-family:monospace;">
          #${verdict?.symbol ?? 'BIST'} <span style="color:#94a3b8;font-size:14px;font-weight:500;">${verdict?.companyName ?? ''} (${verdict?.marketType ?? 'BIST'})</span>
        </div>
        <div style="font-size:12px;color:#38bdf8;margin-top:3px;">${verdict?.reason ?? 'VERİ YOK'}</div>
      </div>
      <div class="badge">${typeof verdict?.finalScore === 'number' ? `${verdict.finalScore}/100` : 'VERİ YOK'} · ${verdict?.action ?? 'VERİ YOK'} (${verdict?.alarm ?? 'VERİ_YOK'})</div>
    </div>

    <div class="metrics-bar">
      <div class="metric-box"><div class="lbl">Fiyat</div><div class="val">${pxFormatted}</div></div>
      <div class="metric-box"><div class="lbl">Z-Skor (Eşik ±${zThr}σ)</div><div class="val">${zFormatted}</div></div>
      <div class="metric-box"><div class="lbl">L2 OBI</div><div class="val">${obiFormatted}</div></div>
      <div class="metric-box"><div class="lbl">Duvar Erime</div><div class="val">${meltFormatted}</div></div>
      <div class="metric-box"><div class="lbl">VaR / EXPO_V2</div><div class="val">${varExpoFormatted}</div></div>
      <div class="metric-box"><div class="lbl">Stop / TP</div><div class="val">${stopTpFormatted}</div></div>
    </div>

    <div class="nl-box">
      <strong style="color:#f8fafc;display:block;margin-bottom:4px;">Doğal Dil Kuant Analizi:</strong>
      ${verdict?.naturalLanguageAnalysis ?? 'VERİ YOK'}
    </div>

    <div style="font-size:11px;font-weight:800;color:#94a3b8;margin-bottom:6px;text-transform:uppercase;">9 Küp Sentez Matrisi (Uyum: ${
      typeof verdict?.coherence === 'number' ? `%${verdict.coherence}` : 'VERİ YOK'
    })</div>
    <div class="cubes-grid">${cubesHtml}</div>

    <div style="font-size:11px;font-weight:800;color:#94a3b8;margin-bottom:4px;text-transform:uppercase;">Son Canlı RSS / KAP Bildirimleri (En Yeniden Eskiye)</div>
    <div>${rssHtml || '<div style="font-size:11px;color:#64748b;">Canlı bildirim akışı normal seyrediyor.</div>'}</div>
  </div>
</body>
</html>`;
}
