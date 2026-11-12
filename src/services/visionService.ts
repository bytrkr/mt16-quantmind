// src/services/visionService.ts
import { marketGateway } from './marketGateway';

export interface AKDAnalysisResult {
  top_buyers: Array<{ institution: string; net_lots: number }>;
  top_sellers: Array<{ institution: string; net_lots: number }>;
  raw_text?: string;
  success: boolean;
}

/**
 * AKD (Aracı Kurum Dağılımı) görselini Python backend'e gönderir, 
 * OCR/Vision analizi ile veriyi çeker ve marketGateway'e enjekte eder.
 */
export async function analyzeAKDImage(file: File, ticker: string): Promise<AKDAnalysisResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('ticker', ticker);
  formData.append(
    'prompt',
    'Bu görsel bir BIST Aracı Kurum Dağılımı (AKD) tablosudur. Görseldeki en çok alan 5 ve en çok satan 5 kurumun adını ve net lot miktarını JSON olarak çıkar.'
  );

  try {
    const response = await fetch('/api/input/analyze_image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sunucu hatası (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    
    // Python'dan dönen final kararın içindeki vision_analysis objesini yakala
    const visionAnalysis = result.vision_analysis || result;

    // marketGateway üzerinden simülasyon verisini ez (override)
    if (marketGateway && typeof (marketGateway as any).overrideAKDData === 'function') {
      (marketGateway as any).overrideAKDData(visionAnalysis);
    }

    return {
      top_buyers: visionAnalysis.top_buyers || [],
      top_sellers: visionAnalysis.top_sellers || [],
      raw_text: visionAnalysis.raw_text,
      success: true,
    };
  } catch (error) {
    console.error('AKD Görsel Analiz Hatası:', error);
    return {
      top_buyers: [],
      top_sellers: [],
      success: false,
    };
  }
}
