import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const apiToken = Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN');

    if (!accountId || !apiToken) {
      console.error('Missing Cloudflare credentials');
      return new Response(
        JSON.stringify({ error: 'Cloudflare not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, audioId, audioTitle } = await req.json();

    // Action: Get direct upload URL for audio (using Cloudflare Stream)
    // Cloudflare Stream supports audio files as well
    if (action === 'get-upload-url') {
      console.log('Requesting direct upload URL for audio from Cloudflare Stream');
      
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            maxDurationSeconds: 300, // 5 minutes max for audio
            requireSignedURLs: true,
            meta: {
              name: audioTitle || 'Voice Message',
              type: 'audio',
            },
          }),
        }
      );

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        console.error('Cloudflare API error:', data);
        return new Response(
          JSON.stringify({ error: data.errors?.[0]?.message || 'Failed to get upload URL' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Audio upload URL generated successfully');
      return new Response(
        JSON.stringify({
          success: true,
          uploadURL: data.result.uploadURL,
          uid: data.result.uid,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: Get signed playback URL for audio
    if (action === 'get-playback-url' && audioId) {
      console.log('Generating signed URL for audio:', audioId);
      
      // First get video/audio details to check if it requires signed URLs
      const detailsResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${audioId}`,
        {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
          },
        }
      );

      const detailsData = await detailsResponse.json();
      
      if (!detailsResponse.ok || !detailsData.success) {
        console.error('Could not get audio details:', detailsData);
        return new Response(
          JSON.stringify({ error: 'Audio not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate signed token for playback
      const tokenResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${audioId}/token`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiration
            downloadable: false,
            accessRules: [
              { type: 'any', action: 'allow' }
            ]
          }),
        }
      );

      const tokenData = await tokenResponse.json();
      
      if (!tokenResponse.ok || !tokenData.success) {
        console.error('Could not generate token:', tokenData);
        return new Response(
          JSON.stringify({ error: 'Failed to generate playback token' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const signedToken = tokenData.result.token;
      const playbackUrl = `https://videodelivery.net/${signedToken}/manifest/audio.m3u8`;
      const iframeUrl = `https://iframe.videodelivery.net/${signedToken}`;

      return new Response(
        JSON.stringify({
          success: true,
          playbackUrl,
          iframeUrl,
          duration: detailsData.result.duration,
          readyToStream: detailsData.result.readyToStream,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: Delete audio
    if (action === 'delete-audio' && audioId) {
      console.log('Deleting audio:', audioId);
      
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${audioId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
          },
        }
      );

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        console.error('Cloudflare API error:', data);
        return new Response(
          JSON.stringify({ error: 'Failed to delete audio' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
