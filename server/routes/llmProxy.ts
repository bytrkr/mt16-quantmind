import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || '';
const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.GEMINI_API_KEY_1 ||
  process.env.GEMINI_API_KEY_2 ||
  '';

export interface LLMGenerateRequestBody {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  providerPriority?: Array<'gemini' | 'deepseek' | 'qwen' | 'groq' | 'openrouter'>;
}

interface ProviderAttemptResult {
  provider: 'gemini' | 'deepseek' | 'qwen' | 'groq' | 'openrouter';
  model: string;
  content: string;
}

async function callGeminiProvider(
  prompt: string,
  systemInstruction?: string,
  temperature: number = 0.2,
  maxTokens: number = 1000
): Promise<ProviderAttemptResult> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY tanimli degil.');
  const model = 'gemini-1.5-flash';
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const geminiModel = genAI.getGenerativeModel({ model, systemInstruction });
  const result = await geminiModel.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens: maxTokens },
  });
  const text = result.response.text();
  if (!text) throw new Error('Gemini bos yanit dondurdu.');
  return { provider: 'gemini', model, content: text.trim() };
}

async function callDeepSeekProvider(
  prompt: string,
  systemInstruction?: string,
  temperature: number = 0.2,
  maxTokens: number = 1000
): Promise<ProviderAttemptResult> {
  if (!DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY tanimli degil.');
  const model = 'deepseek-chat';
  const messages: Array<{ role: string; content: string }> = [];
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
  messages.push({ role: 'user', content: prompt });

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) throw new Error(`DeepSeek HTTP ${response.status}`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('DeepSeek bos yanit dondurdu.');
  return { provider: 'deepseek', model, content };
}

async function callQwenProvider(
  prompt: string,
  systemInstruction?: string,
  temperature: number = 0.2,
  maxTokens: number = 1000
): Promise<ProviderAttemptResult> {
  if (!DASHSCOPE_API_KEY) throw new Error('DASHSCOPE_API_KEY tanimli degil.');
  const model = 'qwen-max';
  const messages: Array<{ role: string; content: string }> = [];
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
  messages.push({ role: 'user', content: prompt });

  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) throw new Error(`Qwen HTTP ${response.status}`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Qwen bos yanit dondurdu.');
  return { provider: 'qwen', model, content };
}

async function callGroqProvider(
  prompt: string,
  systemInstruction?: string,
  temperature: number = 0.2,
  maxTokens: number = 1000
): Promise<ProviderAttemptResult> {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY tanimli degil.');
  const model = 'llama-3.3-70b-versatile';
  const messages: Array<{ role: string; content: string }> = [];
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
  messages.push({ role: 'user', content: prompt });

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) throw new Error(`Groq HTTP ${response.status}`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Groq bos yanit dondurdu.');
  return { provider: 'groq', model, content };
}

async function callOpenRouterProvider(
  prompt: string,
  systemInstruction?: string,
  temperature: number = 0.2,
  maxTokens: number = 1000
): Promise<ProviderAttemptResult> {
  if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY tanimli degil.');
  const model = 'deepseek/deepseek-r1-distill-llama-70b';
  const messages: Array<{ role: string; content: string }> = [];
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
  messages.push({ role: 'user', content: prompt });

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) throw new Error(`OpenRouter HTTP ${response.status}`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('OpenRouter bos yanit dondurdu.');
  return { provider: 'openrouter', model, content };
}

async function handleGenerate(req: Request<{}, {}, LLMGenerateRequestBody>, res: Response) {
  const { prompt, systemInstruction, temperature = 0.2, maxTokens = 1000, providerPriority } = req.body || {};
  if (!prompt) return res.status(400).json({ success: false, error: 'Prompt zorunludur.' });

  const priority: Array<'gemini' | 'deepseek' | 'qwen' | 'groq' | 'openrouter'> =
    providerPriority || ['gemini', 'deepseek', 'qwen', 'groq', 'openrouter'];

  const errors: string[] = [];

  for (const provider of priority) {
    try {
      let result: ProviderAttemptResult;
      if (provider === 'gemini') result = await callGeminiProvider(prompt, systemInstruction, temperature, maxTokens);
      else if (provider === 'deepseek') result = await callDeepSeekProvider(prompt, systemInstruction, temperature, maxTokens);
      else if (provider === 'qwen') result = await callQwenProvider(prompt, systemInstruction, temperature, maxTokens);
      else if (provider === 'groq') result = await callGroqProvider(prompt, systemInstruction, temperature, maxTokens);
      else result = await callOpenRouterProvider(prompt, systemInstruction, temperature, maxTokens);

      return res.json({
        success: true,
        provider: result.provider,
        model: result.model,
        content: result.content,
      });
    } catch (e: any) {
      errors.push(`${provider}: ${e.message}`);
    }
  }

  return res.status(500).json({
    success: false,
    error: 'Tum LLM saglayicilari basarisiz oldu.',
    details: errors,
  });
}

router.post('/generate', handleGenerate);
router.post('/api/llm/generate', handleGenerate);

export default router;
