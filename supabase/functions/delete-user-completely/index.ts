import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteUserRequest {
  user_id: string;
  email: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verify the caller is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !callerUser) {
      throw new Error('Unauthorized');
    }

    // Check if caller is admin
    const { data: callerRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id)
      .single();

    if (callerRole?.role !== 'admin') {
      throw new Error('Only admins can delete users');
    }

    const { user_id, email }: DeleteUserRequest = await req.json();

    console.log(`Admin ${callerUser.email} is deleting user: ${email} (${user_id})`);

    // ============================================================
    // COMPLETE CLEANUP: Delete ALL data referencing this user
    // Order matters: child tables first, then parent tables
    // ============================================================
    if (user_id) {
      // 1. Video feedback referencing video_deliveries by this editor
      const { data: editorDeliveries } = await supabaseAdmin
        .from('video_deliveries')
        .select('id')
        .eq('editor_id', user_id);
      
      const deliveryIds = (editorDeliveries || []).map(d => d.id);
      
      if (deliveryIds.length > 0) {
        // Delete video_feedback referencing these deliveries
        await supabaseAdmin.from('video_feedback').delete().in('delivery_id', deliveryIds);
        // Delete video_review_links referencing these deliveries
        await supabaseAdmin.from('video_review_links').delete().in('delivery_id', deliveryIds);
      }
      
      // 2. Delete video_deliveries by this editor (FK: editor_id -> auth.users)
      await supabaseAdmin.from('video_deliveries').delete().eq('editor_id', user_id);
      
      // 3. Task deliveries feedback chain
      const { data: taskDeliveries } = await supabaseAdmin
        .from('task_deliveries')
        .select('id')
        .eq('editor_id', user_id);
      
      const taskDeliveryIds = (taskDeliveries || []).map(d => d.id);
      
      if (taskDeliveryIds.length > 0) {
        await supabaseAdmin.from('client_feedback').delete().in('delivery_id', taskDeliveryIds);
        await supabaseAdmin.from('review_links').delete().in('delivery_id', taskDeliveryIds);
      }
      
      // 4. Delete task_deliveries (FK: editor_id -> auth.users)
      await supabaseAdmin.from('task_deliveries').delete().eq('editor_id', user_id);
      
      // 5. Design deliveries chain
      const { data: designDeliveries } = await supabaseAdmin
        .from('design_deliveries')
        .select('id')
        .eq('designer_id', user_id);
      
      const designDeliveryIds = (designDeliveries || []).map(d => d.id);
      
      if (designDeliveryIds.length > 0) {
        await supabaseAdmin.from('design_feedback').delete().in('delivery_id', designDeliveryIds);
        await supabaseAdmin.from('design_review_links').delete().in('delivery_id', designDeliveryIds);
      }
      
      // 6. Delete design_deliveries (FK: designer_id -> auth.users)
      await supabaseAdmin.from('design_deliveries').delete().eq('designer_id', user_id);
      
      // 7. Nullify references in videos (FK: assigned_to, validated_by -> auth.users)
      await supabaseAdmin.from('videos').update({ assigned_to: null }).eq('assigned_to', user_id);
      await supabaseAdmin.from('videos').update({ validated_by: null }).eq('validated_by', user_id);
      
      // 8. Nullify references in tasks (FK: created_by -> auth.users)
      await supabaseAdmin.from('tasks').update({ created_by: null }).eq('created_by', user_id);
      
      // 9. XP transactions (FK: editor_id, validated_by -> auth.users)
      await supabaseAdmin.from('xp_transactions').delete().eq('editor_id', user_id);
      // Nullify validated_by references from other editors' XP transactions
      await supabaseAdmin.from('xp_transactions').update({ validated_by: null }).eq('validated_by', user_id);
      
      // 10. Editor achievements (FK: editor_id -> auth.users)
      await supabaseAdmin.from('editor_achievements').delete().eq('editor_id', user_id);
      
      // 11. Video conversations
      await supabaseAdmin.from('video_conversations').delete().eq('sender_id', user_id);
      
      // 12. Notifications
      await supabaseAdmin.from('notifications').delete().eq('user_id', user_id);
      
      // 13. Community messages
      await supabaseAdmin.from('community_messages').delete().eq('user_id', user_id);
      
      // 14. Client-related data
      await supabaseAdmin.from('client_analytics').delete().eq('client_user_id', user_id);
      await supabaseAdmin.from('client_content_items').delete().eq('client_user_id', user_id);
      await supabaseAdmin.from('client_profiles').delete().eq('user_id', user_id);
      
      // 15. Core user tables (FK: user_id -> auth.users)
      await supabaseAdmin.from('user_permissions').delete().eq('user_id', user_id);
      await supabaseAdmin.from('user_roles').delete().eq('user_id', user_id);
      await supabaseAdmin.from('editor_stats').delete().eq('user_id', user_id);
      await supabaseAdmin.from('designer_stats').delete().eq('user_id', user_id);
      await supabaseAdmin.from('profiles').delete().eq('user_id', user_id);
      await supabaseAdmin.from('team_members').delete().eq('user_id', user_id);
      
      // 16. Finally delete from auth.users
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      
      if (deleteAuthError) {
        console.error('Error deleting from auth:', deleteAuthError);
        throw new Error('Failed to delete user from auth: ' + deleteAuthError.message);
      }
    }

    // Also clean up team_members by email (for invited but never signed up)
    if (email) {
      const { error: teamError } = await supabaseAdmin
        .from('team_members')
        .delete()
        .eq('email', email)
        .is('user_id', null); // Only delete if no user_id (invitation only)

      if (teamError) {
        console.log('Note: team_member by email cleanup:', teamError.message);
      }
    }

    console.log(`User ${email} deleted completely`);

    return new Response(
      JSON.stringify({ success: true, message: 'User deleted completely' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
