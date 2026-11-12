export interface BISTIndexCategory {
  code: string;
  name: string;
  type: 'MARKET' | 'SECTOR' | 'CAP';
}

export interface BISTStockItem {
  symbol: string;
  name: string;
  sector: string;
  market?: 'Yıldız' | 'Ana' | 'Alt';
  code?: string;
  ticker?: string;
  marketCap?: number; // Piyasa Değeri (Milyar TL)
  pe?: number; // F/K
  peg?: number; // PEG
  price?: number; // Fiyat (TL)
  rate?: number; // Değişim %
  fairValue?: number; // Adil Değer
  fairValuePotentialPct?: number; // Adil Değer Potansiyeli %
  analystTarget?: number; // Analist Fiyat Hedefi
  targetPotentialPct?: number; // Hedef Potansiyeli %
  healthScore?: number; // Genel Sağlık Skoru (0-100)
  indices?: string[]; // ['XU030', 'XU100', 'XUTUM']
}

export const BIST_INDEXES: BISTIndexCategory[] = [
  { code: 'XUTUM', name: 'TÜMÜ', type: 'CAP' },
  { code: 'XU100', name: 'BIST 100', type: 'CAP' },
  { code: 'XU030', name: 'BIST 30', type: 'CAP' },
  { code: 'XYILD', name: 'YILDIZ PAZAR', type: 'MARKET' },
  { code: 'XANAP', name: 'ANA PAZAR', type: 'MARKET' }
];

