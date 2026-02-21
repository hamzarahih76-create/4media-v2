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

    // Calculate date 1 month ago
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const cutoffDate = oneMonthAgo.toISOString();

    console.log(`Looking for videos older than: ${cutoffDate}`);

    // Find video deliveries with cloudflare_stream_id older than 1 month
    const { data: oldDeliveries, error: fetchError } = await supabase
      .from('video_deliveries')
      .select('id, cloudflare_stream_id, created_at')
      .not('cloudflare_stream_id', 'is', null)
      .lt('created_at', cutoffDate);

    if (fetchError) {
      console.error('Error fetching old deliveries:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch old deliveries', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!oldDeliveries || oldDeliveries.length === 0) {
      console.log('No videos older than 1 month found');
      return new Response(
        JSON.stringify({ success: true, message: 'No videos to clean up', deleted: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${oldDeliveries.length} videos to delete from Cloudflare`);

    let deletedCount = 0;
    const errors: string[] = [];

    // Delete each video from Cloudflare Stream
    for (const delivery of oldDeliveries) {
      try {
        console.log(`Deleting video ${delivery.cloudflare_stream_id} (delivery ${delivery.id})`);
        
        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${delivery.cloudflare_stream_id}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${apiToken}`,
            },
          }
        );

        const data = await response.json();

        if (response.ok || response.status === 404) {
          // Video deleted or already doesn't exist - clear the cloudflare_stream_id
          const { error: updateError } = await supabase
            .from('video_deliveries')
            .update({ cloudflare_stream_id: null })
            .eq('id', delivery.id);

          if (updateError) {
            console.error(`Failed to update delivery ${delivery.id}:`, updateError);
            errors.push(`DB update failed for ${delivery.id}: ${updateError.message}`);
          } else {
            deletedCount++;
            console.log(`Successfully deleted and cleared video ${delivery.cloudflare_stream_id}`);
          }
        } else {
          console.error(`Failed to delete video ${delivery.cloudflare_stream_id}:`, data);
          errors.push(`Cloudflare delete failed for ${delivery.cloudflare_stream_id}: ${data.errors?.[0]?.message || 'Unknown error'}`);
        }
      } catch (err) {
        console.error(`Error processing delivery ${delivery.id}:`, err);
        errors.push(`Exception for ${delivery.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    console.log(`Cleanup complete: ${deletedCount}/${oldDeliveries.length} videos deleted`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleanup complete`,
        total: oldDeliveries.length,
        deleted: deletedCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
