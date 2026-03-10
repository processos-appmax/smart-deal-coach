import { CONFIG } from '@/lib/config';

const SUPABASE_URL = CONFIG.SUPABASE_URL;
const SUPABASE_KEY = CONFIG.SUPABASE_PUBLISHABLE_KEY;

interface OpenAIRequest {
  model: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
}

/**
 * Call OpenAI via Supabase Edge Function proxy (avoids CORS/CSP on Lovable).
 * Falls back to direct OpenAI call if proxy is unavailable.
 */
export async function callOpenAI(apiToken: string, payload: OpenAIRequest): Promise<any> {
  // Try Supabase Edge Function proxy first
  try {
    const proxyUrl = `${SUPABASE_URL}/functions/v1/openai-proxy`;
    const proxyRes = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'x-openai-token': apiToken,
      },
      body: JSON.stringify(payload),
    });
    if (!proxyRes.ok) {
      const proxyErr = await proxyRes.json().catch(() => ({}));
      throw new Error(proxyErr?.error || `Proxy HTTP ${proxyRes.status}`);
    }
    return await proxyRes.json();
  } catch {
    // Fallback: call OpenAI directly
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${response.status}`);
    }
    return await response.json();
  }
}
