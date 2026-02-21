import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Calculate earnings from an item label like "Post 1", "Miniature 2", "Carrousel 4p"
function calcItemEarnings(itemLabel: string): number {
  if (!itemLabel) return 0;
  const carouselMatch = itemLabel.match(/Carrousel\s*(\d+)p?/i);
  if (carouselMatch) {
    const pages = parseInt(carouselMatch[1]);
    return (pages / 2) * 40;
  }
  if (/Post|Miniature/i.test(itemLabel)) {
    return 40;
  }
  return 0;
}

// Extract item label from delivery notes like "[Miniature 2]" or "[Carrousel 4p]"
function extractItemLabel(notes: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/^\[(.+?)\]/);
  return match ? match[1] : null;
}

// Get the carousel page count from the task description for a given carousel index
function getCarouselPages(description: string | null, carouselLabel: string): number {
  if (!description) return 4; // default
  // Parse carousel entries from description like "[1x Carrousel 5p + 2x Post]"
  const descMatch = description.match(/^\[(.+?)\]/);
  if (!descMatch) return 4;

  const entries = descMatch[1].split('+').map(s => s.trim());
  for (const entry of entries) {
    const cm = entry.match(/(\d+)x\s*Carrousel\s+(\d+)p/i);
    if (cm) {
      return parseInt(cm[2]);
    }
  }
  return 4;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get today's date range (UTC)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    // Get all approved feedbacks from today
    const { data: feedbacks, error: fbError } = await supabase
      .from("design_feedback")
      .select(`
        id,
        design_task_id,
        delivery_id,
        decision,
        reviewed_at
      `)
      .eq("decision", "approved")
      .gte("reviewed_at", todayStart)
      .lt("reviewed_at", todayEnd);

    if (fbError) throw fbError;
    if (!feedbacks || feedbacks.length === 0) {
      console.log("No approved items today, skipping notifications");
      return new Response(JSON.stringify({ message: "No approved items today" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get delivery details for each feedback
    const deliveryIds = [...new Set(feedbacks.map(f => f.delivery_id))];
    const { data: deliveries, error: delError } = await supabase
      .from("design_deliveries")
      .select("id, design_task_id, designer_id, notes")
      .in("id", deliveryIds);

    if (delError) throw delError;

    // Get task details for descriptions (needed for carousel page counts)
    const taskIds = [...new Set(feedbacks.map(f => f.design_task_id))];
    const { data: tasks, error: taskError } = await supabase
      .from("design_tasks")
      .select("id, title, client_name, description, assigned_to")
      .in("id", taskIds);

    if (taskError) throw taskError;

    const taskMap = new Map(tasks?.map(t => [t.id, t]) || []);
    const deliveryMap = new Map(deliveries?.map(d => [d.id, d]) || []);

    // Group earnings by designer
    const designerEarnings: Record<string, { total: number; items: string[] }> = {};

    for (const fb of feedbacks) {
      const delivery = deliveryMap.get(fb.delivery_id);
      if (!delivery) continue;

      const task = taskMap.get(fb.design_task_id);
      const designerId = delivery.designer_id || task?.assigned_to;
      if (!designerId) continue;

      const itemLabel = extractItemLabel(delivery.notes);
      let earnings = 0;

      if (itemLabel) {
        // Check if it's a carousel and get page count from description
        const carouselMatch = itemLabel.match(/Carrousel/i);
        if (carouselMatch && task?.description) {
          const pages = getCarouselPages(task.description, itemLabel);
          earnings = (pages / 2) * 40;
        } else {
          earnings = calcItemEarnings(itemLabel);
        }
      } else {
        earnings = 40; // default per item
      }

      if (!designerEarnings[designerId]) {
        designerEarnings[designerId] = { total: 0, items: [] };
      }
      designerEarnings[designerId].total += earnings;
      designerEarnings[designerId].items.push(
        `${itemLabel || 'Design'} — ${task?.title || ''} (${task?.client_name || ''})`
      );
    }

    // Send notification to each designer
    const results = [];
    for (const [designerId, data] of Object.entries(designerEarnings)) {
      const itemsList = data.items.join('\n• ');
      const message = `💰 Résultat total de la journée : ${data.total.toLocaleString('fr-FR')} DH\n\n• ${itemsList}`;

      const { data: notifResult, error: notifError } = await supabase.rpc(
        "create_notification",
        {
          p_user_id: designerId,
          p_title: `📊 Bilan du jour : ${data.total.toLocaleString('fr-FR')} DH`,
          p_message: message,
          p_type: "daily_earnings",
          p_link: "/designer",
        }
      );

      if (notifError) {
        console.error(`Failed to notify designer ${designerId}:`, notifError);
      } else {
        results.push({ designerId, total: data.total, itemCount: data.items.length });
      }
    }

    console.log(`Daily earnings notifications sent to ${results.length} designer(s)`);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in daily-designer-earnings:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
