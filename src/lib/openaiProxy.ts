import { supabase } from '@/integrations/supabase/client';

interface OpenAIRequest {
  model: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
}

/**
 * Call OpenAI chat completions.
 * Strategy: try Supabase RPC (server-side, no CORS issues) → fallback to direct API call.
 */
export async function callOpenAI(apiToken: string, payload: OpenAIRequest): Promise<any> {
  // 1) Try server-side call via Supabase RPC (avoids browser CORS/CSP)
  try {
    const { data, error } = await (supabase as any)
      .schema('saas')
      .rpc('openai_chat', {
        p_token: apiToken,
        p_model: payload.model || 'gpt-4o-mini',
        p_messages: payload.messages,
        p_temperature: payload.temperature ?? 0.3,
        p_max_tokens: payload.max_tokens ?? 1500,
      });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  } catch (rpcErr: any) {
    console.error('[openai] RPC failed:', rpcErr?.message, rpcErr);
    // Fallback: call OpenAI directly from browser (may fail due to CORS)
    try {
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
        throw new Error(err?.error?.message || `OpenAI HTTP ${response.status}`);
      }

      return await response.json();
    } catch (directErr: any) {
      console.error('[openai] Direct call also failed:', directErr?.message);
      throw new Error(
        rpcErr?.message?.includes('Could not find')
          ? 'Função openai_chat não encontrada. Verifique se a migração foi aplicada no Supabase.'
          : `RPC: ${rpcErr?.message || 'erro desconhecido'}. Direct: ${directErr?.message || 'falhou'}`
      );
    }
  }
}
