import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  full_name: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { email, full_name }: WelcomeEmailRequest = await req.json();

    // Validate inputs
    if (!email || typeof email !== 'string' || email.length > 255) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "4Media <contact@4media.ma>",
        to: [email],
        subject: "🎬 Bienvenue sur 4Media !",
        html: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Bienvenue sur 4Media</title>
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
                Bienvenue ${(full_name || 'Cher collaborateur').substring(0, 100)} ! 🎬
              </h1>
              
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.7; color: #475569;">
                Merci de vous être inscrit sur la plateforme 4Media. Nous sommes ravis de vous accueillir dans notre équipe !
              </p>
              
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
                <tr>
                  <td style="background-color: #f0f9ff; border-left: 4px solid #6366f1; padding: 16px 20px; border-radius: 0 8px 8px 0;">
                    <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #4338ca; text-transform: uppercase; letter-spacing: 0.5px;">
                      Prochaine étape
                    </p>
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #1e40af;">
                      Connectez-vous et complétez votre profil pour accéder à votre tableau de bord.
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.7; color: #475569;">
                <strong>Voici les étapes à suivre :</strong>
              </p>
              
              <ol style="margin: 0 0 24px 0; padding-left: 20px; font-size: 15px; line-height: 1.8; color: #475569;">
                <li>Connectez-vous à votre compte</li>
                <li>Complétez vos informations personnelles</li>
                <li>Ajoutez vos coordonnées bancaires (RIB/IBAN)</li>
                <li>Téléchargez votre photo de profil et CNI</li>
                <li>Attendez la validation de notre équipe</li>
              </ol>
              
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="https://4media.international/auth" 
                       style="display: inline-block; padding: 14px 32px; background-color: #6366f1; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 8px; box-shadow: 0 2px 4px rgba(99, 102, 241, 0.3);">
                      Se connecter
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
    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
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
