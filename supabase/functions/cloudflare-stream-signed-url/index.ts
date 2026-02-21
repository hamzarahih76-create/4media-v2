import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Base64URL encode helper
function base64UrlEncode(data: Uint8Array | string): string {
  let str: string;
  if (typeof data === 'string') {
    str = btoa(data);
  } else {
    str = btoa(String.fromCharCode(...data));
  }
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Generate a signed token for Cloudflare Stream video playback
async function generateSignedToken(
  videoId: string,
  expiresIn: number = 3600,
  downloadable: boolean = false
): Promise<string> {
  const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID')!;
  const apiToken = Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN')!;

  // Cloudflare Stream token endpoint - only accepts specific parameters
  const tokenRequestBody: Record<string, any> = {};
  
  // Add expiry time (in seconds from now)
  if (expiresIn) {
    tokenRequestBody.exp = Math.floor(Date.now() / 1000) + expiresIn;
  }

  if (downloadable) {
    tokenRequestBody.downloadable = true;
  }

  console.log('Requesting token for video:', videoId);
  console.log('Token request body:', JSON.stringify(tokenRequestBody));

  // Request a signed token from Cloudflare
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}/token`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tokenRequestBody),
    }
  );

  const data = await response.json();
  console.log('Token response:', JSON.stringify(data));
  
  if (!data.success) {
    console.error('Failed to generate token:', data.errors, data.messages);
    throw new Error(`Failed to generate signed token: ${JSON.stringify(data.errors || data.messages)}`);
  }

  return data.result.token;
}

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

    const { videoId, cloudflareVideoId, action, expiresIn } = await req.json();

    if (!cloudflareVideoId) {
      return new Response(
        JSON.stringify({ error: 'Cloudflare video ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get video info first
    const videoResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${cloudflareVideoId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
        },
      }
    );

    const videoData = await videoResponse.json();

    if (!videoResponse.ok || !videoData.success) {
      console.error('Video not found:', videoData);
      return new Response(
        JSON.stringify({ error: 'Video not found on Cloudflare Stream' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const video = videoData.result;

    // Check if video requires signed URLs
    if (video.requireSignedURLs) {
      // Generate signed token
      const downloadable = action === 'download';
      const token = await generateSignedToken(
        cloudflareVideoId,
        expiresIn || 3600,
        downloadable
      );

      // Use the standard Cloudflare Stream iframe URL with signed token
      const signedPlaybackUrl = `https://videodelivery.net/${token}/manifest/video.m3u8`;
      const signedIframeUrl = `https://iframe.videodelivery.net/${token}`;
      const signedThumbnailUrl = `https://videodelivery.net/${token}/thumbnails/thumbnail.jpg`;
      
      let downloadUrl = null;
      if (downloadable && video.playback?.hls) {
        downloadUrl = `https://videodelivery.net/${token}/downloads/default.mp4`;
      }

      return new Response(
        JSON.stringify({
          success: true,
          playbackUrl: signedPlaybackUrl,
          iframeUrl: signedIframeUrl,
          downloadUrl,
          thumbnail: signedThumbnailUrl,
          duration: video.duration,
          readyToStream: video.readyToStream,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Video doesn't require signed URLs
      return new Response(
        JSON.stringify({
          success: true,
          playbackUrl: video.playback?.hls,
          iframeUrl: video.preview,
          downloadUrl: action === 'download' ? video.playback?.dash : null,
          thumbnail: video.thumbnail,
          duration: video.duration,
          readyToStream: video.readyToStream,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
