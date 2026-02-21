import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId, fetchFullData } = await req.json();

    if (!videoId) {
      return new Response(
        JSON.stringify({ error: 'Video ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch video with task info
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select(`
        *,
        tasks(client_name, title, client_user_id)
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

    // Fetch client profile logo if client_user_id exists
    let clientLogoUrl = null;
    const clientUserId = video.tasks?.client_user_id;
    if (clientUserId) {
      const { data: clientProfile } = await supabase
        .from('client_profiles')
        .select('logo_url')
        .eq('user_id', clientUserId)
        .single();
      if (clientProfile?.logo_url) {
        clientLogoUrl = clientProfile.logo_url;
      }
    }

    // Only allow access for review_client, completed, or revision_requested statuses
    const allowedStatuses = ['review_client', 'completed', 'revision_requested'];
    if (!allowedStatuses.includes(video.status)) {
      // Check if there's an active review link
      const { data: reviewLink } = await supabase
        .from('video_review_links')
        .select('id, is_active, expires_at')
        .eq('video_id', videoId)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (!reviewLink) {
        return new Response(
          JSON.stringify({ error: 'Access denied - video not in valid state' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get latest delivery
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
        JSON.stringify({ error: 'No delivery found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate signed URL if file type (legacy Supabase storage)
    let signedUrl = null;
    if (delivery.delivery_type === 'file' && delivery.file_path) {
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('deliveries')
        .createSignedUrl(delivery.file_path, 3600);

      if (signedUrlError) {
        console.error('Signed URL error:', signedUrlError);
      } else {
        signedUrl = signedUrlData?.signedUrl;
      }
    }

    // Handle Cloudflare Stream playback
    let cloudflarePlayback = null;
    if (delivery.cloudflare_stream_id) {
      const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
      const apiToken = Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN');

      if (accountId && apiToken) {
        try {
          // First get video info
          const cfResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${delivery.cloudflare_stream_id}`,
            {
              headers: {
                'Authorization': `Bearer ${apiToken}`,
              },
            }
          );

          const cfData = await cfResponse.json();
          
          if (cfResponse.ok && cfData.success) {
            const videoInfo = cfData.result;
            
            // Check if video requires signed URLs
            if (videoInfo.requireSignedURLs) {
              // Generate signed token using Cloudflare's token endpoint
              const tokenResponse = await fetch(
                `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${delivery.cloudflare_stream_id}/token`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
                  }),
                }
              );

              const tokenData = await tokenResponse.json();
              
              if (tokenData.success && tokenData.result?.token) {
                cloudflarePlayback = {
                  iframeUrl: `https://iframe.videodelivery.net/${tokenData.result.token}`,
                  playbackUrl: `https://videodelivery.net/${tokenData.result.token}/manifest/video.m3u8`,
                  thumbnail: videoInfo.thumbnail,
                  duration: videoInfo.duration,
                  readyToStream: videoInfo.readyToStream,
                };
              } else {
                console.error('Failed to generate signed token:', tokenData.errors);
                // Fallback to public URLs if token generation fails
                cloudflarePlayback = {
                  iframeUrl: videoInfo.preview,
                  playbackUrl: videoInfo.playback?.hls,
                  thumbnail: videoInfo.thumbnail,
                  duration: videoInfo.duration,
                  readyToStream: videoInfo.readyToStream,
                };
              }
            } else {
              // Video doesn't require signed URLs - use public URLs
              cloudflarePlayback = {
                iframeUrl: videoInfo.preview,
                playbackUrl: videoInfo.playback?.hls,
                thumbnail: videoInfo.thumbnail,
                duration: videoInfo.duration,
                readyToStream: videoInfo.readyToStream,
              };
            }
          }
        } catch (cfError) {
          console.error('Cloudflare Stream error:', cfError);
        }
      }
    }

    // Get review link info
    const { data: reviewLink } = await supabase
      .from('video_review_links')
      .select('*')
      .eq('video_id', videoId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Check for existing feedback
    let hasExistingFeedback = false;
    if (reviewLink) {
      const { data: existingFeedback } = await supabase
        .from('video_feedback')
        .select('id')
        .eq('review_link_id', reviewLink.id)
        .single();
      hasExistingFeedback = !!existingFeedback;

      // Update view count
      await supabase
        .from('video_review_links')
        .update({ 
          views_count: reviewLink.views_count + 1,
          last_viewed_at: new Date().toISOString()
        })
        .eq('id', reviewLink.id);
    }

    // Return full data for client delivery page
    if (fetchFullData) {
      return new Response(
        JSON.stringify({
          signedUrl,
          cloudflarePlayback,
          clientLogoUrl,
          video: {
            id: video.id,
            title: video.title,
            status: video.status,
            task_id: video.task_id,
            client_name: video.tasks?.client_name || '',
            project_name: video.tasks?.title || '',
          },
          delivery: {
            id: delivery.id,
            version_number: delivery.version_number,
            delivery_type: delivery.delivery_type,
            external_link: delivery.external_link,
            file_path: delivery.file_path,
            cloudflare_stream_id: delivery.cloudflare_stream_id,
            notes: delivery.notes,
            submitted_at: delivery.submitted_at,
          },
          reviewLink: reviewLink ? {
            id: reviewLink.id,
            expires_at: reviewLink.expires_at,
            is_active: reviewLink.is_active,
          } : null,
          hasExistingFeedback,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Simple response with just signed URL
    return new Response(
      JSON.stringify({ signedUrl }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
