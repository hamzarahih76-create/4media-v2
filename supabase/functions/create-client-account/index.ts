import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateClientRequest {
  email: string;
  company_name: string;
  contact_name: string;
  phone?: string;
  industry?: string;
  subscription_type?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  notes?: string;
  copywriter_id?: string;
  invited_by: string;
}

function generatePassword(length = 12): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%&*';
  const allChars = lowercase + uppercase + numbers + special;
  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: CreateClientRequest = await req.json();
    const { email, company_name, contact_name, phone, industry, subscription_type, primary_color, secondary_color, accent_color, notes, copywriter_id, invited_by } = body;

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const temporaryPassword = generatePassword(12);

    // 1. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name: contact_name || company_name },
    });

    if (authError) {
      if (authError.message?.includes('already') || authError.code === 'email_exists') {
        return new Response(JSON.stringify({ error: "Un utilisateur avec cet email existe déjà", code: "email_exists" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      throw new Error(authError.message);
    }

    const userId = authData.user?.id;
    if (!userId) throw new Error("Failed to create user");

    // 2. Assign client role
    const { error: roleError } = await supabaseAdmin.from('user_roles').insert({ user_id: userId, role: 'client' });
    if (roleError) {
      console.error("Role error:", roleError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(roleError.message);
    }

    // 3. Create client profile
    const { error: profileError } = await supabaseAdmin.from('client_profiles').insert({
      user_id: userId,
      company_name,
      contact_name: contact_name || null,
      email,
      phone: phone || null,
      industry: industry || null,
      subscription_type: subscription_type || 'starter',
      primary_color: primary_color || '#22c55e',
      secondary_color: secondary_color || '#0f172a',
      accent_color: accent_color || '#f59e0b',
      notes: notes || null,
      copywriter_id: copywriter_id || null,
    });

    if (profileError) {
      console.error("Profile error:", profileError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(profileError.message);
    }

    // 4. Send welcome email
    const displayName = contact_name || company_name;
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "4Media <noreply@4media.ma>",
        reply_to: "contact@4media.ma",
        to: [email],
        subject: `🎉 Bienvenue sur 4Media, ${displayName} !`,
        html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8fafc;">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
        <tr><td style="background:${primary_color || '#22c55e'};padding:32px 40px;text-align:center;">
          <span style="font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">${company_name}</span>
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 24px;font-size:22px;font-weight:600;color:#0f172a;">Bienvenue ${displayName} ! 🎉</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#475569;">Votre espace client <strong>4Media</strong> est prêt. Vous y trouverez tous vos projets, livrables et le suivi de vos contenus.</p>
          <table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
            <tr><td style="background-color:#fef3c7;border:2px solid #f59e0b;padding:20px;border-radius:12px;">
              <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#92400e;text-transform:uppercase;">🔐 Vos identifiants</p>
              <p style="margin:0;font-size:13px;color:#78350f;">Email :</p>
              <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#451a03;">${email}</p>
              <p style="margin:0;font-size:13px;color:#78350f;">Mot de passe :</p>
              <code style="display:inline-block;padding:8px 16px;background:#fff;border-radius:6px;font-size:18px;font-weight:700;color:#dc2626;border:1px solid #fcd34d;">${temporaryPassword}</code>
              <p style="margin:16px 0 0;font-size:13px;color:#92400e;font-style:italic;">⚠️ Changez ce mot de passe après votre première connexion.</p>
            </td></tr>
          </table>
          <table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0;">
            <tr><td align="center">
              <a href="https://4media.international/auth" style="display:inline-block;padding:14px 32px;background-color:${primary_color || '#22c55e'};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:8px;">Se connecter</a>
            </td></tr>
          </table>
          <p style="margin:32px 0 0;font-size:15px;color:#475569;">À très bientôt !<br><strong>L'équipe 4Media</strong></p>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">© ${new Date().getFullYear()} 4Media. Tous droits réservés.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      }),
    });

    return new Response(JSON.stringify({
      success: true,
      user_id: userId,
      email,
      message: "Compte client créé avec succès",
    }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error creating client account:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
