import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts';

interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface Indicator {
  time: string;
  value: number;
}

export function InteractiveChart({ symbol = 'THYAO' }: { symbol?: string }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [rsi, setRsi] = useState<Indicator[]>([]);
  const [macd, setMacd] = useState<Indicator[]>([]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/indicators/${symbol}`)
      .then(r => r.json())
      .then(data => {
        if (data.success === false) {
          setError(data.error || 'VERİ YOK');
          return;
        }
        setCandles(data.candles || []);
        setRsi(data.rsi || []);
        setMacd(data.macd || []);
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [symbol]);

  useEffect(() => {
    if (!chartRef.current || candles.length === 0) return;

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 400,
      layout: { background: { color: '#0f172a' }, textColor: '#94a3b8' },
      grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
      timeScale: { timeVisible: true, secondsVisible: false },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981', downColor: '#ef4444',
      borderUpColor: '#10b981', borderDownColor: '#ef4444',
      wickUpColor: '#10b981', wickDownColor: '#ef4444',
    });
    candleSeries.setData(candles);

    // RSI alt paneli
    if (rsi.length > 0) {
      const rsiSeries = chart.addSeries(LineSeries, {
        color: '#f59e0b', lineWidth: 1,
        priceScaleId: 'rsi',
      });
      rsiSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
      rsiSeries.setData(rsi);
    }

    // MACD alt paneli
    if (macd.length > 0) {
      const macdSeries = chart.addSeries(LineSeries, {
        color: '#3b82f6', lineWidth: 1,
        priceScaleId: 'macd',
      });
      macdSeries.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
      macdSeries.setData(macd);
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartRef.current) {
        chart.applyOptions({ width: chartRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [candles, rsi, macd]);

  if (loading) return <div className="text-slate-400 p-4">Yükleniyor...</div>;
  if (error) return <div className="text-red-400 p-4">VERİ YOK: {error}</div>;

  return <div ref={chartRef} className="w-full" />;
}

export default InteractiveChart;
