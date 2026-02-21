import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  notification_id?: string;
  send_to_editor?: string;
  video_title?: string;
  admin_message?: string;
}

interface NotificationMetadata {
  project_name?: string;
  client_name?: string;
  video_title?: string;
  requires_email?: boolean;
  revision_notes?: string;
  feedback_text?: string;
  rating?: number;
  [key: string]: unknown;
}

// TOUS les types de notifications envoient un email
// Chaque notification in-app déclenche aussi un email
const ALL_EMAIL_TYPES = [
  'video_assigned',        // Nouvelle vidéo assignée
  'revision_requested',    // Demande de révision
  'video_completed',       // Vidéo terminée
  'admin_reply',           // Réponse admin
  'profile_validated',     // Profil validé
  'editor_profile_validated',
  'video_late',            // Retard
  'video_submitted',       // Vidéo soumise
  'video_sent_to_client',  // Envoyée au client
  'new_delivery',          // Nouvelle livraison
  'editor_question',       // Question éditeur
  'editor_profile_submitted', // Profil soumis
];

// Email templates avec design anti-spam
const getEmailTemplate = (
  type: string, 
  title: string, 
  message: string, 
  link: string | null,
  metadata?: NotificationMetadata
) => {
  const baseUrl = "https://4media.international";
  
  const typeIcons: Record<string, string> = {
    'video_submitted': '📤',
    'video_sent_to_client': '✅',
    'revision_requested': '🔄',
    'video_completed': '🎉',
    'video_late': '⚠️',
    'new_delivery': '📦',
    'video_assigned': '🎬',
    'editor_question': '❓',
    'admin_reply': '💬',
    'editor_profile_submitted': '👤',
    'editor_profile_validated': '✨',
    'profile_validated': '🎊',
  };
  
  const icon = typeIcons[type] || '🔔';
  
  const projectName = metadata?.project_name;
  const clientName = metadata?.client_name;
  const videoTitle = metadata?.video_title;
  const revisionNotes = metadata?.revision_notes;
  const feedbackText = metadata?.feedback_text;
  const rating = metadata?.rating;
  
  let contextLine = '';
  if (projectName || clientName) {
    const parts = [];
    if (projectName) parts.push(projectName);
    if (clientName) parts.push(clientName);
    contextLine = parts.join(' - ');
    if (videoTitle) contextLine += ` | ${videoTitle}`;
  }
  
  // Build details section for revision requests
  let detailsSection = '';
  if (type === 'revision_requested' && (revisionNotes || feedbackText)) {
    const detailText = revisionNotes || feedbackText;
    detailsSection = `
      <div style="margin-top: 16px; padding: 16px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #92400e;">Détails de la révision :</p>
        <p style="margin: 0; font-size: 14px; color: #78350f; line-height: 1.5;">${detailText}</p>
      </div>
    `;
  }
  
  // Add rating if present
  let ratingSection = '';
  if (rating && rating > 0) {
    const stars = '⭐'.repeat(rating);
    ratingSection = `
      <div style="margin-top: 12px; text-align: center;">
        <span style="font-size: 20px;">${stars}</span>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Note du client</p>
      </div>
    `;
  }
  // - Pas de mots spam (gratuit, urgent, etc.)
  // - Ratio texte/image équilibré
  // - Lien de désinscription clair
  // - Header List-Unsubscribe sera ajouté
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);">
          
          <tr>
            <td style="background-color: #ffffff; padding: 24px 32px; text-align: center; border-bottom: 1px solid #e2e8f0;">
              <img src="https://slnafhvkluqmgwrxwndy.supabase.co/storage/v1/object/public/email-assets/4media-logo.png?v=1" alt="4Media" width="120" height="auto" style="display: inline-block; max-width: 120px; height: auto;" />
            </td>
          </tr>
          
          <tr>
            <td style="padding: 32px;">
              <div style="font-size: 36px; text-align: center; margin-bottom: 16px;">${icon}</div>
              
              <h1 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #0f172a; line-height: 1.4; text-align: center;">
                ${title}
              </h1>
              
              ${contextLine ? `
              <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 500; color: #22c55e; text-align: center;">
                ${contextLine}
              </p>
              ` : ''}
              
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #475569; text-align: center;">
                ${message}
              </p>
              
              ${detailsSection}
              ${ratingSection}
            </td>
          </tr>
          
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5; text-align: center;">
                Vous recevez cet email car vous êtes membre de 4Media.<br>
                Pour gérer vos préférences : <a href="mailto:contact@4media.ma?subject=Préférences notifications" style="color: #64748b; text-decoration: underline;">contact@4media.ma</a>
              </p>
            </td>
          </tr>
          
        </table>
        
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 480px;">
          <tr>
            <td align="center" style="padding: 16px;">
              <p style="margin: 0; font-size: 10px; color: #94a3b8;">
                © ${new Date().getFullYear()} 4Media - Tous droits réservés
              </p>
            </td>
          </tr>
        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { notification_id, send_to_editor, video_title, admin_message }: NotificationEmailRequest = await req.json();

    // Mode direct: réponse admin à éditeur
    if (send_to_editor && admin_message) {
      console.log("Sending direct admin reply email to editor:", send_to_editor);
      
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('email, full_name')
        .eq('user_id', send_to_editor)
        .single();

      if (!teamMember?.email) {
        console.log("Editor email not found, skipping direct email");
        return new Response(
          JSON.stringify({ message: "Editor email not found" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const emailHtml = getEmailTemplate(
        'admin_reply',
        'Nouvelle réponse',
        `Message concernant "${video_title || 'votre projet'}": ${admin_message.substring(0, 150)}${admin_message.length > 150 ? '...' : ''}`,
        '/editor',
        { video_title: video_title || undefined }
      );

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "4Media <contact@4media.ma>",
          to: [teamMember.email],
          subject: `Réponse - ${video_title || '4Media'}`,
          html: emailHtml,
          headers: {
            "List-Unsubscribe": "<mailto:contact@4media.ma?subject=unsubscribe>",
            "X-Priority": "3",
          },
        }),
      });

      const emailResponse = await res.json();
      console.log("Direct admin reply email sent:", emailResponse);

      return new Response(JSON.stringify({ success: true, email: teamMember.email }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Mode standard: notification
    if (!notification_id) {
      return new Response(
        JSON.stringify({ error: "notification_id required for standard mode" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Processing notification email for:", notification_id);

    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notification_id)
      .single();

    if (notifError || !notification) {
      console.error("Notification not found:", notifError);
      return new Response(
        JSON.stringify({ error: "Notification not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Vérifier si email déjà envoyé
    if (notification.email_sent) {
      console.log("Email already sent for notification:", notification_id);
      return new Response(
        JSON.stringify({ message: "Email already sent" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Tous les types de notification envoient un email
    console.log(`Processing email for type: ${notification.type}`);

    // Récupérer email utilisateur
    let userEmail: string | null = null;
    let userName: string | null = null;

    const { data: teamMember } = await supabase
      .from('team_members')
      .select('email, full_name')
      .eq('user_id', notification.user_id)
      .single();

    if (teamMember) {
      userEmail = teamMember.email;
      userName = teamMember.full_name;
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('user_id', notification.user_id)
        .single();
      
      if (profile) {
        userEmail = profile.email;
        userName = profile.full_name;
      }
    }

    if (!userEmail) {
      console.error("User email not found for user:", notification.user_id);
      return new Response(
        JSON.stringify({ error: "User email not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Template email
    const emailHtml = getEmailTemplate(
      notification.type,
      notification.title,
      notification.message,
      notification.link,
      notification.metadata as NotificationMetadata
    );

    // Destinataires - admin multi-recipient pour certains types
    const adminEmails = ['hamzarahih76@gmail.com', 'rihabbouizer@gmail.com', 'im.nacib@gmail.com'];
    const recipients = [userEmail];
    
    if (adminEmails.includes(userEmail)) {
      adminEmails.forEach(email => {
        if (email !== userEmail && !recipients.includes(email)) {
          recipients.push(email);
        }
      });
    }

    // Envoi via Resend avec headers anti-spam
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "4Media <contact@4media.ma>",
        to: recipients,
        subject: `${notification.title} - 4Media`,
        html: emailHtml,
        headers: {
          "List-Unsubscribe": "<mailto:contact@4media.ma?subject=unsubscribe>",
          "X-Priority": "3",
        },
      }),
    });

    const emailResponse = await res.json();
    console.log("Email sent:", emailResponse);

    await supabase
      .from('notifications')
      .update({ email_sent: true })
      .eq('id', notification_id);

    return new Response(JSON.stringify({ success: true, email: userEmail }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-notification-email function:", error);
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
