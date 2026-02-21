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
        JSON.stringify({ error: 'Cloudflare Stream not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, videoId, videoTitle, requireSignedURLs, fileSize } = await req.json();

    // Action: Get TUS upload endpoint (for resumable uploads, supports large files)
    if (action === 'get-tus-url') {
      console.log('Requesting TUS upload URL from Cloudflare Stream, fileSize:', fileSize);
      
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Tus-Resumable': '1.0.0',
            'Upload-Length': String(fileSize || 0),
            'Upload-Metadata': `name ${btoa(videoTitle || 'Untitled Video')},requiresignedurls ${btoa(String(requireSignedURLs ?? true))},maxDurationSeconds ${btoa('3600')}`,
          },
        }
      );

      if (response.status !== 201) {
        const text = await response.text();
        console.error('Cloudflare TUS API error:', response.status, text);
        return new Response(
          JSON.stringify({ error: `Failed to create TUS upload: ${response.status}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const location = response.headers.get('location') || response.headers.get('Location');
      const streamMediaId = response.headers.get('stream-media-id') || '';
      
      console.log('TUS upload URL generated successfully, media ID:', streamMediaId);
      return new Response(
        JSON.stringify({
          success: true,
          tusUploadURL: location,
          uid: streamMediaId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: Get direct upload URL (for client-side uploads < 200MB)
    if (action === 'get-upload-url') {
      console.log('Requesting direct upload URL from Cloudflare Stream');
      
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            maxDurationSeconds: 3600, // 1 hour max
            requireSignedURLs: requireSignedURLs ?? true,
            meta: {
              name: videoTitle || 'Untitled Video',
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

      console.log('Upload URL generated successfully');
      return new Response(
        JSON.stringify({
          success: true,
          uploadURL: data.result.uploadURL,
          uid: data.result.uid,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: Get video details
    if (action === 'get-video' && videoId) {
      console.log('Fetching video details for:', videoId);
      
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}`,
        {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
          },
        }
      );

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        console.error('Cloudflare API error:', data);
        return new Response(
          JSON.stringify({ error: 'Video not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          video: {
            uid: data.result.uid,
            status: data.result.status,
            duration: data.result.duration,
            thumbnail: data.result.thumbnail,
            preview: data.result.preview,
            playback: data.result.playback,
            meta: data.result.meta,
            created: data.result.created,
            modified: data.result.modified,
            readyToStream: data.result.readyToStream,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: Delete video
    if (action === 'delete-video' && videoId) {
      console.log('Deleting video:', videoId);
      
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}`,
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
          JSON.stringify({ error: 'Failed to delete video' }),
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