export const BIST_FULL_REGISTRY: BISTStockItem[] = [
  { symbol: "KCAER.IS", code: "KCAER", name: "Kocaer Çelik", sector: "Metal", market: "Yıldız", indices: ["XU100", "XUTUM", "XYILD"], price: 48.50, rate: 2.45, marketCap: 32.1, healthScore: 80 },
  { symbol: "CWENE.IS", code: "CWENE", name: "CW Enerji", sector: "Enerji", market: "Ana", indices: ["XUTUM", "XANAP"], price: 285.20, rate: 1.25, marketCap: 45.4, healthScore: 76 },
  { symbol: "ASTOR.IS", code: "ASTOR", name: "Astor Enerji", sector: "Elektrik", market: "Yıldız", indices: ["XU030", "XU100", "XUTUM", "XYILD"], price: 92.45, rate: -2.15, marketCap: 115.2, healthScore: 72 },
  { symbol: "KONTR.IS", code: "KONTR", name: "Kontrolmatik", sector: "Teknoloji", market: "Yıldız", indices: ["XU100", "XUTUM", "XYILD"], price: 215.40, rate: 4.30, marketCap: 48.5, healthScore: 70 },
  { symbol: "MIATK.IS", code: "MIATK", name: "Mia Teknoloji", sector: "Teknoloji", market: "Yıldız", indices: ["XU100", "XUTUM", "XYILD"], price: 58.20, rate: 3.15, marketCap: 25.4, healthScore: 74 },
  { symbol: "SMRTG.IS", code: "SMRTG", name: "Smart Güneş", sector: "Enerji", market: "Ana", indices: ["XUTUM", "XANAP"], price: 62.15, rate: 1.85, marketCap: 24.5, healthScore: 73 },
  { symbol: "REEDR.IS", code: "REEDR", name: "Reeder Teknoloji", sector: "Teknoloji", market: "Yıldız", indices: ["XU100", "XUTUM", "XYILD"], price: 22.40, rate: -0.45, marketCap: 18.2, healthScore: 68 },
  { symbol: "ZOREN.IS", code: "ZOREN", name: "Zorlu Enerji", sector: "Enerji", market: "Yıldız", indices: ["XU100", "XUTUM", "XYILD"], price: 5.85, rate: 1.15, marketCap: 42.1, healthScore: 71 },
  { symbol: "SASA.IS", code: "SASA", name: "Sasa Polyester", sector: "Kimya", market: "Yıldız", indices: ["XU030", "XU100", "XUTUM", "XYILD"], price: 42.15, rate: -2.30, marketCap: 210.5, healthScore: 65 },
  { symbol: "HEKTS.IS", code: "HEKTS", name: "Hektaş", sector: "Kimya", market: "Yıldız", indices: ["XU030", "XU100", "XUTUM", "XYILD"], price: 24.15, rate: -3.40, marketCap: 52.4, healthScore: 62 },
  { symbol: "GUBRF.IS", code: "GUBRF", name: "Gübre Fabrikaları", sector: "Kimya", market: "Yıldız", indices: ["XU030", "XU100", "XUTUM", "XYILD"], price: 185.40, rate: -1.20, marketCap: 65.2, healthScore: 68 },
  { symbol: "OYAKC.IS", code: "OYAKC", name: "Oyak Çimento", sector: "Çimento", market: "Yıldız", indices: ["XU030", "XU100", "XUTUM", "XYILD"], price: 62.40, rate: 0.85, marketCap: 38.4, healthScore: 80 },
  { symbol: "AKCNS.IS", code: "AKCNS", name: "Akçansa", sector: "Çimento", market: "Yıldız", indices: ["XU100", "XUTUM", "XYILD"], price: 142.50, rate: 1.15, marketCap: 18.5, healthScore: 84 },
  { symbol: "CIMSA.IS", code: "CIMSA", name: "Çimsa", sector: "Çimento", market: "Yıldız", indices: ["XU100", "XUTUM", "XYILD"], price: 32.40, rate: -0.15, marketCap: 15.2, healthScore: 81 },
  { symbol: "VESTL.IS", code: "VESTL", name: "Vestel", sector: "Dayanıklı Tüketim", market: "Yıldız", indices: ["XU030", "XU100", "XUTUM", "XYILD"], price: 65.20, rate: 0.45, marketCap: 22.4, healthScore: 70 },
  { symbol: "ARCLK.IS", code: "ARCLK", name: "Arçelik", sector: "Dayanıklı Tüketim", market: "Yıldız", indices: ["XU030", "XU100", "XUTUM", "XYILD"], price: 162.40, rate: 0.25, marketCap: 95.8, healthScore: 78 },
  { symbol: "FROTO.IS", code: "FROTO", name: "Ford Otosan", sector: "Otomotiv", market: "Yıldız", indices: ["XU030", "XU100", "XUTUM", "XYILD"], price: 985.50, rate: 1.45, marketCap: 320.4, healthScore: 88 },
  { symbol: "TOASO.IS", code: "TOASO", name: "Tofaş", sector: "Otomotiv", market: "Yıldız", indices: ["XU030", "XU100", "XUTUM", "XYILD"], price: 242.50, rate: -0.85, marketCap: 145.2, healthScore: 85 },
  { symbol: "DOAS.IS", code: "DOAS", name: "Doğuş Otomotiv", sector: "Otomotiv", market: "Yıldız", indices: ["XU100", "XUTUM", "XYILD"], price: 245.20, rate: 1.15, marketCap: 54.2, healthScore: 84 },
  { symbol: "PGSUS.IS", code: "PGSUS", name: "Pegasus", sector: "Havacılık", market: "Yıldız", indices: ["XU030", "XU100", "XUTUM", "XYILD"], price: 845.20, rate: 3.15, marketCap: 88.5, healthScore: 84 },
  { symbol: "THYAO.IS", code: "THYAO", name: "Türk Hava Yolları", sector: "Havacılık", market: "Yıldız", indices: ["XU030", "XU100", "XUTUM", "XYILD"], price: 288.50, rate: 0.45, marketCap: 385.2, healthScore: 92 },
  { symbol: "TUPRS.IS", code: "TUPRS", name: "Tüpraş", sector: "Enerji", market: "Yıldız", indices: ["XU030", "XU100", "XUTUM", "XYILD"], price: 165.40, rate: -0.25, marketCap: 285.4, healthScore: 90 },
  { symbol: "EREGL.IS", code: "EREGL", name: "Ereğli Demir Çelik", sector: "Metal", market: "Yıldız", indices: ["XU030", "XU100", "XUTUM", "XYILD"], price: 48.50, rate: 1.25, marketCap: 154.2, healthScore: 82 },
  { symbol: "KRDMD.IS", code: "KRDMD", name: "Kardemir (D)", sector: "Metal", market: "Yıldız", indices: ["XU030", "XU100", "XUTUM", "XYILD"], price: 26.80, rate: 2.10, marketCap: 45.8, healthScore: 75 },
  { symbol: "ISDMR.IS", code: "ISDMR", name: "İskenderun Demir Çelik", sector: "Metal", market: "Yıldız", indices: ["XU100", "XUTUM", "XYILD"], price: 34.20, rate: -0.45, marketCap: 120.5, healthScore: 78 },
  { symbol: "MGROS.IS", code: "MGROS", name: "Migros", sector: "Perakende", market: "Yıldız", indices: ["XU100", "XUTUM", "XYILD"], price: 452.80, rate: 0.95, marketCap: 78.4, healthScore: 87 },
  { symbol: "BIMAS.IS", code: "BIMAS", name: "BİM Mağazalar", sector: "Perakende", market: "Yıldız", indices: ["XU030", "XU100", "XUTUM", "XYILD"], price: 462.50, rate: 2.15, marketCap: 245.2, healthScore: 89 },
  { symbol: "SOKM.IS", code: "SOKM", name: "Şok Marketler", sector: "Perakende", market: "Yıldız", indices: ["XU030", "XU100", "XUTUM", "XYILD"], price: 54.10, rate: -0.85, marketCap: 32.8, healthScore: 81 },
  { symbol: "AEFES.IS", code: "AEFES", name: "Anadolu Efes", sector: "Gıda", market: "Yıldız", indices: ["XU100", "XUTUM", "XYILD"], price: 185.20, rate: 0.45, marketCap: 110.2, healthScore: 82 },
  { symbol: "CCOLA.IS", code: "CCOLA", name: "Coca-Cola İçecek", sector: "Gıda", market: "Yıldız", indices: ["XU100", "XUTUM", "XYILD"], price: 585.40, rate: 1.25, marketCap: 148.5, healthScore: 89 },
  { symbol: "ULKER.IS", code: "ULKER", name: "Ülker Bisküvi", sector: "Gıda", market: "Yıldız", indices: ["XU100", "XUTUM", "XYILD"], price: 112.50, rate: -0.35, marketCap: 38.4, healthScore: 79 },
  { symbol: "TCELL.IS", code: "TCELL", name: "Turkcell", sector: "Telekom", market: "Yıldız", indices: ["XU030", "XU100", "XUTUM", "XYILD"], price: 82.50, rate: 0.85, marketCap: 180.4, healthScore: 85 },
  { symbol: "TTKOM.IS", code: "TTKOM", name: "Türk Telekom", sector: "Telekom", market: "Yıldız", indices: ["XU100", "XUTUM", "XYILD"], price: 38.40, rate: 0.15, marketCap: 135.2, healthScore: 81 },
  { symbol: "KCHOL.IS", code: "KCHOL", name: "Koç Holding", sector: "Holding", market: "Yıldız", indices: ["XU030", "XU100", "XUTUM", "XYILD"], price: 184.20, rate: 0.65, marketCap: 520.8, healthScore: 94 },
  { symbol: "SAHOL.IS", code: "SAHOL", name: "Sabancı Holding", sector: "Holding", market: "Yıldız", indices: ["XU030", "XU100", "XUTUM", "XYILD"], price: 88.40, rate: 0.85, marketCap: 195.2, healthScore: 91 },
  { symbol: "ALARK.IS", code: "ALARK", name: "Alarko Holding", sector: "Holding", market: "Yıldız", indices: ["XU030", "XU100", "XUTUM", "XYILD"], price: 112.40, rate: 1.20, marketCap: 42.5, healthScore: 85 },
  { symbol: "TKFEN.IS", code: "TKFEN", name: "Tekfen Holding", sector: "Holding", market: "Yıldız", indices: ["XU100", "XUTUM", "XYILD"], price: 42.15, rate: -0.15, marketCap: 15.4, healthScore: 74 },
  { symbol: "ENKAI.IS", code: "ENKAI", name: "Enka İnşaat", sector: "İnşaat", market: "Yıldız", indices: ["XU030", "XU100", "XUTUM", "XYILD"], price: 42.10, rate: -0.35, marketCap: 142.5, healthScore: 86 },
  { symbol: "GARAN.IS", code: "GARAN", name: "Garanti BBVA", sector: "Bankacılık", market: "Yıldız", indices: ["XU030", "XU100", "XUTUM", "XYILD"], price: 127.30, rate: 1.15, marketCap: 450.1, healthScore: 95 },
  { symbol: "AKBNK.IS", code: "AKBNK", name: "Akbank", sector: "Bankacılık", market: "Yıldız", indices: ["XU030", "XU100", "XUTUM", "XYILD"], price: 58.40, rate: -1.25, marketCap: 380.5, healthScore: 93 },
  { symbol: "ISCTR.IS", code: "ISCTR", name: "İş Bankası (C)", sector: "Bankacılık", market: "Yıldız", indices: ["XU030", "XU100", "XUTUM", "XYILD"], price: 12.85, rate: 0.45, marketCap: 310.5, healthScore: 94 },
  { symbol: "YKBNK.IS", code: "YKBNK", name: "Yapı Kredi", sector: "Bankacılık", market: "Yıldız", indices: ["XU030", "XU100", "XUTUM", "XYILD"], price: 28.40, rate: -0.15, marketCap: 210.2, healthScore: 92 },
  { symbol: "HALKB.IS", code: "HALKB", name: "Halkbank", sector: "Bankacılık", market: "Yıldız", indices: ["XU100", "XUTUM", "XYILD"], price: 15.40, rate: 0.45, marketCap: 45.2, healthScore: 78 },
  { symbol: "VAKBN.IS", code: "VAKBN", name: "Vakıfbank", sector: "Bankacılık", market: "Yıldız", indices: ["XU100", "XUTUM", "XYILD"], price: 14.85, rate: 0.65, marketCap: 42.8, healthScore: 79 },
  { symbol: "PETKM.IS", code: "PETKM", name: "Petkim", sector: "Kimya", market: "Yıldız", indices: ["XU030", "XU100", "XUTUM", "XYILD"], price: 21.80, rate: 0.35, marketCap: 48.2, healthScore: 72 },
  { symbol: "SISE.IS", code: "SISE", name: "Şişecam", sector: "Cam", market: "Yıldız", indices: ["XU030", "XU100", "XUTUM", "XYILD"], price: 54.30, rate: 0.15, marketCap: 165.4, healthScore: 87 },
  { symbol: "ASELS.IS", code: "ASELS", name: "Aselsan", sector: "Savunma", market: "Yıldız", indices: ["XU030", "XU100", "XUTUM", "XYILD"], price: null, rate: 0.0, marketCap: 145.8, healthScore: 88 },
  { symbol: "ODAS.IS", code: "ODAS", name: "Odaş Enerji", sector: "Enerji", market: "Yıldız", indices: ["XU030", "XU100", "XUTUM", "XYILD"], price: 9.45, rate: 1.20, marketCap: 15.2, healthScore: 72 },
  { symbol: "TAVHL.IS", code: "TAVHL", name: "TAV Havalimanları", sector: "Havacılık", market: "Yıldız", indices: ["XU100", "XUTUM", "XYILD"], price: 145.20, rate: 1.85, marketCap: 52.4, healthScore: 83 },
  { symbol: "QUAGR.IS", code: "QUAGR", name: "Qua Granite", sector: "İnşaat", market: "Yıldız", indices: ["XU100", "XUTUM", "XYILD"], price: 4.85, rate: -1.45, marketCap: 12.4, healthScore: 65 },
  { symbol: "EUPWR.IS", code: "EUPWR", name: "Europower Enerji", sector: "Enerji", market: "Ana", indices: ["XUTUM", "XANAP"], price: 165.20, rate: 3.45, marketCap: 42.5, healthScore: 78 },
  { symbol: "ALFAS.IS", code: "ALFAS", name: "Alfas Solar", sector: "Enerji", market: "Ana", indices: ["XUTUM", "XANAP"], price: 85.40, rate: 2.15, marketCap: 35.8, healthScore: 75 },
  { symbol: "YEOTK.IS", code: "YEOTK", name: "Yeo Teknoloji", sector: "Teknoloji", market: "Ana", indices: ["XUTUM", "XANAP"], price: 212.50, rate: 4.25, marketCap: 28.4, healthScore: 72 },
  { symbol: "SDTTR.IS", code: "SDTTR", name: "SDT Savunma", sector: "Savunma", market: "Ana", indices: ["XUTUM", "XANAP"], price: 385.40, rate: 5.15, marketCap: 18.2, healthScore: 70 }
];


