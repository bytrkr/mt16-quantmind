// src/components/LightweightOrderBookChart.tsx
/**
 * MT16 Kuant Terminali - Lightweight Charts (Canvas Renderer)
 * -----------------------------------------------------------
 * GitDiagram Mimarisi:
 * - Façade: `createChart` (create-chart.ts)
 * - Data Pipeline: `setData` (series-api.ts -> data-layer.ts)
 * - Rendering: Canvas (canvas-renderers)
 *
 * QODI ANAYASA v6.1: 0 fallback, 0 Math.random, 0 throw, 0 ??
 */

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi } from 'lightweight-charts';

interface LevelItem {
  price: number;
  qty: number;
  total: number;
}

interface LightweightOrderBookChartProps {
  bids: LevelItem[];
  asks: LevelItem[];
}

export const LightweightOrderBookChart: React.FC<LightweightOrderBookChartProps> = ({
  bids = [],
  asks = [],
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 1. FAÇADE: Chart Creation (create-chart.ts)
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#020617' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
    });

    const series = (chart as any).addHistogramSeries({
      color: '#26a69a',
    });

    // 2. DATA LAYER: Ingestion Pipeline
    const data = [
      ...bids.map(b => ({ time: b.price.toString(), value: b.qty, color: '#10b981' })),
      ...asks.map(a => ({ time: a.price.toString(), value: a.qty, color: '#f43f5e' })),
    ].sort((a, b) => parseFloat(a.time) - parseFloat(b.time));

    series.setData(data);

    chartRef.current = chart;

    return () => {
      chart.remove();
    };
  }, [bids, asks]);

  return <div ref={chartContainerRef} className="w-full h-[300px]" />;
};
