import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Email template for late video notification
const getLateVideoEmailTemplate = (
  videoTitle: string,
  projectName: string | null,
  clientName: string | null,
  editorName: string | null,
  isForEditor: boolean
) => {
  const contextLine = [projectName, clientName].filter(Boolean).join(' • ');
  
  const message = isForEditor
    ? `Votre vidéo "${videoTitle}" a dépassé le temps imparti. Veuillez la livrer dès que possible pour éviter des pénalités.`
    : `La vidéo "${videoTitle}" assignée à ${editorName || 'un éditeur'} est maintenant en retard.`;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>⚠️ Vidéo en retard</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #dc2626; padding: 24px 40px; text-align: center;">
              <span style="font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">4Media</span>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <div style="font-size: 48px; text-align: center; margin-bottom: 24px;">⚠️</div>
              
              <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 600; color: #dc2626; line-height: 1.3; text-align: center;">
                Vidéo en retard
              </h1>
              
              ${contextLine ? `
              <p style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #6366f1; text-align: center;">
                ${contextLine}
              </p>
              ` : ''}
              
              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.7; color: #475569; text-align: center;">
                ${message}
              </p>
              
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 14px; color: #991b1b; font-weight: 500; text-align: center;">
                  📹 ${videoTitle}
                </p>
              </div>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.6; text-align: center;">
                Cet email a été envoyé automatiquement par 4Media.<br>
                Si vous ne souhaitez plus recevoir ces notifications, contactez-nous à contact@4media.ma
              </p>
            </td>
          </tr>
          
        </table>
        
        <!-- Copyright -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 520px;">
          <tr>
            <td align="center" style="padding: 24px 20px;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                © ${new Date().getFullYear()} 4Media. Tous droits réservés.
              </p>
            </td>
          </tr>
        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting late videos check...");
    
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Find all videos that should be marked as late
    // Conditions: status is 'active', started_at + allowed_duration has passed
    const { data: lateVideos, error: queryError } = await supabase
      .from('videos')
      .select(`
        id,
        title,
        assigned_to,
        status,
        started_at,
        allowed_duration_minutes,
        task_id,
        task:tasks!videos_task_id_fkey (
          title,
          client_name
        )
      `)
      .eq('status', 'active')
      .not('started_at', 'is', null);

    if (queryError) {
      console.error("Query error:", queryError);
      throw queryError;
    }

    console.log(`Found ${lateVideos?.length || 0} active videos to check`);

    const processedVideos: string[] = [];
    const emailsSent: string[] = [];

    for (const video of lateVideos || []) {
      // Calculate if video is late
      const startedAt = new Date(video.started_at);
      const allowedDurationMinutes = video.allowed_duration_minutes || 300;
      const deadlineTime = new Date(startedAt.getTime() + allowedDurationMinutes * 60 * 1000);
      
      if (new Date() > deadlineTime) {
        console.log(`Video ${video.id} (${video.title}) is late`);
        
        // Update video status to late
        const { error: updateError } = await supabase
          .from('videos')
          .update({ status: 'late', updated_at: new Date().toISOString() })
          .eq('id', video.id);

        if (updateError) {
          console.error(`Error updating video ${video.id}:`, updateError);
          continue;
        }

        processedVideos.push(video.id);

        // Get editor info
        let editorEmail: string | null = null;
        let editorName: string | null = null;

        if (video.assigned_to) {
          const { data: teamMember } = await supabase
            .from('team_members')
            .select('email, full_name')
            .eq('user_id', video.assigned_to)
            .single();

          if (teamMember) {
            editorEmail = teamMember.email;
            editorName = teamMember.full_name;
          }
        }

        const projectName = (video.task as any)?.title || null;
        const clientName = (video.task as any)?.client_name || null;

        // Send email to editor
        if (editorEmail && RESEND_API_KEY) {
          const emailHtml = getLateVideoEmailTemplate(
            video.title,
            projectName,
            clientName,
            editorName,
            true
          );

          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "4Media <noreply@4media.ma>",
              reply_to: "contact@4media.ma",
              to: [editorEmail],
              subject: `⚠️ Vidéo en retard: ${video.title} - 4Media`,
              html: emailHtml,
            }),
          });

          const emailResponse = await res.json();
          console.log(`Email sent to editor ${editorEmail}:`, emailResponse);
          emailsSent.push(editorEmail);
        }

        // Send email to admins
        const adminEmails = ['hamzarahih76@gmail.com', 'rihabbouizer@gmail.com', 'im.nacib@gmail.com'];
        const adminEmailHtml = getLateVideoEmailTemplate(
          video.title,
          projectName,
          clientName,
          editorName,
          false
        );

        if (RESEND_API_KEY) {
          const adminRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "4Media <noreply@4media.ma>",
              reply_to: "contact@4media.ma",
              to: adminEmails,
              subject: `⚠️ Vidéo en retard: ${video.title} - 4Media`,
              html: adminEmailHtml,
            }),
          });

          const adminEmailResponse = await adminRes.json();
          console.log("Email sent to admins:", adminEmailResponse);
          emailsSent.push(...adminEmails);
        }

        // Create in-app notification for editor
        if (video.assigned_to) {
          await supabase.from('notifications').insert({
            user_id: video.assigned_to,
            type: 'video_late',
            title: '⚠️ Vidéo en retard',
            message: `La vidéo "${video.title}" est maintenant en retard. Veuillez la livrer dès que possible.`,
            link: '/editor',
            metadata: {
              video_id: video.id,
              video_title: video.title,
              project_name: projectName,
              client_name: clientName,
            },
            email_sent: true, // Mark as sent since we already sent the email
          });
        }

        // Create in-app notifications for admins
        const { data: admins } = await supabase
          .from('user_roles')
          .select('user_id')
          .in('role', ['admin', 'project_manager']);

        for (const admin of admins || []) {
          await supabase.from('notifications').insert({
            user_id: admin.user_id,
            type: 'video_late',
            title: '⚠️ Vidéo en retard',
            message: `La vidéo "${video.title}" assignée à ${editorName || 'un éditeur'} est en retard.`,
            link: '/pm',
            metadata: {
              video_id: video.id,
              video_title: video.title,
              project_name: projectName,
              client_name: clientName,
              editor_name: editorName,
            },
            email_sent: true,
          });
        }
      }
    }

    console.log(`Processed ${processedVideos.length} late videos, sent ${emailsSent.length} emails`);

    return new Response(
      JSON.stringify({
        success: true,
        processedVideos,
        emailsSent: emailsSent.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in check-late-videos function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
