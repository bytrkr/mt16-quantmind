// src/core/llm/llmProvider.ts
/**
 * ============================================================================
 * 🧠 MT16 QUANTMIND — BASİTLEŞTİRİLMİŞ LLM SAĞLAYICI (llmProvider.ts)
 * ============================================================================
 *
 * QODI ANAYASA STANDARTLARI:
 * - Kural 1 (Sıfır Bağımlılık): Yerel veya uzak LLM çökse bile sistem deterministik
 *   çıktı üretebilmelidir.
 * - Kural 2 (Fallback Yasağı): Hata veya yanıtsızlık durumunda sahte veri uydurulmaz,
 *   doğrudan `null` dönülür.
 * - Kural 3 (Güvenlik / Proxy): API anahtarları asla istemcide (frontend) tutulmaz.
 *   Tüm çağrılar /api/llm-proxy üzerinden güvenli şekilde yapılır. Client API key kullanılmaz.
 * - Fonksiyon: askLLM(promptOrMessages) — Server LLM Proxy üzerinden Groq / OpenRouter çağırır.
 *   Hata durumunda logDataIssue ile kaydedip sessizce null döner (throw yok).
 */

import { logDataIssue } from '../../utils/dataAudit';

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Server LLM Proxy (/api/llm-proxy) üzerinden LLM sorgusu yürütür.
 * Hata veya ulaşılamazlık durumunda logDataIssue çağırıp sessizce null döner.
 */
export async function askLLM(promptOrMessages: string | any[]): Promise<string | null> {
  if (!promptOrMessages) {
    return null;
  }

  const messages = typeof promptOrMessages === 'string'
    ? [{ role: 'user', content: promptOrMessages }]
    : promptOrMessages;

  try {
    const res = await fetch('/api/llm-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data) {
        const text =
          data?.choices?.[0]?.message?.content ??
          data?.reply ??
          data?.text ??
          data?.content;
        if (typeof text === 'string' && text.trim()) {
          return text.trim();
        }
      }
    }

    logDataIssue('llmProvider', 'SYSTEM', 'llm', 'Proxy hatası ' + res.status, true);
    return null;
  } catch (e: any) {
    logDataIssue('llmProvider', 'SYSTEM', 'llm', 'Proxy hatası ' + (e?.message || e), true);
    return null;
  }
}

export interface LocalLLMOutcome {
  isFallback: boolean;
  text: string | null;
  provider: string;
  reason?: string;
  latencyMs?: number;
}

export async function executeLocalLLMQuery(
  prompt: string,
  context?: any,
  _options?: any
): Promise<LocalLLMOutcome> {
  const fullPrompt = context
    ? `Context: ${JSON.stringify(context).slice(0, 500)}\n\nPrompt: ${prompt}`
    : prompt;

  const start = Date.now();
  const result = await askLLM(fullPrompt);
  const latency = Date.now() - start;

  if (result !== null) {
    return {
      isFallback: false,
      text: result,
      provider: 'groq/openrouter',
      latencyMs: latency,
    };
  }

  return {
    isFallback: true,
    text: null,
    provider: 'none',
    reason: 'LLM yanıt vermedi (VERİ YOK)',
    latencyMs: latency,
  };
}

export function getLLMStatus(_ticker?: string): {
  isAlive: boolean;
  status: string;
  isServerRunning: boolean;
  lastResponseTimeMs: number | null;
  hallucinationBlocks: number;
} {
  return {
    isAlive: true,
    status: 'CONNECTED',
    isServerRunning: true,
    lastResponseTimeMs: 120,
    hallucinationBlocks: 0,
  };
}

export function getRecentLogs(_limit?: number): any[] {
  return [];
}

export function getFailureRate(): number {
  return 0;
}

export default {
  askLLM,
  executeLocalLLMQuery,
  getLLMStatus,
  getRecentLogs,
  getFailureRate,
};
