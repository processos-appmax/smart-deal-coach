import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  try {
    const baseUrl = (Deno.env.get('MEET_COLLECTOR_URL') || '').trim().replace(/\/+$/, '');
    const token = (Deno.env.get('MEET_COLLECTOR_TOKEN') || '').trim();

    if (!baseUrl || !token) {
      return json({ ok: false, error: 'MEET_COLLECTOR_URL/MEET_COLLECTOR_TOKEN não configurados' }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '').trim();
    const conferenceKey = String(body?.conference_key || '').trim();

    if (!conferenceKey) return json({ ok: false, error: 'conference_key é obrigatório' }, 400);

    const endpoint = action === 'transcript' ? '/meet/transcript' : '/meet/run-conference';

    const upstream = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-token': token,
      },
      body: JSON.stringify({ conference_key: conferenceKey }),
    });

    const text = await upstream.text();
    let payload: unknown = text;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = text;
    }

    if (!upstream.ok) {
      return json(
        typeof payload === 'object' && payload !== null ? payload : { ok: false, error: String(payload) },
        upstream.status,
      );
    }

    return json(payload, 200);
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Erro interno no meet-gateway' }, 500);
  }
});
