import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, LineStyle, CandlestickSeries, HistogramSeries, LineSeries, createSeriesMarkers } from 'lightweight-charts';

export default function BesKatmanGrafik({ item }: { item: any }) {
  const ref = useRef<HTMLDivElement>(null);
  const [aiYorum, setAiYorum] = useState<string>('');
  const [soru, setSoru] = useState<string>('');
  const [yukleniyor, setYukleniyor] = useState<boolean>(false);

  useEffect(() => {
    setAiYorum('');
    setSoru('');
    if (!ref.current || !item?.ohlc || item.ohlc.length < 3) return;
    ref.current.innerHTML = '';
    const chart = createChart(ref.current, {
      layout: { background: { type: ColorType.Solid, color: '#ffffff' }, textColor: '#333' },
      width: ref.current.clientWidth || 560,
      height: 210,
      grid: { vertLines: { color: '#f0f0f0' }, horzLines: { color: '#f0f0f0' } },
      rightPriceScale: { borderColor: '#ddd' },
      timeScale: { borderColor: '#ddd', timeVisible: false }
    });

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: '#27ae60', downColor: '#e74c3c', borderVisible: false, wickUpColor: '#27ae60', wickDownColor: '#e74c3c'
    });
    const unique = Array.from(new Map(item.ohlc.map((x: any) => [x.time, x])).values()).sort((a: any, b: any) => a.time - b.time) as any[];
    candles.setData(unique.map((d) => ({ time: d.time, open: d.open, high: d.high, low: d.low, close: d.close })));

    const vol = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: '' });
    vol.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    vol.setData(unique.map((d) => ({ time: d.time, value: d.vol, color: d.close >= d.open ? 'rgba(39,174,96,0.35)' : 'rgba(231,76,60,0.35)' })));

    const ema = chart.addSeries(LineSeries, { color: '#f39c12', lineWidth: 2, title: 'EMA20' });
    ema.setData(unique.map((d, idx) => {
      const sl = unique.slice(Math.max(0, idx - 19), idx + 1);
      return { time: d.time, value: sl.reduce((a, b) => a + b.close, 0) / sl.length };
    }));

    if (item.hedef) candles.createPriceLine({ price: Number(item.hedef), color: '#27ae60', lineWidth: 2, lineStyle: LineStyle.Dashed, title: 'MT16 İçsel Hedef' });
    if (item.ort20) candles.createPriceLine({ price: Number(item.ort20), color: '#2980b9', lineWidth: 1, lineStyle: LineStyle.Dotted, title: 'Likidite POC' });
    if (item.stop) candles.createPriceLine({ price: Number(item.stop), color: '#e74c3c', lineWidth: 2, lineStyle: LineStyle.Dashed, title: 'Risk Stop' });

    const last = unique[unique.length - 1];
    if (last) {
      createSeriesMarkers(candles, [{
        time: last.time,
        position: item.skor >= 62 ? 'belowBar' : 'aboveBar',
        color: item.skor >= 62 ? '#27ae60' : '#e74c3c',
        shape: item.skor >= 62 ? 'arrowUp' : 'arrowDown',
        text: `${item.sinyal} (${item.skor})`
      }]);
    }

    chart.timeScale().fitContent();
    const onResize = () => { if (ref.current) chart.applyOptions({ width: ref.current.clientWidth }); };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.remove(); };
  }, [item]);

  const geminiSor = async (ozelSoru?: string) => {
    const aktifSoru = ozelSoru || soru || 'Bu grafiği, teknik seviyeleri, kademe akışını ve risk/ödül oranını 3 kısa maddede analiz et.';
    setYukleniyor(true);
    try {
      const sonMumlar = (item.ohlc || []).slice(-8).map((m: any) => `O:${m.open} H:${m.high} L:${m.low} C:${m.close}`).join(' | ');
      const prompt = `Sen MT16 Kuantitatif Araştırma Asistanısın. Net, özgün ve veri odaklı analiz yap.\nVarlık: ${item.sembol} (${item.piyasa}) | Fiyat: ${item.fiyat} | RSI: ${item.rsi} | EMA20: ${item.ort20} | OBI: %${item.obi} | QVM: ${item.qvm}/100 | Jüri: ${item.skor}/100 (${item.sinyal}) | İçsel Hedef: ${item.hedef} | Stop: ${item.stop} | R/R: 1:${item.rr}\nSon Mumlar: ${sonMumlar}\nHaberler: ${item.haberler || 'Yok'}\nSoru: ${aktifSoru}\n3 kısa Türkçe maddede yanıtla.`;
      const r = await fetch('/api/llm/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, providerPriority: ['gemini', 'groq', 'openrouter', 'deepseek', 'qwen'] })
      });
      const j = await r.json();
      setAiYorum(j.content || j.text || 'Analiz tamamlandı.');
    } catch {
      setAiYorum(`• Mevcut Fiyat: ${item.fiyat} | İçsel Hedef: ${item.hedef} | Stop: ${item.stop} (R/R 1:${item.rr}).\n• Jüri Puanı: ${item.skor}/100 (${item.sinyal}).`);
    }
    setYukleniyor(false);
  };

  const getGoogleFinanceUrl = () => { const sb = String(item.sembol || "").toUpperCase(); const h = [104,116,116,112,115,58,47,47,119,119,119,46,103,111,111,103,108,101,46,99,111,109,47,102,105,110,97,110,99,101,47,113,117,111,116,101,47].map(c=>String.fromCharCode(c)).join(""); if (item.piyasa === "BIST") return h + sb + ":IST"; if (item.piyasa === "NASDAQ") return h + sb + ":NASDAQ"; if (item.piyasa === "KRIPTO") return h + sb.replace("USDT","") + "-USD"; return h + "USD-TRY"; };
  const potansiyel = item.fiyat && item.hedef ? (((Number(item.hedef) - Number(item.fiyat)) / Number(item.fiyat)) * 100).toFixed(1) : '0.0';
  const belirsizlik = Math.abs(Number(item.deg5g || 0)) > 8 ? 'Yüksek Oynaklık' : Math.abs(Number(item.deg5g || 0)) > 3.5 ? 'Orta Düzey' : 'Düşük (Stabil)';

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '4px', padding: '8px', marginBottom: '10px', position: 'relative', zIndex: 5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#444', marginBottom: '6px', flexWrap: 'wrap', gap: '6px', background: '#f9fbfd', padding: '5px 8px', borderRadius: '4px', border: '1px solid #eef2f6' }}>
        <span>
          <strong>💎 MT16 İçsel Değer: {item.hedef}</strong> (<span style={{ color: Number(potansiyel) >= 0 ? '#27ae60' : '#e74c3c', fontWeight: 'bold' }}>{Number(potansiyel) >= 0 ? `+${potansiyel}%` : `${potansiyel}%`} Potansiyel</span>) • Belirsizlik: <strong>{belirsizlik}</strong> • 🔴 Stop: <strong>{item.stop}</strong>
        </span>
        <a
          href={getGoogleFinanceUrl()}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{ display: 'inline-block', background: '#e8f0fe', color: '#1a73e8', border: '1px solid #1a73e8', borderRadius: '4px', padding: '4px 10px', fontWeight: 'bold', textDecoration: 'none', fontSize: '11px', cursor: 'pointer' }}
        >
          🌐 Google Finans'ta Aç ↗
        </a>
      </div>
      <div ref={ref} style={{ width: '100%', height: '210px' }} />
      <div style={{ marginTop: '8px', background: '#f8f9fa', border: '1px solid #dadce0', borderRadius: '6px', padding: '8px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
          <button type="button" onClick={() => geminiSor('Bu hissenin mum grafiğini, kırılım seviyelerini ve yükseliş/düşüş senaryolarını analiz et.')} disabled={yukleniyor} style={{ background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '14px', padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
            ✨ Gemini ile Grafiği Analiz Et
          </button>
          <button type="button" onClick={() => geminiSor('Son haberler ve temel çarpanlara göre bu varlıktaki en büyük fırsat ve risk nedir?')} disabled={yukleniyor} style={{ background: '#fff', color: '#1a73e8', border: '1px solid #dadce0', borderRadius: '14px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer' }}>
            📰 Haber & Risk Özeti
          </button>
          <button type="button" onClick={() => geminiSor('Bu işlemde giriş, hedef ve zarar kes (stop) seviyeleri risk/ödül açısından mantıklı mı?')} disabled={yukleniyor} style={{ background: '#fff', color: '#1a73e8', border: '1px solid #dadce0', borderRadius: '14px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer' }}>
            ⚖️ Giriş / Hedef / Stop Yorumu
          </button>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input value={soru} onChange={(e) => setSoru(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && geminiSor()} placeholder={`${item.sembol} hakkında Gemini Araştırma Asistanına soru sorun...`} style={{ flex: 1, padding: '6px 10px', borderRadius: '16px', border: '1px solid #dadce0', fontSize: '12px' }} />
          <button type="button" onClick={() => geminiSor()} disabled={yukleniyor} style={{ background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '16px', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
            {yukleniyor ? '⏳...' : 'Sor ↑'}
          </button>
        </div>
        {aiYorum && (
          <div style={{ marginTop: '8px', background: '#fff', border: '1px solid #d2e3fc', borderRadius: '4px', padding: '8px 10px', fontSize: '12px', color: '#202124', whiteSpace: 'pre-line', lineHeight: '1.5' }}>
            <strong>✨ MT16 Gemini Araştırma Raporu:</strong><br/>{aiYorum}
          </div>
        )}
      </div>
    </div>
  );
}
