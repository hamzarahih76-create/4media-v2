import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  email: string;
  full_name: string;
  role: string;
  inviter_name?: string;
}

const roleLabels: Record<string, string> = {
  admin: 'Administrateur',
  ceo: 'CEO / Fondateur',
  project_manager: 'Project Manager',
  copywriter: 'Copywriter',
  accountant: 'Comptable',
  editor: 'Video Editor',
  motion_designer: 'Motion Designer',
  colorist: 'Colorist',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, full_name, role, inviter_name }: InvitationEmailRequest = await req.json();
    
    const roleLabel = roleLabels[role] || role || 'Membre';
    const displayName = full_name || 'Cher collaborateur';

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "4Media <contact@4media.ma>",
        to: [email],
        subject: "🎉 Vous êtes invité(e) à rejoindre 4Media !",
        html: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Invitation 4Media</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #ffffff; padding: 32px 40px; text-align: center; border-bottom: 1px solid #e2e8f0;">
              <img src="https://4media.international/images/4media-logo.png" alt="4Media" width="120" height="auto" style="display: inline-block; max-width: 120px; height: auto;" />
            </td>
          </tr>
          
          <!-- Contenu principal -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 24px 0; font-size: 22px; font-weight: 600; color: #0f172a; line-height: 1.3;">
                Bonjour ${displayName} ! 🎉
              </h1>
              
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.7; color: #475569;">
                Vous avez été invité(e) à rejoindre la plateforme <strong style="color: #6366f1;">4Media</strong> en tant que <strong>${roleLabel}</strong>.
              </p>
              
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
                <tr>
                  <td style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px 20px; border-radius: 0 8px 8px 0;">
                    <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">
                      Votre rôle
                    </p>
                    <p style="margin: 0; font-size: 16px; font-weight: 600; line-height: 1.6; color: #15803d;">
                      ${roleLabel}
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.7; color: #475569;">
                <strong>Pour accéder à votre espace :</strong>
              </p>
              
              <ol style="margin: 0 0 24px 0; padding-left: 20px; font-size: 15px; line-height: 1.8; color: #475569;">
                <li>Cliquez sur le bouton ci-dessous</li>
                <li>Créez votre compte avec cet email : <strong>${email}</strong></li>
                <li>Complétez votre profil</li>
                <li>Attendez la validation par l'administrateur</li>
              </ol>
              
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="https://4media.international/auth" 
                       style="display: inline-block; padding: 14px 32px; background-color: #22c55e; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 8px; box-shadow: 0 2px 4px rgba(34, 197, 94, 0.3);">
                      Rejoindre 4Media
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 32px 0 0 0; font-size: 15px; line-height: 1.7; color: #475569;">
                À très bientôt !<br>
                <strong style="color: #0f172a;">L'équipe 4Media</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.6;">
                      Cet email a été envoyé automatiquement par 4Media.<br>
                      Si vous ne souhaitez plus recevoir ces notifications, contactez-nous à contact@4media.ma
                    </p>
                  </td>
                </tr>
              </table>
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
        `,
      }),
    });

    const emailResponse = await res.json();
    console.log("Invitation email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-team-invitation-email function:", error);
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
