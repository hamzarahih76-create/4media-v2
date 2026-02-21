import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to wait
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Generate a signed token for download
async function generateSignedDownloadToken(
  accountId: string,
  apiToken: string,
  cloudflareVideoId: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const tokenResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${cloudflareVideoId}/token`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exp: Math.floor(Date.now() / 1000) + expiresIn,
          downloadable: true,
        }),
      }
    );

    const tokenData = await tokenResponse.json();
    console.log('Token generation response:', JSON.stringify(tokenData));

    if (tokenData.success && tokenData.result?.token) {
      return tokenData.result.token;
    }
    
    console.error('Failed to generate signed token:', tokenData.errors);
    return null;
  } catch (error) {
    console.error('Error generating token:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const apiToken = Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!accountId || !apiToken) {
      console.error('Missing Cloudflare credentials');
      return new Response(
        JSON.stringify({ error: 'Cloudflare Stream not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { videoId, fromPlanning } = await req.json();

    if (!videoId) {
      return new Response(
        JSON.stringify({ error: 'Video ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the video exists and is validated
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select(`
        *,
        tasks(client_name, title, project_name)
      `)
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      console.error('Video not found:', videoError);
      return new Response(
        JSON.stringify({ error: 'Video not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if video is validated (completed status) - skip for planning downloads
    if (video.status !== 'completed' && !fromPlanning) {
      console.log('Video not validated yet, status:', video.status);
      return new Response(
        JSON.stringify({ 
          error: 'Download not available',
          message: 'La vidéo doit être validée avant de pouvoir être téléchargée.'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the Cloudflare Stream video ID from the latest delivery
    const { data: delivery, error: deliveryError } = await supabase
      .from('video_deliveries')
      .select('*')
      .eq('video_id', videoId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (deliveryError || !delivery) {
      console.error('No delivery found:', deliveryError);
      return new Response(
        JSON.stringify({ error: 'No video delivery found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cloudflareVideoId = delivery.cloudflare_stream_id;
    
    if (!cloudflareVideoId) {
      console.error('No Cloudflare Stream ID found in delivery');
      return new Response(
        JSON.stringify({ error: 'Video not available for download' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing download for Cloudflare video:', cloudflareVideoId);

    // Step 1: Enable downloads via POST request
    console.log('Enabling downloads for video...');
    await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${cloudflareVideoId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meta: { downloadable: true },
        }),
      }
    );

    // Step 2: Create downloads endpoint (this triggers download preparation)
    console.log('Creating download...');
    await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${cloudflareVideoId}/downloads`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Step 3: Poll for download readiness (up to 10 seconds)
    let downloadUrl: string | null = null;
    let downloadStatus = 'inprogress';
    let attempts = 0;
    const maxAttempts = 5;

    while (downloadStatus !== 'ready' && attempts < maxAttempts) {
      await sleep(2000); // Wait 2 seconds between checks
      
      const downloadInfoResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${cloudflareVideoId}/downloads`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
          },
        }
      );

      const downloadInfo = await downloadInfoResponse.json();
      console.log(`Attempt ${attempts + 1}: Download status:`, downloadInfo.result?.default?.status);

      if (downloadInfo.success && downloadInfo.result?.default) {
        downloadStatus = downloadInfo.result.default.status;
        
        if (downloadStatus === 'ready') {
          console.log('Download is ready!');
          break;
        }
      }
      
      attempts++;
    }

    // Step 4: Generate signed token for download (required for requireSignedURLs videos)
    console.log('Generating signed download token...');
    const signedToken = await generateSignedDownloadToken(accountId, apiToken, cloudflareVideoId, 3600);
    
    if (signedToken) {
      // Use signed token URL for download
      downloadUrl = `https://videodelivery.net/${signedToken}/downloads/default.mp4`;
      console.log('Generated signed download URL');
    } else {
      // Fallback to direct URL (may fail if requireSignedURLs is enabled)
      downloadUrl = `https://customer-pi24ql2ud0f1i66p.cloudflarestream.com/${cloudflareVideoId}/downloads/default.mp4`;
      console.log('Using fallback download URL (may require signed URLs)');
    }

    // Create a notification for the download - check for duplicates first
    try {
      if (video.assigned_to) {
        // Check if we already sent a download notification for this video in the last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data: existingNotif } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', video.assigned_to)
          .eq('type', 'video_downloaded')
          .contains('metadata', { video_id: videoId })
          .gte('created_at', oneHourAgo)
          .limit(1);

        if (!existingNotif || existingNotif.length === 0) {
          await supabase
            .from('notifications')
            .insert({
              user_id: video.assigned_to,
              type: 'video_downloaded',
              title: 'Vidéo téléchargée',
              message: `Le client a téléchargé la vidéo "${video.title}"`,
              link: `/editor`,
              metadata: {
                video_id: videoId,
                video_title: video.title,
                client_name: video.tasks?.client_name,
                project_name: video.tasks?.project_name,
              },
            });
          console.log('Download notification sent to editor:', video.assigned_to);
        } else {
          console.log('Skipping duplicate download notification');
        }
      }
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }

    console.log('Download link generated successfully:', downloadUrl);

    return new Response(
      JSON.stringify({
        success: true,
        downloadUrl,
        fileName: `${(video.title || 'video').replace(/[^a-z0-9]/gi, '_')}.mp4`,
        status: downloadStatus,
        message: downloadStatus === 'ready' ? 'Download ready' : 'Download preparing, URL may work shortly',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
