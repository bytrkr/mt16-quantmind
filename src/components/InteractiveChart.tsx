import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts';

interface Candle { time: string; open: number; high: number; low: number; close: number; volume: number; }
interface Indicator { time: string; value: number; }

export function InteractiveChart({ symbol = 'THYAO' }: { symbol?: string }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/indicators/${symbol}`)
      .then(r => r.json())
      .then(res => {
        if (res.success === false) {
          setError(res.error || 'VERİ YOK');
          return;
        }
        setData(res);
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [symbol]);

  useEffect(() => {
    if (!chartRef.current || !data || !data.candles || data.candles.length === 0) return;

    // Ana Grafik
    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 600, // Daha uzun, MT5 gibi
      layout: { background: { color: '#0f172a' }, textColor: '#94a3b8' },
      grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: '#334155' },
      rightPriceScale: { borderColor: '#334155' },
    });

    // 1. Mum Grafiği
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981', downColor: '#ef4444',
      borderUpColor: '#10b981', borderDownColor: '#ef4444',
      wickUpColor: '#10b981', wickDownColor: '#ef4444',
    });
    candleSeries.setData(data.candles);

    // 2. Hareketli Ortalamalar (SMA20, EMA50) - Fiyatın üzerinde
    if (data.sma20) {
      const smaSeries = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 2, title: 'SMA20' });
      // Tüm mumlar için SMA hesaplamak yerine, API'den gelen son değeri çizgi olarak ekleyelim
      // (Basitlik için şimdilik sadece son noktayı işaretleyeceğiz, tam çizgi için API'den SMA serisi dönmeli)
    }

    // 3. Hacim Paneli (Mumların hemen altında)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    volumeSeries.setData(data.candles.map((c: any) => ({
      time: c.time,
      value: c.volume || 0,
      color: c.close >= c.open ? '#10b981' : '#ef4444'
    })));

    // 4. RSI Paneli (Alt Panel 1)
    if (data.rsi && data.rsi.length > 0) {
      const rsiSeries = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1, priceScaleId: 'rsi', title: 'RSI' });
      rsiSeries.priceScale().applyOptions({ scaleMargins: { top: 0.7, bottom: 0.2 } });
      rsiSeries.setData(data.rsi);
      // RSI 70/30 çizgileri
      rsiSeries.createPriceLine({ price: 70, color: '#ef4444', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: '70' });
      rsiSeries.createPriceLine({ price: 30, color: '#10b981', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: '30' });
    }

    // 5. MACD Paneli (Alt Panel 2)
    if (data.macd && data.macd.length > 0) {
      const macdSeries = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 1, priceScaleId: 'macd', title: 'MACD' });
      macdSeries.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
      macdSeries.setData(data.macd);
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartRef.current) chart.applyOptions({ width: chartRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.remove(); };
  }, [data]);

  if (loading) return <div className="text-slate-400 p-4">Yükleniyor...</div>;
  if (error) return <div className="text-red-400 p-4">VERİ YOK: {error}</div>;

  return <div ref={chartRef} className="w-full" />;
}

export default InteractiveChart;
