/**
 * Edge Function: meta-download-media
 * Proxy to download media from Meta WhatsApp API (avoids CORS).
 *
 * GET ?media_id=XXX&access_token=YYY
 * Returns the binary media file with correct content-type.
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const mediaId = url.searchParams.get('media_id');
    const accessToken = url.searchParams.get('access_token');

    if (!mediaId || !accessToken) {
      return new Response(JSON.stringify({ error: 'Missing media_id or access_token' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 1: Get media URL from Meta
    const metaRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const metaData = await metaRes.json();

    if (!metaData.url) {
      return new Response(JSON.stringify({ error: 'No URL in Meta response', details: metaData }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Download the actual media
    const mediaRes = await fetch(metaData.url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!mediaRes.ok) {
      return new Response(JSON.stringify({ error: `Media download failed: ${mediaRes.status}` }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contentType = mediaRes.headers.get('content-type') || 'application/octet-stream';
    const body = await mediaRes.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
