import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateAccountRequest {
  email: string;
  full_name: string;
  role: string;
  department: string;
  invited_by: string;
  permissions: string[];
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

// Generate a secure random password
function generatePassword(length = 12): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%&*';
  
  const allChars = lowercase + uppercase + numbers + special;
  
  // Ensure at least one of each type
  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, full_name, role, department, invited_by, permissions }: CreateAccountRequest = await req.json();
    
    // Create Supabase admin client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Generate temporary password
    const temporaryPassword = generatePassword(12);
    
    // Create the user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: full_name || '',
      }
    });

    if (authError) {
      console.error("Auth error:", authError);
      // Return specific error for already registered users
      if (authError.message?.includes('already') || authError.code === 'email_exists') {
        return new Response(
          JSON.stringify({ 
            error: "A user with this email address has already been registered",
            code: "email_exists"
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
      throw new Error(authError.message);
    }

    const userId = authData.user?.id;
    if (!userId) {
      throw new Error("Failed to create user");
    }

    // Get role label for display
    const roleLabel = roleLabels[role] || role || 'Membre';

    // Create or update team member record (upsert to handle existing email)
    const { error: memberError } = await supabaseAdmin
      .from('team_members')
      .upsert({
        email,
        full_name: full_name || null,
        role,
        position: roleLabel,
        department,
        status: 'active',
        user_id: userId,
        invited_by,
        invited_at: new Date().toISOString(),
        activated_at: new Date().toISOString(),
        notes: permissions.length > 0 ? `Permissions: ${permissions.join(', ')}` : null,
      }, { onConflict: 'email' });

    if (memberError) {
      console.error("Member error:", memberError);
      // Try to clean up the auth user if team member creation fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(memberError.message);
    }

    // Create user role
    const appRole = ['admin', 'ceo'].includes(role) ? 'admin' : 
                    role === 'project_manager' ? 'project_manager' : 'editor';
    
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role: appRole
      });

    if (roleError) {
      console.error("Role error:", roleError);
    }

    // Send invitation email with password
    const displayName = full_name || 'Cher collaborateur';
    
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "4Media <noreply@4media.ma>",
        reply_to: "contact@4media.ma",
        to: [email],
        subject: "🎉 Votre compte 4Media est prêt !",
        html: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
              <span style="font-size: 28px; font-weight: 700; color: #6366f1; letter-spacing: -0.5px;">4Media</span>
            </td>
          </tr>
          
          <!-- Contenu principal -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 24px 0; font-size: 22px; font-weight: 600; color: #0f172a; line-height: 1.3;">
                Bienvenue ${displayName} ! 🎉
              </h1>
              
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.7; color: #475569;">
                Votre compte <strong style="color: #6366f1;">4Media</strong> a été créé avec succès ! Vous pouvez maintenant vous connecter.
              </p>
              
              <!-- Credentials Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
                <tr>
                  <td style="background-color: #fef3c7; border: 2px solid #f59e0b; padding: 20px; border-radius: 12px;">
                    <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">
                      🔐 Vos identifiants de connexion
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="font-size: 13px; color: #78350f;">Email :</span><br>
                          <span style="font-size: 16px; font-weight: 600; color: #451a03;">${email}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="font-size: 13px; color: #78350f;">Mot de passe temporaire :</span><br>
                          <code style="display: inline-block; padding: 8px 16px; background-color: #ffffff; border-radius: 6px; font-size: 18px; font-weight: 700; color: #dc2626; letter-spacing: 1px; border: 1px solid #fcd34d;">${temporaryPassword}</code>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 16px 0 0 0; font-size: 13px; color: #92400e; font-style: italic;">
                      ⚠️ Nous vous recommandons de changer ce mot de passe dès votre première connexion.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Role Badge -->
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
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="https://4media.international/auth" 
                       style="display: inline-block; padding: 14px 32px; background-color: #22c55e; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 8px; box-shadow: 0 2px 4px rgba(34, 197, 94, 0.3);">
                      Se connecter maintenant
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
              <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.6;">
                Cet email contient des informations confidentielles.<br>
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
        `,
      }),
    });

    const emailResponse = await emailRes.json();
    console.log("Account creation email sent:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true,
      user_id: userId,
      temporary_password: temporaryPassword,
      email: email,
      message: "Compte créé avec succès"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in create-team-member-account function:", error);
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
