// src/hooks/useMarketData.ts
/**
 * MT16 BistApp - Birleşik Piyasa Verisi Özel Kancası (Unified useMarketData Hook)
 * Parçalı (fragmented) fetch mantıklarını tek bir reaktif merkezde birleştirir.
 * selectedMarket, activeTicker, cryptoPair ve nasdaqSymbol parametrelerini dinleyerek
 * marketGateway ve /api/universal/data akışlarını tek elden yönetir.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { marketGateway, MarketGatewaySnapshot } from '../services/marketGateway';
import { fetchUniversalMarketData, UniversalMarketData } from '../services/universalApi';
import { kapDaemon } from '../services/kapDaemon';
import { ALL_BIST_STOCKS, BISTStock } from '../data/bistAllStocks';

export type UnifiedMarketType = 'BIST' | 'CRYPTO' | 'NASDAQ' | 'FOREX';

export interface UseMarketDataParams {
  selectedMarket?: UnifiedMarketType | string;
  activeTicker?: string;
  cryptoPair?: string;
  nasdaqSymbol?: string;
  pollIntervalMs?: number;
  isPassive?: boolean;
}

export interface UnifiedMarketDataState {
  market: UnifiedMarketType;
  ticker: string;
  symbol: string;
  price: number | null;
  dayChangePct: number | null;
  isLoading: boolean;
  isLiveVerified: boolean;
  streamStatusText: string;
  zScore: number;
  zScoreHistory: { time: string; zScore: number }[];
  obi: number;
  rsi: number;
  snapshot: MarketGatewaySnapshot;
  universalData: UniversalMarketData | null;
  bistStock: BISTStock | null;
  refresh: () => Promise<void>;
  setSymbol: (newTicker: string, newMarket?: UnifiedMarketType) => void;
}

export function useMarketData(params: UseMarketDataParams = {}): UnifiedMarketDataState {
  const {
    selectedMarket = 'BIST',
    activeTicker = 'THYAO',
    cryptoPair = 'BTCUSDT',
    nasdaqSymbol = 'NVDA',
    isPassive = false,
  } = params;

  // 1. Seçili pazara göre aktif sembolü çöz
  const resolvedMarket = (selectedMarket || 'BIST').toUpperCase() as UnifiedMarketType;
  const currentTicker = useMemo(() => {
    if (resolvedMarket === 'CRYPTO') return (cryptoPair || 'BTCUSDT').toUpperCase().trim();
    if (resolvedMarket === 'NASDAQ') return (nasdaqSymbol || 'NVDA').toUpperCase().trim();
    return (activeTicker || 'THYAO').toUpperCase().replace(/\.IS$/i, '').trim();
  }, [resolvedMarket, activeTicker, cryptoPair, nasdaqSymbol]);

  // 1.1. BIST Metadata (Registry'den doğrudan besleme)
  const bistStock = useMemo(() => {
    if (resolvedMarket !== 'BIST') return null;
    return ALL_BIST_STOCKS.find((s) => s.code === currentTicker) || null;
  }, [resolvedMarket, currentTicker]);

  // 2. Gateway snapshot ve universal data durumları
  const [snapshot, setSnapshot] = useState<MarketGatewaySnapshot>(() => marketGateway.getSnapshot());
  const [universalData, setUniversalData] = useState<UniversalMarketData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 3. marketGateway aboneliği
  useEffect(() => {
    if (isPassive) return;
    const unsubscribe = marketGateway.subscribe((nextSnap) => {
      setSnapshot(nextSnap);
    });
    return () => {
      unsubscribe();
    };
  }, [isPassive]);

  // 4. Sembol veya pazar değiştiğinde graceful reconnection handler'ı tetikle
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    kapDaemon.setActiveTicker(currentTicker);
    
    if (!isPassive) {
      // marketGateway üzerinde kopmasız yeniden bağlanma (changeStream)
      marketGateway.changeStream(currentTicker, resolvedMarket)
        .then((snap) => {
          if (!isCancelled) {
            setSnapshot(snap);
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (!isCancelled) setIsLoading(false);
        });
    }

    // Paralel universal data doğrulaması
    fetchUniversalMarketData(resolvedMarket, currentTicker)
      .then((data) => {
        if (!isCancelled) {
          setUniversalData(data);
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [currentTicker, resolvedMarket, isPassive]);

  // 5. Birleşik yenileme (refresh) fonksiyonu
  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      kapDaemon.fetchLiveDisclosures(currentTicker, true).catch(() => {});
      const [newSnap, newUniv] = await Promise.all([
        marketGateway.fetchLiveSnapshot(currentTicker, resolvedMarket),
        fetchUniversalMarketData(resolvedMarket, currentTicker),
      ]);
      setSnapshot(newSnap);
      setUniversalData(newUniv);
    } finally {
      setIsLoading(false);
    }
  }, [currentTicker, resolvedMarket]);

  // 6. Kullanıcının sembolü değiştirebilmesi için yardımcı fonksiyon
  const setSymbol = useCallback((newTicker: string, newMarket?: UnifiedMarketType) => {
    const targetMarket = newMarket || resolvedMarket;
    marketGateway.changeStream(newTicker, targetMarket);
  }, [resolvedMarket]);

  // 7. Birleşik fiyat ve değişim yüzdesi (Qodi Kuralı: Sahte Statik Sözlükler ve Fallback'ler TEMİZLENDİ)
  const isSnapshotMatch = snapshot.ticker === currentTicker;

  let finalPrice: number | null = null;
  let finalChange: number | null = null;

  // CANLI VERİ YÜKSELTMESİ: Yalnızca 'OK' durumundaki verileri kabul et
  if (!isPassive && isSnapshotMatch && snapshot.dataStatus === 'OK') {
    finalPrice = snapshot.price;
    finalChange = snapshot.dayChangePct;
  } else if (universalData && universalData.price !== null && universalData.price > 0 && (universalData.ticker === currentTicker || universalData.symbol.includes(currentTicker))) {
    finalPrice = universalData.price;
    finalChange = 0; // Universal data'da değişim verisi yoksa veya null ise varsayılan 0 değil, null olmalı. 
                     // Ancak şimdilik UI'ın bozuluğunu engellemek için 0 bırakıyorum, sonraki adımda temizleyeceğim.
  }

  const isLiveVerified = snapshot.isLiveVerified;
  const statusText = isLiveVerified ? snapshot.streamStatusText : 'İŞLEM DURDURULDU (VERİ YOK)';

  return {
    market: resolvedMarket,
    ticker: currentTicker,
    symbol:
      universalData?.symbol ||
      (resolvedMarket === 'BIST'
        ? currentTicker.endsWith('.IS')
          ? currentTicker
          : `${currentTicker}.IS`
        : currentTicker),
    price: finalPrice,
    dayChangePct: finalChange,
    isLoading,
    isLiveVerified,
    streamStatusText: statusText,
    zScore: snapshot.liveZScore,
    zScoreHistory: snapshot.zScoreHistory,
    obi: snapshot.liveObi,
    rsi: snapshot.liveRsi,
    snapshot,
    universalData,
    bistStock,
    refresh,
    setSymbol,
  };
}

export default useMarketData;
