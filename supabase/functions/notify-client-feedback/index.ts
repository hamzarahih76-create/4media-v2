import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClientFeedbackRequest {
  videoId: string;
  videoTitle: string;
  clientName: string;
  decision: 'approved' | 'revision_requested';
  feedbackText: string | null;
  revisionNotes: string | null;
  rating: number | null;
}

async function sendEmail(resendApiKey: string, to: string[], subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: "4Media <contact@4media.ma>",
      to,
      subject,
      html,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }
  
  return response.json();
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      videoId,
      videoTitle,
      clientName,
      decision,
      feedbackText,
      revisionNotes,
      rating,
    }: ClientFeedbackRequest = await req.json();

    console.log(`Processing client feedback for video ${videoId}: ${decision}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get video details with editor info
    const { data: video } = await supabase
      .from('videos')
      .select(`
        *,
        tasks(client_name, title)
      `)
      .eq('id', videoId)
      .single();

    if (!video) {
      console.error('Video not found:', videoId);
      return new Response(
        JSON.stringify({ error: 'Video not found' }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isApproved = decision === 'approved';
    const notificationType = isApproved ? 'video_validated' : 'revision_requested';
    const title = isApproved 
      ? `✅ Vidéo validée par le client`
      : `📝 Révision demandée par le client`;
    const message = isApproved
      ? `Le client ${clientName} a validé la vidéo "${videoTitle}".${rating ? ` Note: ${rating}/5` : ''}`
      : `Le client ${clientName} demande des modifications sur "${videoTitle}".${revisionNotes ? ` Détails: ${revisionNotes.substring(0, 100)}...` : ''}`;

    // Create in-app notifications
    const notificationsToCreate = [];

    // Get all admins
    const { data: admins } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    // Add admin notifications
    for (const admin of admins || []) {
      notificationsToCreate.push({
        user_id: admin.user_id,
        type: notificationType,
        title,
        message,
        link: '/pm',
        metadata: {
          video_id: videoId,
          video_title: videoTitle,
          client_name: clientName,
          decision,
          requires_email: true,
        },
      });
    }

    // If revision requested, also notify the editor
    if (!isApproved && video.assigned_to) {
      notificationsToCreate.push({
        user_id: video.assigned_to,
        type: 'revision_requested',
        title: `📝 Révision demandée: ${videoTitle}`,
        message: revisionNotes || 'Le client a demandé des modifications.',
        link: '/editor',
        metadata: {
          video_id: videoId,
          video_title: videoTitle,
          client_name: clientName,
          revision_notes: revisionNotes,
          requires_email: true,
        },
      });
    }

    // Insert notifications
    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notificationsToCreate);

    if (notifError) {
      console.error('Error creating notifications:', notifError);
    } else {
      console.log(`Created ${notificationsToCreate.length} notifications`);
    }

    // Send email notifications
    if (resendApiKey) {
      // Admin email addresses - all admins receive notifications
      const adminEmails = ['hamzarahih76@gmail.com', 'rihabbouizer@gmail.com', 'im.nacib@gmail.com'];

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background-color: #ffffff; padding: 24px; text-align: center; border-bottom: 1px solid #e2e8f0;">
              <img src="https://4media.international/images/4media-logo.png" alt="4Media" width="100" height="auto" style="display: inline-block; max-width: 100px; height: auto;" />
            </div>
            <div style="background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); padding: 24px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">
                ${isApproved ? '✅ Vidéo Validée' : '📝 Révision Demandée'}
              </h1>
            </div>
            <div style="padding: 32px;">
              <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h2 style="margin: 0 0 8px 0; color: #1e293b; font-size: 18px;">${videoTitle}</h2>
                <p style="margin: 0; color: #64748b; font-size: 14px;">Client: ${clientName}</p>
              </div>
              
              ${rating ? `
              <div style="margin-bottom: 20px;">
                <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">Note du client:</p>
                <p style="margin: 0; font-size: 24px;">${'⭐'.repeat(rating)}${'☆'.repeat(5 - rating)}</p>
              </div>
              ` : ''}

              ${feedbackText ? `
              <div style="margin-bottom: 20px;">
                <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">Commentaire:</p>
                <p style="margin: 0; color: #1e293b; background-color: #f1f5f9; padding: 12px; border-radius: 6px;">${feedbackText}</p>
              </div>
              ` : ''}

              ${revisionNotes ? `
              <div style="margin-bottom: 20px; border-left: 4px solid #f97316; padding-left: 16px;">
                <p style="margin: 0 0 8px 0; color: #f97316; font-size: 14px; font-weight: 600;">Modifications demandées:</p>
                <p style="margin: 0; color: #1e293b;">${revisionNotes}</p>
              </div>
              ` : ''}

              <a href="https://4media.international/pm" 
                 style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 16px;">
                Voir dans le dashboard
              </a>
            </div>
            <div style="background-color: #f8fafc; padding: 20px; text-align: center;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                4Media Platform • Notification automatique<br>
                Si vous ne souhaitez plus recevoir ces notifications, contactez-nous à contact@4media.ma
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        const emailResponse = await sendEmail(
          resendApiKey,
          adminEmails,
          isApproved ? `✅ Vidéo validée: ${videoTitle}` : `📝 Révision demandée: ${videoTitle}`,
          emailHtml
        );
        console.log("Email sent to admins:", emailResponse);
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }

      // If revision, also email the editor
      if (!isApproved && video.assigned_to) {
        const { data: editorProfile } = await supabase
          .from('team_members')
          .select('email, full_name')
          .eq('user_id', video.assigned_to)
          .single();

        if (editorProfile?.email) {
          const editorEmailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
              <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="background-color: #ffffff; padding: 24px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                  <img src="https://4media.international/images/4media-logo.png" alt="4Media" width="100" height="auto" style="display: inline-block; max-width: 100px; height: auto;" />
                </div>
                <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 24px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">📝 Révision Demandée</h1>
                </div>
                <div style="padding: 32px;">
                  <p style="color: #1e293b; font-size: 16px; margin: 0 0 20px 0;">
                    Bonjour ${editorProfile.full_name || 'Éditeur'},
                  </p>
                  <p style="color: #64748b; font-size: 14px; margin: 0 0 20px 0;">
                    Le client ${clientName} a demandé des modifications sur votre vidéo:
                  </p>
                  <div style="background-color: #fff7ed; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #f97316;">
                    <h2 style="margin: 0 0 8px 0; color: #1e293b; font-size: 18px;">${videoTitle}</h2>
                    ${revisionNotes ? `<p style="margin: 0; color: #c2410c;">${revisionNotes}</p>` : ''}
                  </div>
                  <a href="https://4media.international/editor" 
                     style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
                    Voir les détails
                  </a>
                </div>
                <div style="background-color: #f8fafc; padding: 20px; text-align: center;">
                  <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                    4Media Platform • Notification automatique<br>
                    Si vous ne souhaitez plus recevoir ces notifications, contactez-nous à contact@4media.ma
                  </p>
                </div>
              </div>
            </body>
            </html>
          `;

          try {
            await sendEmail(
              resendApiKey,
              [editorProfile.email],
              `📝 Révision demandée: ${videoTitle}`,
              editorEmailHtml
            );
            console.log("Email sent to editor:", editorProfile.email);
          } catch (editorEmailError) {
            console.error("Error sending editor email:", editorEmailError);
          }
        }
      }
    } else {
      console.log("RESEND_API_KEY not configured, skipping email");
    }

    return new Response(
      JSON.stringify({ success: true, notifications_created: notificationsToCreate.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in notify-client-feedback:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
